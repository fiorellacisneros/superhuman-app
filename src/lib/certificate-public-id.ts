import { randomBytes } from 'node:crypto';

/** Código corto legible para LinkedIn “Credential ID”, ej. SHS-A1B2C3-D4E5F6 */
export function generatePublicCertificateId(): string {
  const a = randomBytes(3).toString('hex').toUpperCase();
  const b = randomBytes(3).toString('hex').toUpperCase();
  return `SHS-${a}-${b}`;
}
