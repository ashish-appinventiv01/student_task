import { z } from 'zod';
import type { Role } from '../../config/permissions';

export const registerDto = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, { error: 'password must be at least 8 characters' }).max(72),
});
export type RegisterDto = z.infer<typeof registerDto>;

export const loginDto = z.strictObject({
  email: z.email().trim().toLowerCase(),
  password: z.string().min(1),
});
export type LoginDto = z.infer<typeof loginDto>;

export interface AccountResponse {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId: number | null;
  createdAt: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
}
