import { z } from 'zod';
import {
  classNameQuery,
  examSchema,
  maxScoreSchema,
  scoreSchema,
  sectionSchema,
  tag,
} from '../../utils/validators';
import type { Exam } from './mark.interface';

const markItemDto = z.strictObject({
  subject: tag,
  score: scoreSchema,
  maxScore: maxScoreSchema.default(100),
});

export const createMarksDto = z
  .strictObject({
    exam: examSchema,
    marks: z
      .array(markItemDto)
      .min(1, { error: 'marks must contain at least 1 item' })
      .max(15, { error: 'marks must contain at most 15 items' }),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.marks.forEach((mark, index) => {
      if (mark.score > mark.maxScore) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks', index, 'score'],
          message: 'score cannot be greater than maxScore',
        });
      }
      if (seen.has(mark.subject)) {
        ctx.addIssue({
          code: 'custom',
          path: ['marks'],
          message: 'subjects must be unique',
        });
      }
      seen.add(mark.subject);
    });
  });
export type CreateMarksDto = z.infer<typeof createMarksDto>;

export const updateMarkDto = z
  .strictObject({
    score: scoreSchema.optional(),
    maxScore: maxScoreSchema.optional(),
  })
  .refine((body) => body.score !== undefined || body.maxScore !== undefined, {
    error: 'Provide at least one field to update',
  });
export type UpdateMarkDto = z.infer<typeof updateMarkDto>;

/** Merged with the stored row in the service. The request DTO cannot see that row. */
export const mergedMarkScore = z
  .object({
    score: scoreSchema,
    maxScore: maxScoreSchema,
  })
  .refine((value) => value.score <= value.maxScore, {
    path: ['score'],
    error: 'score cannot be greater than maxScore',
  });

export const averagesQueryDto = z.object({
  className: classNameQuery,
  exam: examSchema.optional(),
  section: sectionSchema.optional(),
});
export type AveragesQueryDto = z.infer<typeof averagesQueryDto>;

export interface MarkResponseDto {
  id: number;
  studentId: number;
  exam: Exam;
  subject: string;
  score: number;
  maxScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectAverageResponseDto {
  subject: string;
  averagePercentage: number;
  students: number;
  passed: boolean;
}
