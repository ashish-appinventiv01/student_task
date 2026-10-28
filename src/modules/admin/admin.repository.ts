import { pool } from '../../../config/db';
import { isRole, type Role } from '../../config/permissions';
import type { StudentLinkResponse, TeacherClassResponse } from './admin.dto';

export interface LinkedUser {
  id: number;
  role: Role;
  studentId: number | null;
}

interface UserLinkRow {
  id: number;
  role: string;
  student_id: number | null;
}

export const findUserById = async (id: number): Promise<LinkedUser | null> => {
  const result = await pool.query<UserLinkRow>('SELECT id, role, student_id FROM users WHERE id = $1', [id]);
  const row = result.rows[0];
  if (!row || !isRole(row.role)) return null;
  return { id: row.id, role: row.role, studentId: row.student_id };
};

export const findStudentById = async (id: number): Promise<{ id: number } | null> => {
  const result = await pool.query<{ id: number }>('SELECT id FROM students WHERE id = $1', [id]);
  return result.rows[0] ?? null;
};

export const insertTeacherClass = async (input: TeacherClassResponse): Promise<TeacherClassResponse> => {
  const result = await pool.query<{ teacher_user_id: number; class_name: string; section: string }>(
    `INSERT INTO teacher_classes (teacher_user_id, class_name, section)
     VALUES ($1, $2, $3)
     RETURNING teacher_user_id, class_name, section`,
    [input.teacherUserId, input.className, input.section],
  );
  const row = result.rows[0];
  if (!row) throw new Error('Failed to link teacher class');
  return { teacherUserId: row.teacher_user_id, className: row.class_name, section: row.section };
};

export const linkStudent = async (userId: number, studentId: number): Promise<StudentLinkResponse | null> => {
  const result = await pool.query<{ id: number; student_id: number }>(
    `UPDATE users SET student_id = $2
     WHERE id = $1 AND student_id IS NULL
     RETURNING id, student_id`,
    [userId, studentId],
  );
  const row = result.rows[0];
  if (!row) return null;
  return { userId: row.id, studentId: row.student_id };
};
