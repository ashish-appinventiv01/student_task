import { describe, expect, it } from 'vitest';
import { createMarksDto } from '../modules/mark/mark.dto';
import { toAverageDto } from '../modules/mark/mark.service';
import { createStudentDto, listStudentsQueryDto } from '../modules/student/student.dto';
import { assertSafePayload } from '../middlewares/rejectDangerousPayload';

const student = {
  rollNo: '2026-10A-017',
  firstName: 'Asha',
  lastName: 'Rao',
  dateOfBirth: '2010-04-12',
  className: '10',
  section: 'A',
  guardian: { name: 'Ravi Rao', phone: '+919876543210', relation: 'father' },
};

describe('request validation', () => {
  it('coerces limit and offset to numbers', () => {
    expect(listStudentsQueryDto.parse({ className: '10', section: 'a', limit: '5', offset: '0' })).toMatchObject({
      className: '10',
      section: 'A',
      limit: 5,
      offset: 0,
    });
  });

  it('accepts a student whose roll number matches class and section', () => {
    expect(createStudentDto.parse(student).rollNo).toBe('2026-10A-017');
  });

  it('rejects a guardian phone that is not E.164', () => {
    expect(() =>
      createStudentDto.parse({ ...student, guardian: { ...student.guardian, phone: '9876543210' } }),
    ).toThrow(/E\.164/);
  });

  it('rejects a score above maxScore', () => {
    expect(() =>
      createMarksDto.parse({ exam: 'final', marks: [{ subject: 'maths', score: 120, maxScore: 100 }] }),
    ).toThrow(/score cannot be greater than maxScore/);
  });

  it('stores the subject as a lowercase slug', () => {
    expect(
      createMarksDto.parse({ exam: 'unit-1', marks: [{ subject: 'Social-Science', score: 40.5, maxScore: 50 }] }).marks[0]
        ?.subject,
    ).toBe('social-science');
  });

  it('rejects prototype pollution and null bytes', () => {
    expect(() => assertSafePayload(JSON.parse('{"__proto__":{"admin":true}}'))).toThrow(/forbidden field/);
    expect(() => assertSafePayload({ name: 'Asha\0Rao' })).toThrow(/null byte/);
  });
});

describe('subject pass and fail', () => {
  it('passes an average equal to PASS_PERCENTAGE and fails one below it', () => {
    expect(toAverageDto({ subject: 'maths', averagePercentage: 33.5, students: 1 }, 33.5).passed).toBe(true);
    expect(toAverageDto({ subject: 'english', averagePercentage: 33.49, students: 2 }, 33.5).passed).toBe(false);
  });
});
