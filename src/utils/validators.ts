import { z } from 'zod';

const EXAM_VALUES = ['unit-1', 'midterm', 'unit-2', 'final'] as const;
const RELATION_VALUES = ['father', 'mother', 'guardian'] as const;

const forbiddenText = /[\u0000-\u001F\u007F<>]/;

const boundedQueryInt = (label: string, fallback: number, min: number, max: number) =>
  z
    .union([z.string(), z.undefined()])
    .optional()
    .transform((value, ctx) => {
      if (value === undefined || value === '') return fallback;
      if (!/^\d+$/.test(value)) {
        ctx.addIssue({ code: 'custom', message: `${label} must be an integer from ${min} to ${max}` });
        return z.NEVER;
      }
      const parsed = Number(value);
      if (parsed < min || parsed > max) {
        ctx.addIssue({ code: 'custom', message: `${label} must be an integer from ${min} to ${max}` });
        return z.NEVER;
      }
      return parsed;
    });

/** Query limit (1-100) and offset (>= 0). Unknown siblings are ignored by the object that extends this. */
export const pagination = z.object({
  limit: boundedQueryInt('limit', 20, 1, 100),
  offset: boundedQueryInt('offset', 0, 0, 1_000_000),
});

export const idParam = z.object({
  id: z.coerce.number().int().positive({ error: 'id must be a positive integer' }),
});
export type IdParam = z.infer<typeof idParam>;

export const personName = z
  .string()
  .trim()
  .normalize('NFC')
  .min(1, { error: 'Name is required' })
  .max(100, { error: 'Name must be at most 100 characters' })
  .refine((value) => !forbiddenText.test(value), { error: 'Text contains characters that are not allowed' })
  .regex(/^[\p{L}][\p{L}\s.'-]*$/u, { error: 'Name contains characters that are not allowed' });

/** Lowercase slug used for mark subjects, for example "maths" or "social-science". */
export const tag = z
  .string()
  .trim()
  .normalize('NFC')
  .toLowerCase()
  .min(1, { error: 'subject is required' })
  .max(50, { error: 'subject must be at most 50 characters' })
  .refine((value) => !forbiddenText.test(value), { error: 'Text contains characters that are not allowed' })
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'subject must be a lowercase slug such as maths' });

export const examSchema = z.enum(EXAM_VALUES);

export const classNameQuery = z
  .string()
  .trim()
  .regex(/^(?:[1-9]|1[0-2])$/, { error: 'className must be from 1 to 12' });

export const classNameBody = z
  .union([
    z
      .string()
      .trim()
      .regex(/^(?:[1-9]|1[0-2])$/, { error: 'className must be from 1 to 12' }),
    z.number().int().min(1).max(12, { error: 'className must be from 1 to 12' }),
  ])
  .transform((value) => String(value));

export const sectionSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .toUpperCase()
  .regex(/^[A-F]$/, { error: 'section must be a letter from A to F' });

export const rollNoSchema = z
  .string()
  .trim()
  .normalize('NFC')
  .toUpperCase()
  .regex(/^\d{4}-\d{1,2}[A-F]-\d{3}$/, { error: 'rollNo must look like 2026-10A-017' });

export const guardianPhone = z
  .string()
  .trim()
  .normalize('NFC')
  .transform((value) => value.replace(/[\s-]/g, ''))
  .refine((value) => /^\+[1-9]\d{7,14}$/.test(value), {
    error: 'Phone must be E.164, for example +919876543210',
  });

export const guardianRelationSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.enum(RELATION_VALUES, { error: 'relation must be father, mother, or guardian' }));

const realDate = (value: string): Date | undefined => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return undefined;
  return date;
};

const ageInYears = (birth: Date, today = new Date()): number => {
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1;
  return age;
};

export const dateOfBirthSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'dateOfBirth must be YYYY-MM-DD' })
  .refine((value) => realDate(value) !== undefined, { error: 'dateOfBirth must be a real date' })
  .refine((value) => {
    const date = realDate(value);
    if (!date) return true;
    const age = ageInYears(date);
    return age >= 3 && age <= 25;
  }, { error: 'Student must be between 3 and 25 years old' });

const hasAtMostTwoDecimals = (value: number): boolean =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

export const scoreSchema = z
  .number()
  .finite()
  .min(0, { error: 'score must be at least 0' })
  .refine(hasAtMostTwoDecimals, { error: 'score must have at most 2 decimal places' });

export const maxScoreSchema = z
  .number()
  .finite()
  .min(1, { error: 'maxScore must be at least 1' })
  .max(200, { error: 'maxScore must be at most 200' })
  .refine(hasAtMostTwoDecimals, { error: 'maxScore must have at most 2 decimal places' });

export const searchQuery = z
  .string()
  .trim()
  .normalize('NFC')
  .refine((value) => !forbiddenText.test(value), { error: 'search contains characters that are not allowed' })
  .optional()
  .transform((value) => (value ? value : undefined));

/** Escapes `\`, `%`, and `_` so a search string is matched literally by ILIKE. */
export const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (char) => `\\${char}`);

export const formatDateOnly = (value: Date): string => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const toDateOnly = (value: Date | string): Date => {
  if (value instanceof Date) return value;
  const date = realDate(value);
  if (!date) throw new Error(`Invalid date column value "${value}"`);
  return date;
};

export const toNumeric = (value: string): number => {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error(`Invalid numeric column value "${value}"`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric column value "${value}"`);
  return parsed;
};
