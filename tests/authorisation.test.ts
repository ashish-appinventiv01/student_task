import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Role } from '../src/config/permissions';
import { signAccessToken } from '../src/utils/token';

interface StoredAccount {
  id: number;
  role: Role;
  studentId: number | null;
}

interface StoredStudent {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  className: string;
  section: string;
  guardian: { name: string; phone: string; relation: 'father' };
  createdAt: Date;
  updatedAt: Date;
}

interface StoredMark {
  id: number;
  studentId: number;
  exam: 'unit-1';
  subject: string;
  score: number;
  maxScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const stamp = new Date('2026-10-28T00:00:00.000Z');

const { accounts, students, marks, teacherClasses, links } = vi.hoisted(() => ({
  accounts: new Map<number, StoredAccount>(),
  students: [] as StoredStudent[],
  marks: [] as StoredMark[],
  teacherClasses: [] as Array<{ teacherUserId: number; className: string; section: string }>,
  links: new Map<number, number>(),
}));

const studentRecord = (
  id: number,
  firstName: string,
  className: string,
  section: string,
): StoredStudent => ({
  id,
  rollNo: `2026-${className}${section}-${String(id).padStart(3, '0')}`,
  firstName,
  lastName: 'Rao',
  dateOfBirth: new Date(2010, 3, 12),
  className,
  section,
  guardian: { name: 'Ravi Rao', phone: '+919876543210', relation: 'father' },
  createdAt: stamp,
  updatedAt: stamp,
});

vi.mock('../src/modules/auth/auth.repository', () => ({
  findAccountById: async (id: number) => accounts.get(id) ?? null,
  findAccountByEmail: async () => null,
  insertUser: async () => {
    throw new Error('unused');
  },
  setRole: async () => null,
}));

vi.mock('../src/modules/access/access.repository', () => ({
  findTeacherClasses: async (teacherUserId: number) =>
    teacherClasses
      .filter((row) => row.teacherUserId === teacherUserId)
      .map((row) => ({ className: row.className, section: row.section })),
  findLinkedStudentId: async (userId: number) => links.get(userId) ?? null,
}));

vi.mock('../src/modules/student/student.repository', () => ({
  findById: async (id: number) => students.find((student) => student.id === id) ?? null,
  findMany: async (filter: {
    className?: string;
    section?: string;
    limit: number;
    offset: number;
    classes?: { className: string; section: string }[];
    studentId?: number | null;
  }) => {
    if (filter.studentId === null) return [];
    const rows = students
      .filter((student) => filter.studentId === undefined || student.id === filter.studentId)
      .filter((student) => filter.className === undefined || student.className === filter.className)
      .filter((student) => filter.section === undefined || student.section === filter.section)
      .filter(
        (student) =>
          filter.classes === undefined ||
          filter.classes.some((entry) => entry.className === student.className && entry.section === student.section),
      )
      .sort((left, right) => left.id - right.id);
    return rows.slice(filter.offset, filter.offset + filter.limit);
  },
  insert: vi.fn(async (changes: Omit<StoredStudent, 'id' | 'createdAt' | 'updatedAt' | 'dateOfBirth'> & { dateOfBirth: string }) =>
    studentRecord(100, changes.firstName, changes.className ?? '10', changes.section ?? 'A'),
  ),
  update: vi.fn(async (id: number, changes: { firstName?: string }) => {
    const student = students.find((row) => row.id === id);
    if (!student) return null;
    return { ...student, firstName: changes.firstName ?? student.firstName };
  }),
  remove: vi.fn(async (id: number) => students.some((student) => student.id === id)),
}));

vi.mock('../src/modules/mark/mark.repository', () => ({
  findById: async (id: number) => marks.find((mark) => mark.id === id) ?? null,
  insertMany: vi.fn(async (studentId: number, exam: 'unit-1', items: Array<{ subject: string; score: number; maxScore: number }>) =>
    items.map((item, index) => ({
      id: 50 + index,
      studentId,
      exam,
      subject: item.subject,
      score: item.score,
      maxScore: item.maxScore,
      createdAt: stamp,
      updatedAt: stamp,
    })),
  ),
  update: vi.fn(async (id: number, changes: { score?: number; maxScore?: number }) => {
    const mark = marks.find((row) => row.id === id);
    if (!mark) return null;
    return { ...mark, score: changes.score ?? mark.score, maxScore: changes.maxScore ?? mark.maxScore };
  }),
  remove: vi.fn(async (id: number) => marks.some((mark) => mark.id === id)),
  subjectAverages: vi.fn(async () => []),
}));

import app from '../src/app';
import * as markRepository from '../src/modules/mark/mark.repository';
import * as studentRepository from '../src/modules/student/student.repository';

const as = (id: number, role: Role): string => {
  const current = accounts.get(id);
  accounts.set(id, { id, role, studentId: current?.studentId ?? links.get(id) ?? null });
  return signAccessToken(id);
};

const seed = (): void => {
  accounts.clear();
  students.length = 0;
  marks.length = 0;
  teacherClasses.length = 0;
  links.clear();

  accounts.set(1, { id: 1, role: 'admin', studentId: null });
  accounts.set(2, { id: 2, role: 'teacher', studentId: null });
  accounts.set(3, { id: 3, role: 'teacher', studentId: null });
  accounts.set(4, { id: 4, role: 'student', studentId: 17 });
  accounts.set(5, { id: 5, role: 'student', studentId: 23 });
  links.set(4, 17);
  links.set(5, 23);
  teacherClasses.push(
    { teacherUserId: 2, className: '10', section: 'A' },
    { teacherUserId: 2, className: '10', section: 'B' },
    { teacherUserId: 3, className: '9', section: 'C' },
  );
  students.push(
    studentRecord(17, 'Priya', '10', 'A'),
    studentRecord(18, 'Meera', '10', 'A'),
    studentRecord(19, 'Kabir', '10', 'B'),
    studentRecord(23, 'Arjun', '9', 'C'),
  );
  marks.push(
    { id: 1, studentId: 17, exam: 'unit-1', subject: 'maths', score: 40, maxScore: 50, createdAt: stamp, updatedAt: stamp },
    { id: 2, studentId: 23, exam: 'unit-1', subject: 'maths', score: 30, maxScore: 50, createdAt: stamp, updatedAt: stamp },
  );
};

let server: Server;
let baseUrl = '';

const api = async (
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
): Promise<{ status: number; body: { data?: Array<{ id: number; firstName?: string }> } }> => {
  const headers: Record<string, string> = {};
  if (options.token) headers.authorization = `Bearer ${options.token}`;
  if (options.body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as { data?: Array<{ id: number }> }) : {} };
};

