import type { APIContext } from 'astro';

export type Role = 'admin' | 'student';

export const getRoleFromSession = (context: APIContext): Role | null => {
  const claims = context.locals?.auth?.sessionClaims as
    | { metadata?: { role?: Role }; role?: Role }
    | undefined;

  if (!claims) return null;

  return claims.metadata?.role ?? claims.role ?? null;
};

