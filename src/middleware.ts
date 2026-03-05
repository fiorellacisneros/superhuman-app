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

function withSecurityHeaders(response: Response, url: URL): Response {
  const headers = new Headers(response.headers);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (url.protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const onRequest = clerkMiddleware(async (auth, context, next) => {
  const url = new URL(context.request.url);

  // Basic CSRF mitigation for API mutations: block cross-origin requests.
  const method = context.request.method.toUpperCase();
  const isMutation = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (isMutation && url.pathname.startsWith('/api/')) {
    const origin = context.request.headers.get('origin');
    if (origin && origin !== url.origin) {
      return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
    }
  }

  const { isAuthenticated, sessionClaims, redirectToSignIn, userId } = auth();

  if (isProtectedRoute(context.request) && !isAuthenticated) {
    return withSecurityHeaders(redirectToSignIn(), url);
  }

  if (isAdminRoute(context.request)) {
    const roleFromClaims = (sessionClaims as { metadata?: { role?: string } })?.metadata?.role;
    if (roleFromClaims === 'admin') {
      return withSecurityHeaders(await next(), url);
    }
    // Fallback: si no está en Clerk (session token sin metadata), comprobar Supabase
    if (userId) {
      try {
        const supabase = getSupabaseServiceRoleClient();
        const { data } = await supabase.from('users').select('role').eq('id', userId).maybeSingle();
        if ((data?.role as string) === 'admin') {
          return withSecurityHeaders(await next(), url);
        }
      } catch (_) {
        // env o Supabase no disponible
      }
    }
    return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
  }

  return withSecurityHeaders(await next(), url);
});

