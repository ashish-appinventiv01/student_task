import { describe, expect, it } from 'vitest';
import { toDomain as toMark, toPersistence as toMarkPersistence } from '../modules/mark/mark.repository';
import type { MarkRow } from '../modules/mark/mark.interface';
import { toDomain as toStudent, toPersistence as toStudentPersistence } from '../modules/student/student.repository';
import type { StudentRow } from '../modules/student/student.interface';
import type { CreateStudentDto } from '../modules/student/student.dto';

const studentRow = (overrides: Partial<StudentRow> = {}): StudentRow => ({
  id: 7,
  roll_no: '2026-10A-017',
  first_name: 'Asha',
  last_name: 'Rao',
  date_of_birth: '2010-04-12',
  class_name: '10',
  section: 'A',
  guardian_name: 'Ravi Rao',
  guardian_phone: '+919876543210',
  guardian_relation: 'father',
  created_at: new Date('2026-04-01T00:00:00.000Z'),
  updated_at: new Date('2026-04-02T00:00:00.000Z'),
  ...overrides,
});

describe('row mapping', () => {
  it('nests the flat guardian columns', () => {
    const student = toStudent(studentRow());
    expect(student.guardian).toEqual({
      name: 'Ravi Rao',
      phone: '+919876543210',
      relation: 'father',
    });
    expect(student.rollNo).toBe('2026-10A-017');
    expect(student.dateOfBirth.getFullYear()).toBe(2010);
    expect(student.dateOfBirth.getMonth()).toBe(3);
    expect(student.dateOfBirth.getDate()).toBe(12);
  });

  it('flattens a guardian into persistence columns', () => {
    const dto: CreateStudentDto = {
      rollNo: '2026-10A-017',
      firstName: 'Asha',
      lastName: 'Rao',
      dateOfBirth: '2010-04-12',
      className: '10',
      section: 'A',
      guardian: { name: 'Ravi Rao', phone: '+919876543210', relation: 'father' },
    };
    expect(toStudentPersistence(dto)).toMatchObject({
      guardian_name: 'Ravi Rao',
      guardian_phone: '+919876543210',
      guardian_relation: 'father',
      roll_no: '2026-10A-017',
    });
  });

  it('converts numeric strings from Postgres into numbers', () => {
    const row: MarkRow = {
      id: 3,
      student_id: 7,
      exam: 'midterm',
      subject: 'maths',
      score: '78.50',
      max_score: '100.00',
      created_at: new Date('2026-09-01T00:00:00.000Z'),
      updated_at: new Date('2026-09-01T00:00:00.000Z'),
    };
    const mark = toMark(row);
    expect(mark.score).toBe(78.5);
    expect(mark.maxScore).toBe(100);
    expect(mark.studentId).toBe(7);
    expect(toMarkPersistence({ exam: 'final', subject: 'english', score: 41.25, maxScore: 50 })).toEqual({
      exam: 'final',
      subject: 'english',
      score: 41.25,
      max_score: 50,
    });
  });
});
