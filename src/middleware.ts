import { clerkMiddleware, createRouteMatcher } from '@clerk/astro/server';
import { getSupabaseServiceRoleClient } from './lib/supabase';

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding',
  '/profile',
  '/courses(.*)',
  '/challenges(.*)',
  '/leaderboard(.*)',
  '/badges(.*)',
  '/admin(.*)',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  const url = new URL(context.request.url);
  // Let POST form submits reach their handlers (page or API)
  if (
    context.request.method === 'POST' &&
    (url.pathname === '/onboarding' ||
      url.pathname === '/api/onboarding' ||
      url.pathname === '/api/admin/courses')
  ) {
    return next();
  }

  const { isAuthenticated, sessionClaims, redirectToSignIn, userId } = auth();

  if (isProtectedRoute(context.request) && !isAuthenticated) {
    return redirectToSignIn();
  }

  if (isAdminRoute(context.request)) {
    const roleFromClaims = (sessionClaims as { metadata?: { role?: string } })?.metadata?.role;
    if (roleFromClaims === 'admin') {
      return next();
    }
    // Fallback: si no está en Clerk (session token sin metadata), comprobar Supabase
    if (userId) {
      try {
        const supabase = getSupabaseServiceRoleClient();
        const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
        if ((data?.role as string) === 'admin') {
          return next();
        }
      } catch (_) {
        // env o Supabase no disponible
      }
    }
    return new Response('Forbidden', { status: 403 });
  }

  return next();
});