const newStudent = {
  rollNo: '2026-10A-099',
  firstName: 'Nia',
  lastName: 'Shah',
  dateOfBirth: '2010-04-12',
  className: '10',
  section: 'A',
  guardian: { name: 'Ravi Shah', phone: '+919876543210', relation: 'father' },
};
const markBody = { exam: 'unit-1', marks: [{ subject: 'maths', score: 40, maxScore: 50 }] };

const bodyFor = (method: string, path: string): unknown => {
  if (method === 'POST' && path === '/api/students') return newStudent;
  if (method === 'PATCH' && path.startsWith('/api/students/')) return { firstName: 'Nia' };
  if (method === 'POST' && path.endsWith('/marks')) return markBody;
  if (method === 'PATCH' && path.startsWith('/api/marks/')) return { score: 41 };
  return undefined;
};

const matrix = [
  ['admin', 'GET', '/api/students', 200],
  ['teacher', 'GET', '/api/students', 200],
  ['student', 'GET', '/api/students', 200],
  ['admin', 'GET', '/api/students/23', 200],
  ['teacher', 'GET', '/api/students/17', 200],
  ['student', 'GET', '/api/students/17', 200],
  ['teacher', 'GET', '/api/students/23', 404],
  ['student', 'GET', '/api/students/23', 404],
  ['admin', 'POST', '/api/students', 201],
  ['teacher', 'POST', '/api/students', 403],
  ['student', 'POST', '/api/students', 403],
  ['admin', 'PATCH', '/api/students/17', 200],
  ['teacher', 'PATCH', '/api/students/17', 403],
  ['student', 'PATCH', '/api/students/17', 403],
  ['admin', 'DELETE', '/api/students/19', 204],
  ['teacher', 'DELETE', '/api/students/17', 403],
  ['student', 'DELETE', '/api/students/17', 403],
  ['admin', 'POST', '/api/students/17/marks', 201],
  ['teacher', 'POST', '/api/students/17/marks', 201],
  ['student', 'POST', '/api/students/17/marks', 403],
  ['admin', 'POST', '/api/students/23/marks', 201],
  ['teacher', 'POST', '/api/students/23/marks', 404],
  ['student', 'POST', '/api/students/23/marks', 403],
  ['admin', 'PATCH', '/api/marks/1', 200],
  ['teacher', 'PATCH', '/api/marks/1', 200],
  ['student', 'PATCH', '/api/marks/1', 403],
  ['admin', 'PATCH', '/api/marks/2', 200],
  ['teacher', 'PATCH', '/api/marks/2', 404],
  ['student', 'PATCH', '/api/marks/2', 403],
  ['admin', 'GET', '/api/marks/averages?className=9', 200],
  ['teacher', 'GET', '/api/marks/averages?className=10', 200],
  ['teacher', 'GET', '/api/marks/averages?className=9', 403],
  ['student', 'GET', '/api/marks/averages?className=10', 403],
] as const;

describe('authorisation', () => {
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
    seed();
    vi.clearAllMocks();
  });

  it.each(matrix)('%s %s %s -> %s', async (role, method, path, status) => {
    const userId = role === 'admin' ? 1 : role === 'teacher' ? 2 : 4;
    const token = as(userId, role);
    const response = await api(path, { method, token, body: bodyFor(method, path) });
    expect(response.status).toBe(status);
  });

  it('blocks Ms Rao from student 23 and never writes', async () => {
    const token = as(2, 'teacher');

    expect((await api('/api/students/23', { token })).status).toBe(404);
    expect((await api('/api/students/23/marks', { method: 'POST', token, body: markBody })).status).toBe(404);

    expect(markRepository.insertMany).not.toHaveBeenCalled();
    expect(markRepository.update).not.toHaveBeenCalled();
    expect(studentRepository.insert).not.toHaveBeenCalled();
    expect(studentRepository.update).not.toHaveBeenCalled();
    expect(studentRepository.remove).not.toHaveBeenCalled();
  });

  it('returns only Priya when she lists students', async () => {
    const response = await api('/api/students', { token: as(4, 'student') });
    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([expect.objectContaining({ id: 17, firstName: 'Priya' })]);
  });
});
