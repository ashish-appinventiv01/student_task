import { pool } from '../../../config/db';

export interface ClassAssignment {
  className: string;
  section: string;
}

export const findTeacherClasses = async (teacherUserId: number): Promise<ClassAssignment[]> => {
  const result = await pool.query<{ class_name: string; section: string }>(
    `SELECT class_name, section
     FROM teacher_classes
     WHERE teacher_user_id = $1
     ORDER BY class_name, section`,
    [teacherUserId],
  );
  return result.rows.map((row) => ({ className: row.class_name, section: row.section }));
};

export const findLinkedStudentId = async (userId: number): Promise<number | null> => {
  const result = await pool.query<{ student_id: number | null }>(
    'SELECT student_id FROM users WHERE id = $1',
    [userId],
  );
  return result.rows[0]?.student_id ?? null;
};
