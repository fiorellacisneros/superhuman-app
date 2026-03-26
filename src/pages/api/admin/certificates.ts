import type { APIRoute } from 'astro';
import { generatePublicCertificateId } from '../../../lib/certificate-public-id';
import { requireAdmin } from '../../../lib/api-admin';
import { safeRedirectPath, sanitizeHttpUrl, withToastParams } from '../../../lib/request-security';
import { getSupabaseServiceRoleClient } from '../../../lib/supabase';

const BUCKET = 'course-certificates';
const MAX_PDF_BYTES = 8 * 1024 * 1024; // 8 MB

export const POST: APIRoute = async ({ request, locals }) => {
  const admin = await requireAdmin(locals as any);
  if (admin instanceof Response) return admin;
  const { db, userId: adminUserId } = admin;

  const formData = await request.formData();
  const redirectTo = safeRedirectPath(formData.get('redirect_to'), '/certificados');
  const studentUserId = typeof formData.get('user_id') === 'string' ? (formData.get('user_id') as string).trim() : '';
  const courseId = typeof formData.get('course_id') === 'string' ? (formData.get('course_id') as string).trim() : '';
  const titleRaw = typeof formData.get('title') === 'string' ? (formData.get('title') as string).trim() : '';
  const urlFromForm = sanitizeHttpUrl(formData.get('document_url'));
  const file = formData.get('certificate_file');

  if (!studentUserId || !courseId) {
    return new Response(null, {
      status: 303,
      headers: { Location: withToastParams(redirectTo, 'Elige alumno y curso', 'error') },
    });
  }

  let documentUrl: string | null = urlFromForm;

  if (file instanceof File && file.size > 0) {
    if (file.type !== 'application/pdf') {
      return new Response(null, {
        status: 303,
        headers: { Location: withToastParams(redirectTo, 'Solo se admite PDF', 'error') },
      });
    }
    if (file.size > MAX_PDF_BYTES) {
      return new Response(null, {
        status: 303,
        headers: { Location: withToastParams(redirectTo, 'El PDF no puede superar 8 MB', 'error') },
      });
    }
    const supabase = getSupabaseServiceRoleClient();
    const safeName = `${Date.now()}-${(file.name || 'cert.pdf').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)}`;
    const path = `${studentUserId}/${courseId}/${safeName}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
      upsert: true,
      contentType: 'application/pdf',
    });
    if (upErr) {
      console.error('certificate upload', upErr);
      return new Response(null, {
        status: 303,
        headers: {
          Location: withToastParams(
            redirectTo,
            'Error al subir el PDF. Crea el bucket course-certificates en Supabase Storage o usa un enlace HTTPS.',
            'error',
          ),
        },
      });
    }
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
    documentUrl = pub?.publicUrl ?? null;
  }

  if (!documentUrl) {
    return new Response(null, {
      status: 303,
      headers: {
        Location: withToastParams(redirectTo, 'Indica un enlace HTTPS al PDF o sube un archivo', 'error'),
      },
    });
  }

  const { data: existingRow } = await db
    .from('student_course_certificates')
    .select('credential_public_id')
    .eq('user_id', studentUserId)
    .eq('course_id', courseId)
    .maybeSingle();

  const existingId =
    typeof existingRow?.credential_public_id === 'string' ? existingRow.credential_public_id.trim() : '';
  let credentialPublicId = existingId.length > 0 ? existingId : generatePublicCertificateId();

  let upsertError: { message?: string } | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const { error } = await db.from('student_course_certificates').upsert(
      {
        user_id: studentUserId,
        course_id: courseId,
        document_url: documentUrl,
        title: titleRaw || null,
        credential_public_id: credentialPublicId,
        created_by: adminUserId,
      },
      { onConflict: 'user_id,course_id' },
    );
    if (!error) {
      upsertError = null;
      break;
    }
    upsertError = error;
    const msg = String(error.message ?? '');
    const dup = /credential_public_id|23505|unique/i.test(msg);
    if (dup && !existingId) {
      credentialPublicId = generatePublicCertificateId();
      continue;
    }
    break;
  }

  if (upsertError) {
    console.error('student_course_certificates upsert', upsertError);
    return new Response(null, {
      status: 303,
      headers: {
        Location: withToastParams(
          redirectTo,
          'No se pudo guardar. ¿Ya ejecutaste docs/student-course-certificates-migration.sql y student-course-certificates-linkedin-migration.sql?',
          'error',
        ),
      },
    });
  }

  return new Response(null, {
    status: 303,
    headers: { Location: withToastParams(redirectTo, 'Certificado guardado', 'success') },
  });
};
