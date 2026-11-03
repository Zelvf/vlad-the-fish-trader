import crypto from 'node:crypto';

const SESSION_SECONDS = 12 * 60 * 60;

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32);
}

export function passwordMatches(supplied: unknown): boolean {
  if (!adminConfigured() || typeof supplied !== 'string') return false;
  const expected = crypto.createHash('sha256').update(process.env.ADMIN_PASSWORD!).digest();
  const actual = crypto.createHash('sha256').update(supplied).digest();
  return crypto.timingSafeEqual(expected, actual);
}

function cookieName(secure: boolean): string { return secure ? '__Host-vlad_admin' : 'vlad_admin'; }

export function sessionCookie(secure: boolean): string {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const nonce = crypto.randomBytes(16).toString('base64url');
  const payload = `${expires}.${nonce}`;
  const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(payload).digest('base64url');
  return `${cookieName(secure)}=${payload}.${signature}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure ? '; Secure' : ''}`;
}

export function clearSessionCookie(secure: boolean): string {
  return `${cookieName(secure)}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure ? '; Secure' : ''}`;
}

export function sessionValid(cookieHeader: string | null | undefined, secure: boolean): boolean {
  if (!adminConfigured()) return false;
  const prefix = `${cookieName(secure)}=`;
  const raw = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return false;
  const parts = raw.split('.');
  if (parts.length !== 3) return false;
  const expires = Number(parts[0]);
  if (!Number.isSafeInteger(expires) || expires <= Date.now() / 1000) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET!).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(parts[2], 'base64url'); } catch { return false; }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export function originAllowed(origin: string | null | undefined, host: string | null | undefined): boolean {
  if (!origin || !host) return false;
  try {
    const source = new URL(origin);
    if (source.host === host && (source.protocol === 'https:' || /^localhost:|^127\.0\.0\.1:/.test(host))) return true;
    return /^localhost:|^127\.0\.0\.1:/.test(source.host) && /^localhost:|^127\.0\.0\.1:/.test(host);
  } catch { return false; }
}

export function clientKey(ip: string): string {
  return crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET || 'unconfigured').update(ip).digest('hex');
}
