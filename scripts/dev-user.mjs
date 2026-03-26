#!/usr/bin/env node
/**
 * Consola local para tocar tu usuario en Supabase (+ Clerk para el rol).
 * Carga variables desde .env.local (misma que Astro).
 *
 *   npm run dev:user -- show mi@correo.com
 *   npm run dev:user -- role mi@correo.com student
 *   npm run dev:user -- role mi@correo.com admin
 *   npm run dev:user -- enroll mi@correo.com slug-del-curso live
 *   npm run dev:user -- enroll mi@correo.com slug-del-curso on_demand
 *   npm run dev:user -- unenroll mi@correo.com slug-del-curso
 *
 * Requisitos: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLERK_SECRET_KEY en .env.local
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/backend';

function loadEnvLocal() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const clerkSecret = process.env.CLERK_SECRET_KEY;

function usage() {
  console.log(`
Uso (el -- separa argumentos de npm):

  npm run dev:user -- show <email>
  npm run dev:user -- role <email> admin|student
  npm run dev:user -- enroll <email> <slug-o-uuid-curso> live|on_demand
  npm run dev:user -- unenroll <email> <slug-o-uuid-curso>

Ejemplos:

  npm run dev:user -- show hola@gmail.com
  npm run dev:user -- role hola@gmail.com student
  npm run dev:user -- enroll hola@gmail.com webflow-camp live
`);
}

async function resolveUserIdByEmail(supabase, clerk, emailRaw) {
  const email = emailRaw.trim();
  const { data: rows, error } = await supabase.from('users').select('id, email, role').ilike('email', email);
  if (error) throw new Error(error.message);
  const exact =
    (rows ?? []).find((r) => (r.email || '').toLowerCase() === email.toLowerCase()) ?? (rows ?? [])[0];
  if (exact?.id) return exact;

  let clerkPage;
  try {
    const res = await clerk.users.getUserList({ emailAddress: [email], limit: 5 });
    clerkPage = res.data;
  } catch (e) {
    throw new Error(`Clerk: ${e.message || e}`);
  }
  const u = clerkPage?.[0];
  if (!u) {
    throw new Error(
      `No hay usuario con ese correo en Supabase ni en Clerk. Inicia sesión una vez en la app o revisa el email.`,
    );
  }
  const primary = u.emailAddresses?.find((e) => e.id === u.primaryEmailAddressId)?.emailAddress
    ?? u.emailAddresses?.[0]?.emailAddress
    ?? email;
  const { error: upErr } = await supabase.from('users').upsert(
    { id: u.id, email: primary },
    { onConflict: 'id' },
  );
  if (upErr) throw new Error(upErr.message);
  return { id: u.id, email: primary, role: null };
}

async function resolveCourse(supabase, slugOrId) {
  const key = slugOrId.trim();
  let { data: course, error } = await supabase.from('courses').select('id, slug, title').eq('slug', key).maybeSingle();
  if (error) throw new Error(error.message);
  if (course) return course;
  ({ data: course, error } = await supabase.from('courses').select('id, slug, title').eq('id', key).maybeSingle());
  if (error) throw new Error(error.message);
  if (!course) throw new Error(`Curso no encontrado: "${key}" (ni slug ni id)`);
  return course;
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 2 || argv[0] === 'help' || argv[0] === '-h') {
    usage();
    process.exit(argv[0] === 'help' || argv[0] === '-h' ? 0 : 1);
  }

  if (!url || !serviceKey) {
    console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local');
    process.exit(1);
  }
  if (!clerkSecret) {
    console.error('Falta CLERK_SECRET_KEY en .env.local (necesario para sincronizar rol en Clerk)');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const clerk = createClerkClient({ secretKey: clerkSecret });

  const cmd = argv[0];
  const email = argv[1];

  if (cmd === 'show') {
    if (!email) {
      usage();
      process.exit(1);
    }
    const u = await resolveUserIdByEmail(supabase, clerk, email);
    const { data: full } = await supabase.from('users').select('*').eq('id', u.id).maybeSingle();
    const { data: enrolls, error: eErr } = await supabase
      .from('enrollments')
      .select('course_id, access_type, enrolled_at, courses(slug, title)')
      .eq('user_id', u.id);
    if (eErr) throw new Error(eErr.message);
    console.log('Usuario:', JSON.stringify(full ?? u, null, 2));
    console.log('Inscripciones:', JSON.stringify(enrolls ?? [], null, 2));
    return;
  }

  if (cmd === 'role') {
    const role = argv[2];
    if (!email || !role || !['admin', 'student'].includes(role)) {
      usage();
      process.exit(1);
    }
    const u = await resolveUserIdByEmail(supabase, clerk, email);
    await clerk.users.updateUserMetadata(u.id, { publicMetadata: { role } });
    const { data: updated, error: upErr } = await supabase.from('users').update({ role }).eq('id', u.id).select('id');
    if (upErr) throw new Error(upErr.message);
    if (!updated?.length) {
      const { error: ins } = await supabase.from('users').insert({ id: u.id, email: u.email ?? email.trim(), role });
      if (ins) throw new Error(ins.message);
    }
    console.log('OK rol =', role, '| user id =', u.id);
    console.log('Cierra sesión en el navegador o recarga si /admin no refleja el cambio al instante.');
    return;
  }

  if (cmd === 'enroll') {
    const slugOrId = argv[2];
    const access = argv[3];
    if (!email || !slugOrId || !access || !['live', 'on_demand'].includes(access)) {
      usage();
      process.exit(1);
    }
    const u = await resolveUserIdByEmail(supabase, clerk, email);
    const course = await resolveCourse(supabase, slugOrId);
    const { data: existing } = await supabase
      .from('enrollments')
      .select('user_id')
      .eq('user_id', u.id)
      .eq('course_id', course.id)
      .maybeSingle();
    if (existing) {
      const { error } = await supabase
        .from('enrollments')
        .update({ access_type: access })
        .eq('user_id', u.id)
        .eq('course_id', course.id);
      if (error) throw new Error(error.message);
      console.log('OK inscripción actualizada:', course.slug ?? course.id, access);
    } else {
      const { error } = await supabase.from('enrollments').insert({
        user_id: u.id,
        course_id: course.id,
        enrolled_at: new Date().toISOString(),
        access_type: access,
      });
      if (error) throw new Error(error.message);
      console.log('OK inscrito:', course.slug ?? course.id, access);
    }
    return;
  }

  if (cmd === 'unenroll') {
    const slugOrId = argv[2];
    if (!email || !slugOrId) {
      usage();
      process.exit(1);
    }
    const u = await resolveUserIdByEmail(supabase, clerk, email);
    const course = await resolveCourse(supabase, slugOrId);
    const { error } = await supabase.from('enrollments').delete().eq('user_id', u.id).eq('course_id', course.id);
    if (error) throw new Error(error.message);
    console.log('OK desinscrito de', course.slug ?? course.id);
    return;
  }

  console.error('Comando desconocido:', cmd);
  usage();
  process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
