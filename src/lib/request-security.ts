export function safeRedirectPath(input: FormDataEntryValue | null, fallback: string): string {
  if (typeof input !== 'string') return fallback;
  const value = input.trim();
  if (!value.startsWith('/')) return fallback;
  if (value.startsWith('//')) return fallback;
  return value;
}

function tryParseHttpUrl(s: string): string | null {
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Accepts absolute http(s) URLs. If the user omits the scheme (common for LinkedIn/IG pastes),
 * retries with https:// — `new URL('linkedin.com/in/…')` would otherwise throw.
 */
export function sanitizeHttpUrl(input: FormDataEntryValue | null): string | null {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  const direct = tryParseHttpUrl(raw);
  if (direct) return direct;
  const hasScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(raw);
  if (hasScheme) return null;
  const looksLikeHost = /^[\w.-]+\.[a-zA-Z]{2,}/.test(raw);
  if (!looksLikeHost) return null;
  return tryParseHttpUrl(`https://${raw.replace(/^\/+/, '')}`);
}

export function withToastParams(
  path: string,
  message: string,
  type: 'success' | 'error' | 'info' = 'success',
  options?: { celebrate?: boolean },
): string {
  const safeMessage = message.trim().slice(0, 180);
  if (!safeMessage) return path;
  try {
    const [base, hash] = path.split('#', 2);
    const url = new URL(base, 'http://localhost');
    url.searchParams.set('toast', safeMessage);
    url.searchParams.set('toast_type', type);
    if (options?.celebrate) {
      url.searchParams.set('celebrate', '1');
    }
    const out = `${url.pathname}${url.search}`;
    return hash ? `${out}#${hash}` : out;
  } catch {
    return path;
  }
}
