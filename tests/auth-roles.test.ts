import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES, type Role } from '../src/config/permissions';
import { signAccessToken } from '../src/utils/token';

interface StoredAccount {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId: number | null;
  passwordHash: string | null;
  createdAt: Date;
}

const { accounts, students, teacherClasses, ids } = vi.hoisted(() => ({
  accounts: new Map<number, StoredAccount>(),
  students: new Map<number, { id: number }>(),
  teacherClasses: [] as Array<{ teacherUserId: number; className: string; section: string }>,
  ids: { next: 100 },
}));

vi.mock('../src/modules/auth/auth.repository', () => ({
  findAccountById: async (id: number) => accounts.get(id) ?? null,
  findAccountByEmail: async (email: string) =>
    [...accounts.values()].find((account) => account.email === email) ?? null,
  insertUser: async (input: { name: string; email: string; passwordHash: string; role: Role }) => {
    if ([...accounts.values()].some((account) => account.email === input.email)) {
      const err = new Error('duplicate email');
      Object.assign(err, { code: '23505' });
      throw err;
    }
    const account: StoredAccount = {
      id: ids.next++,
      name: input.name,
      email: input.email,
      role: input.role,
      studentId: null,
      passwordHash: input.passwordHash,
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
    };
    accounts.set(account.id, account);
    return account;
  },
  setRole: async (id: number, role: Role) => {
    const account = accounts.get(id);
    if (!account) return null;
    account.role = role;
    return account;
  },
}));

vi.mock('../src/modules/admin/admin.repository', () => ({
  findUserById: async (id: number) => {
    const account = accounts.get(id);
    if (!account) return null;
    return { id: account.id, role: account.role, studentId: account.studentId };
  },
  findStudentById: async (id: number) => students.get(id) ?? null,
  insertTeacherClass: async (input: { teacherUserId: number; className: string; section: string }) => {
    const duplicate = teacherClasses.some(
      (row) =>
        row.teacherUserId === input.teacherUserId &&
        row.className === input.className &&
        row.section === input.section,
    );
    if (duplicate) {
      const err = new Error('duplicate teacher class');
      Object.assign(err, { code: '23505' });
      throw err;
    }
    teacherClasses.push(input);
    return input;
  },
  linkStudent: async (userId: number, studentId: number) => {
    if ([...accounts.values()].some((account) => account.studentId === studentId)) {
      const err = new Error('duplicate student link');
      Object.assign(err, { code: '23505' });
      throw err;
    }
    const account = accounts.get(userId);
    if (!account || account.studentId !== null) return null;
    account.studentId = studentId;
    return { userId, studentId };
  },
}));

vi.mock('../src/modules/student/student.service', () => ({
  listStudents: async () => [],
  findStudent: async () => ({}),
  createStudent: async () => ({}),
  updateStudent: async () => ({}),
  deleteStudent: async () => undefined,
}));

vi.mock('../src/modules/mark/mark.service', () => ({
  createMarks: async () => ({ studentId: 17, exam: 'unit-1', marks: [] }),
  getSubjectAverages: async () => [],
  updateMark: async () => ({}),
  deleteMark: async () => undefined,
  toAverageDto: () => ({ passed: false }),
}));

import app from '../src/app';
import * as authRepository from '../src/modules/auth/auth.repository';

/** Issues a token and stores the role where authenticate reloads it. The token itself has no role. */
const as = (id: number, role: Role): string => {
  const current = accounts.get(id);
  accounts.set(id, {
    id,
    name: current?.name ?? `User ${id}`,
    email: current?.email ?? `user${id}@school.test`,
    role,
    studentId: current?.studentId ?? null,
    passwordHash: current?.passwordHash ?? null,
    createdAt: current?.createdAt ?? new Date('2026-10-28T00:00:00.000Z'),
  });
  return signAccessToken(id);
};

const seedRoster = (): void => {
  accounts.clear();
  students.clear();
  teacherClasses.length = 0;
  ids.next = 100;
  accounts.set(2, {
    id: 2,
    name: 'Ms Rao',
    email: 'rao@school.test',
    role: 'teacher',
    studentId: null,
    passwordHash: null,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
  });
  accounts.set(3, {
    id: 3,
    name: 'Mr Iyer',
    email: 'iyer@school.test',
    role: 'teacher',
    studentId: null,
    passwordHash: null,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
  });
  accounts.set(4, {
    id: 4,
    name: 'Priya',
    email: 'priya@school.test',
    role: 'student',
    studentId: null,
    passwordHash: null,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
  });
  accounts.set(5, {
    id: 5,
    name: 'Arjun',
    email: 'arjun@school.test',
    role: 'student',
    studentId: null,
    passwordHash: null,
    createdAt: new Date('2026-10-28T00:00:00.000Z'),
  });
  students.set(17, { id: 17 });
  students.set(23, { id: 23 });
};

