/**
 * Zonas horarias comunes para el selector de perfil.
 * Formato: [label, IANA timezone]
 * Lima por defecto (curso principal).
 */
export const TIMEZONE_OPTIONS: [string, string][] = [
  ['Perú (Lima)', 'America/Lima'],
  ['México (Ciudad de México)', 'America/Mexico_City'],
  ['Colombia (Bogotá)', 'America/Bogota'],
  ['Argentina (Buenos Aires)', 'America/Argentina/Buenos_Aires'],
  ['Chile (Santiago)', 'America/Santiago'],
  ['Brasil (São Paulo)', 'America/Sao_Paulo'],
  ['Ecuador (Quito)', 'America/Guayaquil'],
  ['Venezuela (Caracas)', 'America/Caracas'],
  ['España (Madrid)', 'Europe/Madrid'],
  ['USA Este (Nueva York)', 'America/New_York'],
  ['USA Central (Chicago)', 'America/Chicago'],
  ['USA Montaña (Denver)', 'America/Denver'],
  ['USA Oeste (Los Ángeles)', 'America/Los_Angeles'],
];

export const DEFAULT_TIMEZONE = 'America/Lima';
