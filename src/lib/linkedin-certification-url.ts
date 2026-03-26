/**
 * URL oficial “Add to profile” de LinkedIn (programa documentado en addtoprofile.linkedin.com).
 * El miembro debe tener sesión en LinkedIn; si no, tras el login conserva el redirect.
 *
 * Variables opcionales (públicas, para el HTML):
 * - PUBLIC_LINKEDIN_CERT_ORG_NAME — nombre de la organización emisora (default Superhuman School)
 * - PUBLIC_LINKEDIN_CERT_ORG_ID — ID numérico de la página de empresa en LinkedIn (si existe, se usa en lugar del nombre)
 */
export function buildLinkedInAddCertificationUrl(opts: {
  /** Nombre del certificado (ej. título del curso) */
  name: string;
  /** ID público para el campo “Credential ID” en LinkedIn */
  certId?: string | null;
  /** URL de credencial (PDF o página de verificación) */
  certUrl?: string | null;
  /** Fecha de emisión (mes/año en LinkedIn) */
  issuedAt?: string | Date | null;
  organizationName?: string;
  organizationId?: string;
}): string {
  const orgId = (opts.organizationId ?? import.meta.env.PUBLIC_LINKEDIN_CERT_ORG_ID)?.toString().trim();
  const orgName = (opts.organizationName ?? import.meta.env.PUBLIC_LINKEDIN_CERT_ORG_NAME ?? 'Superhuman School').toString().trim();

  const p = new URLSearchParams();
  p.set('startTask', 'CERTIFICATION_NAME');
  p.set('name', opts.name.slice(0, 200));
  if (orgId) {
    p.set('organizationId', orgId);
  } else {
    p.set('organizationName', orgName.slice(0, 200));
  }
  if (opts.certId?.trim()) {
    p.set('certId', opts.certId.trim().slice(0, 100));
  }
  if (opts.certUrl?.trim()) {
    p.set('certUrl', opts.certUrl.trim().slice(0, 2000));
  }
  if (opts.issuedAt) {
    const d = typeof opts.issuedAt === 'string' ? new Date(opts.issuedAt) : opts.issuedAt;
    if (!Number.isNaN(d.getTime())) {
      p.set('issueYear', String(d.getUTCFullYear()));
      p.set('issueMonth', String(d.getUTCMonth() + 1));
    }
  }
  return `https://www.linkedin.com/profile/add?${p.toString()}`;
}
