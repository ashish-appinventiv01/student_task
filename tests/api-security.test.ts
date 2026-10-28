import { createServer, type Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../middlewares/errorHandler';
import { authenticate } from '../src/middlewares/authenticate';
import { MARKS_RATE_WINDOW_MS, createRateLimiter } from '../src/middlewares/rateLimit';
import { hashPassword } from '../src/utils/password';
import { signAccessToken } from '../src/utils/token';
import type { Role } from '../src/config/permissions';

interface StoredAccount {
  id: number;
  name: string;
  email: string;
  role: Role;
  studentId: number | null;
  passwordHash: string | null;
  createdAt: Date;
}

const { accounts } = vi.hoisted(() => ({
  accounts: new Map<number, StoredAccount>(),
}));

vi.mock('../src/modules/auth/auth.repository', () => ({
  findAccountById: async (id: number) => accounts.get(id) ?? null,
  findAccountByEmail: async (email: string) =>
    [...accounts.values()].find((account) => account.email === email) ?? null,
  insertUser: async () => {
    throw new Error('unused');
  },
  setRole: async () => null,
}));

vi.mock('../src/modules/student/student.service', () => ({
  listStudents: async () => [{ id: 17, firstName: 'Priya' }],
  findStudent: async () => ({ id: 17, firstName: 'Priya' }),
  createStudent: async () => ({ id: 100 }),
  updateStudent: async () => ({ id: 17 }),
  deleteStudent: async () => undefined,
}));

vi.mock('../src/modules/mark/mark.service', () => ({
  createMarks: async () => [],
  updateMark: async () => ({ id: 1 }),
  deleteMark: async () => undefined,
  getSubjectAverages: async () => [],
}));

import app from '../src/app';

const password = 'school-secret-password';
let passwordHash = '';
let server: Server;
let baseUrl = '';

const listen = async (handler: express.Express): Promise<{ server: Server; url: string }> => {
  const started = createServer(handler);
  await new Promise<void>((resolve) => {
    started.listen(0, '127.0.0.1', () => resolve());
  });
  const address = started.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no port');
  return { server: started, url: `http://127.0.0.1:${address.port}` };
};

const close = (running: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    running.close((err) => (err ? reject(err) : resolve()));
  });

const contains = (value: unknown, secret: string): boolean => {
  if (typeof value === 'string') return value.includes(secret);
  if (Array.isArray(value)) return value.some((item) => contains(item, secret));
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => contains(item, secret));
  }
  return false;
};

describe('api security', () => {
  beforeAll(async () => {
    passwordHash = await hashPassword(password);
    accounts.set(1, {
      id: 1,
      name: 'Admin',
      email: 'admin@school.test',
      role: 'admin',
      studentId: null,
      passwordHash,
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
    });
    const started = await listen(app);
    server = started.server;
    baseUrl = started.url;
  });

  afterAll(async () => {
    await close(server);
  });

  it('sets Cache-Control: no-store on a success and an error', async () => {
    const success = await fetch(`${baseUrl}/api/students`, {
      headers: { authorization: `Bearer ${signAccessToken(1)}` },
    });
    const failure = await fetch(`${baseUrl}/api/students`);

    expect(success.status).toBe(200);
    expect(failure.status).toBe(401);
    expect(success.headers.get('cache-control')).toBe('no-store');
    expect(failure.headers.get('cache-control')).toBe('no-store');
  });

  it('keeps the password, its hash, and the access token out of student and mark responses', async () => {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@school.test', password }),
    });
    const loginBody = (await login.json()) as { data?: { accessToken?: string }; curl?: unknown };
    expect(login.status).toBe(200);
    const accessToken = loginBody.data?.accessToken;
    expect(accessToken).toEqual(expect.any(String));
    expect(contains(loginBody, password)).toBe(false);
    expect(contains(loginBody, passwordHash)).toBe(false);

    const paths = ['/api/students', '/api/students/17', '/api/marks/averages?className=10'];
    for (const path of paths) {
      const response = await fetch(`${baseUrl}${path}`, {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const body: unknown = await response.json();
      expect(response.status).toBe(200);
      expect(contains(body, password)).toBe(false);
      expect(contains(body, passwordHash)).toBe(false);
      expect(contains(body, accessToken ?? '')).toBe(false);
      expect(contains(body, `Bearer ${accessToken}`)).toBe(false);
    }
  });

  it('returns 429 for one user after the limit and still accepts another user on the same IP', async () => {
    accounts.set(10, {
      id: 10,
      name: 'User A',
      email: 'a@school.test',
      role: 'teacher',
      studentId: null,
      passwordHash: null,
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
    });
    accounts.set(11, {
      id: 11,
      name: 'User B',
      email: 'b@school.test',
      role: 'teacher',
      studentId: null,
      passwordHash: null,
      createdAt: new Date('2026-10-28T00:00:00.000Z'),
    });

    const max = 2;
    const limited = express();
    limited.use(express.json());
    limited.post(
      '/api/students/:id/marks',
      authenticate,
      createRateLimiter({ max, windowMs: MARKS_RATE_WINDOW_MS }),
      (_req, res) => {
        res.status(201).json({ data: { saved: true } });
      },
    );
    limited.use(errorHandler);

    const started = await listen(limited);
    const tokenA = signAccessToken(10);
    const tokenB = signAccessToken(11);
    const post = (token: string) =>
      fetch(`${started.url}/api/students/17/marks`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ exam: 'unit-1', marks: [{ subject: 'maths', score: 40, maxScore: 50 }] }),
      });

    try {
      for (let attempt = 1; attempt <= max; attempt += 1) {
        expect((await post(tokenA)).status).toBe(201);
      }
      const blocked = await post(tokenA);
      expect(blocked.status).toBe(429);
      expect(await blocked.json()).toEqual({
        error: { message: 'Too many mark submissions for this account. Try again in 10 minutes.' },
      });
      expect((await post(tokenB)).status).toBe(201);
    } finally {
      await close(started.server);
    }
  });
});
