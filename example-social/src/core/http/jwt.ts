/**
 * Minimal JWT encoding for the mock backend.
 *
 * Tokens have the real JWT shape (base64url header.payload.signature), so the
 * client can decode `exp` like it would with a real backend. The signature is
 * a non-cryptographic hash: this code only runs inside the mock server and
 * must never be used to protect real data.
 */

export type JwtPayload = {
  /** Subject: user id. */
  sub: string;
  /** Token id, used to rotate and revoke refresh tokens. */
  jti: string;
  /** 'access' or 'refresh'. */
  typ: 'access' | 'refresh';
  /** Issued at, seconds since epoch. */
  iat: number;
  /** Expires at, seconds since epoch. */
  exp: number;
  /** Refresh token family: all tokens issued from one login. */
  fam?: string;
};

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function utf8Bytes(text: string): number[] {
  const encoded = encodeURIComponent(text);
  const bytes: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    if (encoded[i] === '%') {
      bytes.push(parseInt(encoded.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(encoded.charCodeAt(i));
    }
  }
  return bytes;
}

export function base64UrlEncode(text: string): string {
  const bytes = utf8Bytes(text);
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63];
    if (i + 1 < bytes.length) out += ALPHABET[(n >> 6) & 63];
    if (i + 2 < bytes.length) out += ALPHABET[n & 63];
  }
  return out;
}

export function base64UrlDecode(input: string): string {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of input) {
    const value = ALPHABET.indexOf(char);
    if (value < 0) throw new Error('Invalid base64url');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 255);
    }
  }
  return decodeURIComponent(bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''));
}

/** FNV-1a, 32 bit. Stands in for HMAC-SHA256 in the mock server only. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

const HEADER = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));

export function signJwt(payload: JwtPayload, secret: string): string {
  const body = base64UrlEncode(JSON.stringify(payload));
  return `${HEADER}.${body}.${base64UrlEncode(hash(`${HEADER}.${body}.${secret}`))}`;
}

export type VerifyResult =
  { ok: true; payload: JwtPayload } | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyJwt(token: string, secret: string, nowMs = Date.now()): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed' };
  const [header, body, signature] = parts;
  if (base64UrlEncode(hash(`${header}.${body}.${secret}`)) !== signature)
    return { ok: false, reason: 'bad_signature' };
  const payload = decodeJwt(token);
  if (!payload) return { ok: false, reason: 'malformed' };
  if (payload.exp * 1000 <= nowMs) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}

/**
 * Reads the payload without checking the signature, like `jwt-decode` on a
 * client. The client uses it to know when the access token expires.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    return JSON.parse(base64UrlDecode(token.split('.')[1] ?? '')) as JwtPayload;
  } catch {
    return null;
  }
}
