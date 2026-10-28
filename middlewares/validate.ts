import type { RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

/**
 * Validates req.body against a DTO schema and replaces it with the parsed
 * (trimmed, coerced) value. A ZodError is thrown -> central error handler -> 400.
 */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    res.locals.query = schema.parse(req.query);
    next();
  };

export const validateParams =
  (schema: ZodType): RequestHandler =>
  (req, res, next) => {
    res.locals.params = schema.parse(req.params);
    next();
  };

export const paramsOf = <T>(res: Response): T => res.locals.params as T;