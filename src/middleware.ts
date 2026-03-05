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

function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function isLocalHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function isSameSiteUrl(a: URL, b: URL): boolean {
  const aHost = normalizeHostname(a.hostname);
  const bHost = normalizeHostname(b.hostname);
  if (aHost !== bHost) return false;
  // In local development, include port to avoid accepting cross-port submissions.
  if (isLocalHost(aHost) || isLocalHost(bHost)) {
    return a.port === b.port;
  }
  return true;
}

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
  const enforceCsrf = import.meta.env.ENABLE_CSRF_PROTECTION === 'true';
  if (enforceCsrf && isMutation && url.pathname.startsWith('/api/')) {
    const origin = context.request.headers.get('origin');
    const referer = context.request.headers.get('referer');
    const secFetchSite = context.request.headers.get('sec-fetch-site');

    // Explicit browser signal for cross-site request.
    if (secFetchSite === 'cross-site') {
      return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
    }

    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (origin === 'null' || !isSameSiteUrl(originUrl, url)) {
          return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
        }
      } catch {
        return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
      }
    } else if (referer) {
      // Some same-site form posts may omit Origin; fallback to Referer.
      try {
        const refererUrl = new URL(referer);
        if (!isSameSiteUrl(refererUrl, url)) {
          return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
        }
      } catch {
        return withSecurityHeaders(new Response('Forbidden', { status: 403 }), url);
      }
    } else if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site' && secFetchSite !== 'none') {
      // If the browser sends the fetch-site hint and it's not same-site, block.
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

