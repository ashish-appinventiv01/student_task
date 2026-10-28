import type { RequestHandler } from 'express';
import { forbidden, unauthorized } from '../../errors/AppError';
import { can, type Permission, type Role } from '../config/permissions';

export interface AccessActor {
  id: number;
  role: Role;
  studentId: number | null;
}

export const actorOf = (req: { user?: AccessActor }): AccessActor => {
  if (!req.user) throw unauthorized();
  return req.user;
};

/** Every listed permission is required. */
export const requirePermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (permissions.some((permission) => !can(req.user, permission))) {
      next(forbidden());
      return;
    }
    next();
  };

/** At least one listed permission is required. Scoped reads use this. */
export const requireAnyPermission =
  (...permissions: Permission[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!permissions.some((permission) => can(req.user, permission))) {
      next(forbidden());
      return;
    }
    next();
  };
