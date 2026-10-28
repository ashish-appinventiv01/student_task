import type { CreateUserDto, UpdateUserDto, UserResponseDto } from './user.dto';
import { conflict, notFound } from '../../../errors/AppError';
import { pool } from '../../../config/db';

/**
 * Business logic. Knows nothing about Express (no req/res).
 * Persists users in the PostgreSQL `users` table.
 */
interface UserRow {
  id: number;
  name: string;
  email: string;
  created_at: Date;
}

const USER_COLUMNS = 'id, name, email, created_at';

const toResponse = (row: UserRow): UserResponseDto => ({
  id: row.id,
  name: row.name,
  email: row.email,
  createdAt: new Date(row.created_at).toISOString(),
});

const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';

export const findAllUsers = async (): Promise<UserResponseDto[]> => {
  const result = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users ORDER BY id`);
  return result.rows.map(toResponse);
};

export const findUserById = async (id: number): Promise<UserResponseDto> => {
  const result = await pool.query<UserRow>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [id]);
  const row = result.rows[0];
  if (!row) throw notFound(`User ${id} not found`);
  return toResponse(row);
};

export const createUser = async (dto: CreateUserDto): Promise<UserResponseDto> => {
  try {
    const result = await pool.query<UserRow>(
      `INSERT INTO users (name, email) VALUES ($1, $2) RETURNING ${USER_COLUMNS}`,
      [dto.name, dto.email],
    );
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create user');
    return toResponse(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const updateUser = async (id: number, dto: UpdateUserDto): Promise<UserResponseDto> => {
  const fields: string[] = [];
  const values: unknown[] = [];

  if (dto.name !== undefined) {
    values.push(dto.name);
    fields.push(`name = $${values.length}`);
  }
  if (dto.email !== undefined) {
    values.push(dto.email);
    fields.push(`email = $${values.length}`);
  }

  values.push(id);

  try {
    const result = await pool.query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length} RETURNING ${USER_COLUMNS}`,
      values,
    );
    const row = result.rows[0];
    if (!row) throw notFound(`User ${id} not found`);
    return toResponse(row);
  } catch (err) {
    if (isUniqueViolation(err)) throw conflict('A user with that email already exists');
    throw err;
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
  if (result.rows.length === 0) throw notFound(`User ${id} not found`);
};
