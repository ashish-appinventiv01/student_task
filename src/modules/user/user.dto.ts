import { z } from 'zod';

/* ---------- Request DTOs (validated at the edge) ---------- */

export const createUserDto = z.strictObject({
  name: z.string().trim().min(1).max(100),
  email: z.email().trim().toLowerCase(),
});
export type CreateUserDto = z.infer<typeof createUserDto>;

export const updateUserDto = z
  .strictObject({
    name: z.string().trim().min(1).max(100).optional(),
    email: z.email().trim().toLowerCase().optional(),
  })
  .refine((body) => body.name !== undefined || body.email !== undefined, {
    error: 'Provide at least one field to update',
  });
export type UpdateUserDto = z.infer<typeof updateUserDto>;

export const userIdParamDto = z.object({
  id: z.coerce.number().int().positive({ error: 'id must be a positive integer' }),
});
export type UserIdParamDto = z.infer<typeof userIdParamDto>;
  
  /* ---------- Response DTO (what clients see) ---------- */
  
  export interface UserResponseDto {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  }