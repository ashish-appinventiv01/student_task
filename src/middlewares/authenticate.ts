import type { RequestHandler } from 'express';
import { unauthorized } from '../../errors/AppError';
import { isRole } from '../config/permissions';
import { AccessTokenError, verifyAccessToken } from '../utils/token';
import * as authRepository from '../modules/auth/auth.repository';

/** Loads the account from the database. A role stored in the token is ignored. */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    next(unauthorized());
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice('Bearer '.length).trim());
    const account = await authRepository.findAccountById(payload.sub);
    if (!account || !isRole(account.role)) {
      next(unauthorized('Invalid token'));
      return;
    }
    req.user = { id: account.id, role: account.role, studentId: account.studentId };
    next();
  } catch (err) {
    if (err instanceof AccessTokenError) {
      next(unauthorized('Invalid token'));
      return;
    }
    next(err);
  }
};
