import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env';

export class AccessTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessTokenError';
  }
}

/** Access tokens last 15 minutes. The role is never read from the token. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;

export interface AccessTokenPayload {
  sub: number;
  iat: number;
  exp: number;
}

const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');

const signSegment = (data: string): string =>
  createHmac('sha256', env.JWT_SECRET).update(data).digest('base64url');

export const signAccessToken = (userId: number, nowMs = Date.now()): string => {
  const issuedAt = Math.floor(nowMs / 1000);
  const payload = Buffer.from(
    JSON.stringify({ sub: userId, iat: issuedAt, exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS }),
  ).toString('base64url');
  const data = `${header}.${payload}`;
  return `${data}.${signSegment(data)}`;
};

export const verifyAccessToken = (token: string, nowMs = Date.now()): AccessTokenPayload => {
  const [encodedHeader, encodedPayload, signature, extra] = token.split('.');
  if (!encodedHeader || !encodedPayload || !signature || extra !== undefined) {
    throw new AccessTokenError('Malformed access token');
  }

  const data = `${encodedHeader}.${encodedPayload}`;
  const expected = signSegment(data);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new AccessTokenError('Invalid access token signature');
  }

  let payload: Partial<AccessTokenPayload>;
  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<AccessTokenPayload>;
  } catch {
    throw new AccessTokenError('Malformed access token');
  }
  if (typeof payload.sub !== 'number' || !Number.isInteger(payload.sub) || payload.sub <= 0) {
    throw new AccessTokenError('Invalid access token subject');
  }
  if (typeof payload.exp !== 'number' || payload.exp * 1000 <= nowMs) {
    throw new AccessTokenError('Access token expired');
  }

  return { sub: payload.sub, iat: payload.iat ?? payload.exp - ACCESS_TOKEN_TTL_SECONDS, exp: payload.exp };
};
