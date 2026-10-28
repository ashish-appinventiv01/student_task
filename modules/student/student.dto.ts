import { z } from 'zod';
import {
  classNameBody,
  classNameQuery,
  dateOfBirthSchema,
  guardianPhone,
  guardianRelationSchema,
  pagination,
  personName,
  rollNoSchema,
  searchQuery,
  sectionSchema,
} from '../../src/utils/validators';
import type { GuardianRelation } from './student.interface';

export const guardianDto = z.strictObject({
  name: personName,
  phone: guardianPhone,
  relation: guardianRelationSchema,
});

export const createStudentDto = z.strictObject({
  rollNo: rollNoSchema,
  firstName: personName,
  lastName: personName,
  dateOfBirth: dateOfBirthSchema,
  className: classNameBody,
  section: sectionSchema,
  guardian: guardianDto,
});
export type CreateStudentDto = z.infer<typeof createStudentDto>;

export const updateStudentDto = z
  .strictObject({
    rollNo: rollNoSchema.optional(),
    firstName: personName.optional(),
    lastName: personName.optional(),
    dateOfBirth: dateOfBirthSchema.optional(),
    className: classNameBody.optional(),
    section: sectionSchema.optional(),
    guardian: guardianDto.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), {
    error: 'Provide at least one field to update',
  });
export type UpdateStudentDto = z.infer<typeof updateStudentDto>;

export const listStudentsQueryDto = pagination.extend({
  className: classNameQuery.optional(),
  section: sectionSchema.optional(),
  search: searchQuery,
});
export type ListStudentsQueryDto = z.infer<typeof listStudentsQueryDto>;

export interface StudentResponseDto {
  id: number;
  rollNo: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  className: string;
  section: string;
  guardian: {
    name: string;
    phone: string;
    relation: GuardianRelation;
  };
  createdAt: string;
  updatedAt: string;
}