let server: Server;
let baseUrl = '';

const api = async (
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: { data?: Record<string, unknown>; error?: { message?: string } } }> => {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as { data?: Record<string, unknown> }) : {} };
};

const teacherMark = {
  exam: 'unit-1',
  marks: [{ subject: 'maths', score: 40, maxScore: 50 }],
};

describe('roles and account linking', () => {
  beforeAll(async () => {
    server = createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server has no port');
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    seedRoster();
  });

  it('keeps user and moderator and adds teacher and student', () => {
    expect(ROLES).toEqual(['user', 'moderator', 'admin', 'teacher', 'student']);
  });

  it('registers a plain user who cannot see students or marks', async () => {
    const registered = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Ada Lovelace', email: 'ada@school.test', password: 'password123' },
    });
    expect(registered.status).toBe(201);
    expect(registered.body.data).toMatchObject({ role: 'user', studentId: null });

    const userId = registered.body.data?.id;
    expect(typeof userId).toBe('number');
    const token = as(userId as number, 'user');

    expect((await api('/api/students', { token })).status).toBe(403);
    expect((await api('/api/marks/averages', { token })).status).toBe(403);
  });

  it('still accepts a moderator token', async () => {
    const token = as(9, 'moderator');
    expect((await api('/api/students', { token })).status).toBe(403);
  });

  it('links Ms Rao to 10A and 10B and Mr Iyer to 9C', async () => {
    const admin = as(1, 'admin');
    const tenA = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 2, className: '10', section: 'a' },
    });
    const tenB = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 2, className: 10, section: 'B' },
    });
    const nineC = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 3, className: '9', section: 'C' },
    });

    expect(tenA.status).toBe(201);
    expect(tenA.body.data).toEqual({ teacherUserId: 2, className: '10', section: 'A' });
    expect(tenB.status).toBe(201);
    expect(tenB.body.data).toEqual({ teacherUserId: 2, className: '10', section: 'B' });
    expect(nineC.status).toBe(201);
    expect(nineC.body.data).toEqual({ teacherUserId: 3, className: '9', section: 'C' });
  });

  it('rejects a class link for a non-teacher, an unknown user, and a duplicate', async () => {
    const admin = as(1, 'admin');
    const notTeacher = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 4, className: '10', section: 'A' },
    });
    const missing = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 99, className: '10', section: 'A' },
    });
    await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 2, className: '10', section: 'A' },
    });
    const duplicate = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: admin,
      body: { teacherUserId: 2, className: '10', section: 'A' },
    });

    expect(notTeacher.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(duplicate.status).toBe(409);
  });

  it('links Priya to student 17 and Arjun to student 23', async () => {
    const admin = as(1, 'admin');
    const priya = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 4, studentId: 17 },
    });
    const arjun = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 5, studentId: 23 },
    });

    expect(priya.status).toBe(201);
    expect(priya.body.data).toEqual({ userId: 4, studentId: 17 });
    expect(arjun.status).toBe(201);
    expect(arjun.body.data).toEqual({ userId: 5, studentId: 23 });
    expect(accounts.get(4)?.studentId).toBe(17);
    expect(accounts.get(5)?.studentId).toBe(23);
  });

  it('rejects a student link for a non-student, an unknown record, and a duplicate', async () => {
    const admin = as(1, 'admin');
    const notStudent = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 2, studentId: 17 },
    });
    const missingUser = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 99, studentId: 17 },
    });
    const missingStudent = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 4, studentId: 99 },
    });
    await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 4, studentId: 17 },
    });
    const duplicate = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 4, studentId: 17 },
    });
    const taken = await api('/api/admin/student-links', {
      method: 'POST',
      token: admin,
      body: { userId: 5, studentId: 17 },
    });

    expect(notStudent.status).toBe(400);
    expect(missingUser.status).toBe(404);
    expect(missingStudent.status).toBe(404);
    expect(duplicate.status).toBe(409);
    expect(taken.status).toBe(409);
  });

  it('refuses account linking to anyone except an admin', async () => {
    const teacher = as(2, 'teacher');
    const response = await api('/api/admin/teacher-classes', {
      method: 'POST',
      token: teacher,
      body: { teacherUserId: 2, className: '10', section: 'A' },
    });
    expect(response.status).toBe(403);
  });

  it('stops a teacher token from entering marks after an admin changes the role to user', async () => {
    const token = as(2, 'teacher');
    const before = await api('/api/students/17/marks', { method: 'POST', token, body: teacherMark });
    expect(before.status).toBe(201);

    await authRepository.setRole(2, 'user');

    const after = await api('/api/students/17/marks', { method: 'POST', token, body: teacherMark });
    expect(after.status).toBe(403);
  });
});
