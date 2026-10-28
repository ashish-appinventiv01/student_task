import type { RequestHandler } from 'express';

const personalPrefixes = ['/auth', '/students', '/marks'];

/** Personal routes must not be stored by a browser or a shared cache. */
export const noStore: RequestHandler = (req, res, next) => {
  const isPersonal = personalPrefixes.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`));
  if (isPersonal) res.setHeader('Cache-Control', 'no-store');
  next();
};
