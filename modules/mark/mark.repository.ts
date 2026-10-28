import { pool } from '../../config/db';
import { badRequest, conflict, notFound } from '../../errors/AppError';
import { postgresErrorCode } from '../../errors/pg';
import { toNumeric } from '../../src/utils/validators';
import type {
  Exam,
  Mark,
  MarkChanges,
  MarkRow,
  MarkWritableColumns,
  SubjectAverage,
  SubjectAverageFilter,
} from './mark.interface';

const MARK_COLUMNS = 'id, student_id, exam, subject, score, max_score, created_at, updated_at';

const WRITABLE_COLUMNS = ['exam', 'subject', 'score', 'max_score'] as const satisfies readonly (keyof MarkWritableColumns)[];

export const toDomain = (row: MarkRow): Mark => ({
  id: row.id,
  studentId: row.student_id,
  exam: row.exam,
  subject: row.subject,
  score: toNumeric(row.score),
  maxScore: toNumeric(row.max_score),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const toPersistence = (changes: MarkChanges): MarkWritableColumns => {
  const columns: MarkWritableColumns = {};
  if (changes.exam !== undefined) columns.exam = changes.exam;
  if (changes.subject !== undefined) columns.subject = changes.subject;
  if (changes.score !== undefined) columns.score = changes.score;
  if (changes.maxScore !== undefined) columns.max_score = changes.maxScore;
  return columns;
};

const firstMark = (rows: MarkRow[]): Mark | null => {
  const row = rows[0];
  return row ? toDomain(row) : null;
};

const rethrowMarkWrite = (err: unknown, studentId?: number): never => {
  const code = postgresErrorCode(err);
  if (code === '23503') {
    throw notFound(studentId === undefined ? 'Student not found' : `Student ${studentId} not found`);
  }
  if (code === '23505') throw conflict('A mark for that exam and subject already exists');
  if (code === '23514') throw badRequest('score cannot be greater than maxScore');
  throw err;
};

export interface NewMark {
  subject: string;
  score: number;
  maxScore: number;
}

export const findById = async (id: number): Promise<Mark | null> => {
  const result = await pool.query<MarkRow>(`SELECT ${MARK_COLUMNS} FROM marks WHERE id = $1`, [id]);
  return firstMark(result.rows);
};

export const insertMany = async (studentId: number, exam: Exam, marks: NewMark[]): Promise<Mark[]> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const created: Mark[] = [];
    for (const mark of marks) {
      const columns = toPersistence({ exam, subject: mark.subject, score: mark.score, maxScore: mark.maxScore });
      const result = await client.query<MarkRow>(
        `INSERT INTO marks (student_id, exam, subject, score, max_score)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING ${MARK_COLUMNS}`,
        [studentId, columns.exam, columns.subject, columns.score, columns.max_score],
      );
      const row = result.rows[0];
      if (!row) throw new Error('Failed to create mark');
      created.push(toDomain(row));
    }
    await client.query('COMMIT');
    return created;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Keep the original write error.
    }
    throw rethrowMarkWrite(err, studentId);
  } finally {
    client.release();
  }
};

export const update = async (id: number, changes: MarkChanges): Promise<Mark | null> => {
  const columns = toPersistence(changes);
  const assignments: string[] = [];
  const values: unknown[] = [];

  for (const column of WRITABLE_COLUMNS) {
    const value = columns[column];
    if (value === undefined) continue;
    values.push(value);
    assignments.push(`${column} = $${values.length}`);
  }
  assignments.push('updated_at = NOW()');
  values.push(id);

  try {
    const result = await pool.query<MarkRow>(
      `UPDATE marks SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${MARK_COLUMNS}`,
      values,
    );
    return firstMark(result.rows);
  } catch (err) {
    throw rethrowMarkWrite(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM marks WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};

interface SubjectAverageRow {
  subject: string;
  average_percentage: string;
  students: number;
}

export const subjectAverages = async (filter: SubjectAverageFilter): Promise<SubjectAverage[]> => {
  const result = await pool.query<SubjectAverageRow>(
    `SELECT m.subject,
            AVG(m.score / m.max_score * 100) AS average_percentage,
            COUNT(DISTINCT m.student_id)::int AS students
     FROM marks m
     INNER JOIN students s ON s.id = m.student_id
     WHERE s.class_name = $1
       AND ($2::varchar IS NULL OR m.exam = $2)
       AND ($3::varchar IS NULL OR s.section = $3)
     GROUP BY m.subject
     ORDER BY m.subject`,
    [filter.className, filter.exam ?? null, filter.section ?? null],
  );

  return result.rows.map((row) => ({
    subject: row.subject,
    averagePercentage: toNumeric(String(row.average_percentage)),
    students: row.students,
  }));
};
