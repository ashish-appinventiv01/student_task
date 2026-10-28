import { z } from 'zod';
import { classNameBody, sectionSchema } from '../../utils/validators';

const positiveId = (label: string) =>
  z.number().int().positive({ error: `${label} must be a positive integer` });

export const teacherClassDto = z.strictObject({
  teacherUserId: positiveId('teacherUserId'),
  className: classNameBody,
  section: sectionSchema,
});
export type TeacherClassDto = z.infer<typeof teacherClassDto>;

export const studentLinkDto = z.strictObject({
  userId: positiveId('userId'),
  studentId: positiveId('studentId'),
});
export type StudentLinkDto = z.infer<typeof studentLinkDto>;

export interface TeacherClassResponse {
  teacherUserId: number;
  className: string;
  section: string;
}

export interface StudentLinkResponse {
  userId: number;
  studentId: number;
}
