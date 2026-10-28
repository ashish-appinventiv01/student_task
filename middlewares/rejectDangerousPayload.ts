import type { RequestHandler } from 'express';
import { badRequest } from '../errors/AppError';

const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);

export const assertSafePayload = (value: unknown, seen = new Set<object>()): void => {
  if (typeof value === 'string') {
    if (value.includes('\0')) throw badRequest('Request contains a forbidden null byte');
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  for (const key of Object.getOwnPropertyNames(value)) {
    if (forbiddenKeys.has(key)) throw badRequest(`Request contains a forbidden field "${key}"`);
    assertSafePayload((value as Record<string, unknown>)[key], seen);
  }
};

/** Rejects prototype-pollution keys and null bytes before a module reads the body. */
export const rejectDangerousPayload: RequestHandler = (req, _res, next) => {
  try {
    assertSafePayload(req.body);
    assertSafePayload(req.query);
    assertSafePayload(req.params);
    next();
  } catch (err) {
    next(err);
  }
};
