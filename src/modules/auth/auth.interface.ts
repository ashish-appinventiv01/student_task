import type { Role } from '../../config/permissions';

export interface Account {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId: number | null;
  passwordHash: string | null;
  createdAt: Date;
}

export interface NewAccount {
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
}
