import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const decimalNumber = /^(?:\d+)(?:\.\d+)?$/;
const academicYearFormat = /^(\d{4})-(\d{2})$/;

const missing = (name: string): string => `${name} is required but missing`;

const requiredString = (name: string) =>
  z.string({
    error: (issue) =>
      issue.input === undefined || issue.input === null
        ? missing(name)
        : `${name} is invalid (received ${JSON.stringify(issue.input)})`,
  });

const withDefault = (fallback: string) =>
  z.preprocess((value) => (value === undefined || value === null || value === '' ? fallback : value), z.string());

const portWithDefault = (name: string, fallback: number) =>
  z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? fallback : value),
    z.coerce.number().int().positive({ error: `${name} must be a positive integer` }),
  );

const passPercentageSchema = requiredString('PASS_PERCENTAGE')
  .trim()
  .min(1, { error: missing('PASS_PERCENTAGE') })
  .refine((value) => value.length === 0 || decimalNumber.test(value), {
    error: (issue) => `PASS_PERCENTAGE must be a number (received "${String(issue.input)}")`,
  })
  .refine((value) => {
    if (!decimalNumber.test(value)) return true;
    const parsed = Number(value);
    return parsed >= 0 && parsed <= 100;
  }, {
    error: (issue) => `PASS_PERCENTAGE must be between 0 and 100 (received "${String(issue.input)}")`,
  })
  .transform((value) => Number(value));

const academicYearSchema = requiredString('ACADEMIC_YEAR')
  .trim()
  .min(1, { error: missing('ACADEMIC_YEAR') })
  .refine((value) => value.length === 0 || academicYearFormat.test(value), {
    error: (issue) => `ACADEMIC_YEAR must use YYYY-YY format (received "${String(issue.input)}")`,
  })
  .refine((value) => {
    const match = academicYearFormat.exec(value);
    if (!match) return true;
    const startYear = Number(match[1]);
    const endYear = Number(match[2]);
    return endYear === (startYear + 1) % 100;
  }, {
    error: (issue) => `ACADEMIC_YEAR: second year must follow the first (received "${String(issue.input)}")`,
  });

const envSchema = z.object({
  NODE_ENV: withDefault('development'),
  PORT: portWithDefault('PORT', 3000),
  DB_HOST: withDefault('localhost'),
  DB_PORT: portWithDefault('DB_PORT', 5432),
  DB_USER: withDefault('postgres'),
  DB_PASSWORD: z.preprocess((value) => (value === undefined || value === null ? 'postgres' : value), z.string()),
  DB_NAME: withDefault('postgres'),
  PASS_PERCENTAGE: passPercentageSchema,
  ACADEMIC_YEAR: academicYearSchema,
});

export type AppConfig = z.infer<typeof envSchema>;

const formatIssue = (path: PropertyKey | undefined, message: string): string => {
  const name = typeof path === 'string' ? path : 'config';
  return message.includes(name) ? message : `${name}: ${message}`;
};

/** Parses env input with the config schema. Throws one error whose message names each bad variable. */
export const validateConfig = (source: unknown): AppConfig => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => formatIssue(issue.path[0], issue.message))
      .join('\n');
    throw new Error(message);
  }
  return result.data;
};

const loadConfig = (): AppConfig => {
  try {
    return validateConfig(process.env);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
};

export const env = loadConfig();

export const isProduction = env.NODE_ENV === 'production';
