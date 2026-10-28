import { conflict, unauthorized } from '../../../errors/AppError';
import { postgresErrorCode } from '../../../errors/pg';
import { hashPassword, verifyPassword } from '../../utils/password';
import { ACCESS_TOKEN_TTL_SECONDS, signAccessToken } from '../../utils/token';
import type { AccountResponse, LoginDto, LoginResponse, RegisterDto } from './auth.dto';
import type { Account } from './auth.interface';
import * as authRepository from './auth.repository';

const toResponse = (account: Account): AccountResponse => ({
  id: account.id,
  name: account.name,
  email: account.email,
  role: account.role,
  studentId: account.studentId,
  createdAt: account.createdAt.toISOString(),
});

/** Public registration always creates a plain user, with no student or mark access. */
export const register = async (dto: RegisterDto): Promise<AccountResponse> => {
  try {
    const account = await authRepository.insertUser({
      name: dto.name,
      email: dto.email,
      passwordHash: await hashPassword(dto.password),
      role: 'user',
    });
    return toResponse(account);
  } catch (err) {
    if (postgresErrorCode(err) === '23505') throw conflict('A user with that email already exists');
    throw err;
  }
};

export const login = async (dto: LoginDto): Promise<LoginResponse> => {
  const account = await authRepository.findAccountByEmail(dto.email);
  const passwordMatches = account?.passwordHash
    ? await verifyPassword(dto.password, account.passwordHash)
    : false;
  if (!account || !passwordMatches) throw unauthorized('Invalid email or password');

  return {
    accessToken: signAccessToken(account.id),
    tokenType: 'Bearer',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  };
};
