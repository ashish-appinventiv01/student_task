import { pool } from '../../../config/db';
import { conflict } from '../../../errors/AppError';
import { postgresErrorCode } from '../../../errors/pg';
import { escapeLike, toDateOnly } from '../../utils/validators';
import type {
  GuardianRelation,
  Student,
  StudentChanges,
  StudentRow,
  StudentWritableColumns,
} from './student.interface';

const STUDENT_COLUMNS = `id, roll_no, first_name, last_name, date_of_birth, class_name, section,
  guardian_name, guardian_phone, guardian_relation, created_at, updated_at`;

const WRITABLE_COLUMNS = [
  'roll_no',
  'first_name',
  'last_name',
  'date_of_birth',
  'class_name',
  'section',
  'guardian_name',
  'guardian_phone',
  'guardian_relation',
] as const satisfies readonly (keyof StudentWritableColumns)[];

const toGuardianRelation = (value: string): GuardianRelation => {
  if (value === 'father' || value === 'mother' || value === 'guardian') return value;
  throw new Error(`Unknown guardian_relation "${value}"`);
};

export const toDomain = (row: StudentRow): Student => ({
  id: row.id,
  rollNo: row.roll_no,
  firstName: row.first_name,
  lastName: row.last_name,
  dateOfBirth: toDateOnly(row.date_of_birth),
  className: row.class_name,
  section: row.section,
  guardian: {
    name: row.guardian_name,
    phone: row.guardian_phone,
    relation: toGuardianRelation(row.guardian_relation),
  },
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

export const toPersistence = (changes: StudentChanges): StudentWritableColumns => {
  const columns: StudentWritableColumns = {};
  if (changes.rollNo !== undefined) columns.roll_no = changes.rollNo;
  if (changes.firstName !== undefined) columns.first_name = changes.firstName;
  if (changes.lastName !== undefined) columns.last_name = changes.lastName;
  if (changes.dateOfBirth !== undefined) columns.date_of_birth = changes.dateOfBirth;
  if (changes.className !== undefined) columns.class_name = changes.className;
  if (changes.section !== undefined) columns.section = changes.section;
  if (changes.guardian !== undefined) {
    columns.guardian_name = changes.guardian.name;
    columns.guardian_phone = changes.guardian.phone;
    columns.guardian_relation = changes.guardian.relation;
  }
  return columns;
};

const firstStudent = (rows: StudentRow[]): Student | null => {
  const row = rows[0];
  return row ? toDomain(row) : null;
};

const rethrowStudentWrite = (err: unknown): never => {
  if (postgresErrorCode(err) === '23505') throw conflict('A student with that roll number already exists');
  throw err;
};

export interface StudentListFilter {
  className?: string;
  section?: string;
  search?: string;
  limit: number;
  offset: number;
  /** When set, only these class/section pairs are visible. An empty list matches nothing. */
  classes?: { className: string; section: string }[];
  /** Own-record scope. null means the account is not linked, so the list is empty. */
  studentId?: number | null;
}

export const findMany = async (filter: StudentListFilter): Promise<Student[]> => {
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter.className !== undefined) {
    values.push(filter.className);
    conditions.push(`class_name = $${values.length}`);
  }
  if (filter.section !== undefined) {
    values.push(filter.section);
    conditions.push(`section = $${values.length}`);
  }
  if (filter.search !== undefined) {
    values.push(`%${escapeLike(filter.search)}%`);
    const pattern = `$${values.length}`;
    conditions.push(
      `(roll_no ILIKE ${pattern} ESCAPE E'\\\\' OR first_name ILIKE ${pattern} ESCAPE E'\\\\' OR last_name ILIKE ${pattern} ESCAPE E'\\\\')`,
    );
  }
  if (filter.classes !== undefined) {
    if (filter.classes.length === 0) {
      conditions.push('FALSE');
    } else {
      const pairs = filter.classes.map((entry) => {
        values.push(entry.className, entry.section);
        const sectionParam = values.length;
        const classParam = sectionParam - 1;
        return `(class_name = $${classParam} AND section = $${sectionParam})`;
      });
      conditions.push(`(${pairs.join(' OR ')})`);
    }
  }
  if (filter.studentId !== undefined) {
    if (filter.studentId === null) {
      conditions.push('FALSE');
    } else {
      values.push(filter.studentId);
      conditions.push(`id = $${values.length}`);
    }
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(filter.limit);
  const limit = `$${values.length}`;
  values.push(filter.offset);
  const offset = `$${values.length}`;

  const result = await pool.query<StudentRow>(
    `SELECT ${STUDENT_COLUMNS} FROM students ${where} ORDER BY id LIMIT ${limit} OFFSET ${offset}`,
    values,
  );
  return result.rows.map(toDomain);
};

export const findById = async (id: number): Promise<Student | null> => {
  const result = await pool.query<StudentRow>(`SELECT ${STUDENT_COLUMNS} FROM students WHERE id = $1`, [id]);
  return firstStudent(result.rows);
};

const columnValue = (columns: StudentWritableColumns, key: keyof StudentWritableColumns): unknown => columns[key];

export const insert = async (changes: StudentChanges): Promise<Student> => {
  const columns = toPersistence(changes);
  try {
    const result = await pool.query<StudentRow>(
      `INSERT INTO students (
        roll_no, first_name, last_name, date_of_birth, class_name, section,
        guardian_name, guardian_phone, guardian_relation
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING ${STUDENT_COLUMNS}`,
      [
        columnValue(columns, 'roll_no'),
        columnValue(columns, 'first_name'),
        columnValue(columns, 'last_name'),
        columnValue(columns, 'date_of_birth'),
        columnValue(columns, 'class_name'),
        columnValue(columns, 'section'),
        columnValue(columns, 'guardian_name'),
        columnValue(columns, 'guardian_phone'),
        columnValue(columns, 'guardian_relation'),
      ],
    );
    const created = firstStudent(result.rows);
    if (!created) throw new Error('Failed to create student');
    return created;
  } catch (err) {
    throw rethrowStudentWrite(err);
  }
};

export const update = async (id: number, changes: StudentChanges): Promise<Student | null> => {
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
    const result = await pool.query<StudentRow>(
      `UPDATE students SET ${assignments.join(', ')} WHERE id = $${values.length} RETURNING ${STUDENT_COLUMNS}`,
      values,
    );
    return firstStudent(result.rows);
  } catch (err) {
    throw rethrowStudentWrite(err);
  }
};

export const remove = async (id: number): Promise<boolean> => {
  const result = await pool.query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
  return result.rows.length > 0;
};
