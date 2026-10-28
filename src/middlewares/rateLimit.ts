import type { RequestHandler } from 'express';
import { tooManyRequests, unauthorized } from '../../errors/AppError';

/** Mark submission window. A whole school can share one address, so the key is the user id. */
export const MARKS_RATE_WINDOW_MS = 10 * 60 * 1000;

interface RateLimiterOptions {
  max: number;
  windowMs: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export const createRateLimiter = ({ max, windowMs }: RateLimiterOptions): RequestHandler => {
  const hits = new Map<number, Bucket>();

  return (req, _res, next) => {
    const userId = req.user?.id;
    if (userId === undefined) {
      next(unauthorized());
      return;
    }

    const now = Date.now();
    const bucket = hits.get(userId);
    if (!bucket || bucket.resetAt <= now) {
      hits.set(userId, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (bucket.count >= max) {
      next(tooManyRequests('Too many mark submissions for this account. Try again in 10 minutes.'));
      return;
    }

    bucket.count += 1;
    next();
  };
};
