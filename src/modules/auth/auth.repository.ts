import { pool } from '../../../config/db';
import { isRole, type Role } from '../../config/permissions';
import type { Account, NewAccount } from './auth.interface';

interface AccountRow {
  id: number;
  name: string;
  email: string;
  password_hash: string | null;
  role: string;
  student_id: number | null;
  created_at: Date;
}

const ACCOUNT_COLUMNS = 'id, name, email, password_hash, role, student_id, created_at';

const toAccount = (row: AccountRow): Account | null => {
  if (!isRole(row.role)) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    studentId: row.student_id,
    passwordHash: row.password_hash,
    createdAt: new Date(row.created_at),
  };
};

export const findAccountById = async (id: number): Promise<Account | null> => {
  const result = await pool.query<AccountRow>(`SELECT ${ACCOUNT_COLUMNS} FROM users WHERE id = $1`, [id]);
  const row = result.rows[0];
  return row ? toAccount(row) : null;
};

export const findAccountByEmail = async (email: string): Promise<Account | null> => {
  const result = await pool.query<AccountRow>(`SELECT ${ACCOUNT_COLUMNS} FROM users WHERE email = $1`, [email]);
  const row = result.rows[0];
  return row ? toAccount(row) : null;
};

export const insertUser = async (input: NewAccount): Promise<Account> => {
  const result = await pool.query<AccountRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${ACCOUNT_COLUMNS}`,
    [input.name, input.email, input.passwordHash, input.role],
  );
  const row = result.rows[0];
  const account = row ? toAccount(row) : null;
  if (!account) throw new Error('Failed to create account');
  return account;
};

export const setRole = async (id: number, role: Role): Promise<Account | null> => {
  const result = await pool.query<AccountRow>(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING ${ACCOUNT_COLUMNS}`,
    [id, role],
  );
  const row = result.rows[0];
  return row ? toAccount(row) : null;
};
