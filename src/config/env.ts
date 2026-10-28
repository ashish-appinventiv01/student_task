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

const fullUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.host.length > 0;
  } catch {
    return false;
  }
};

const marksRateLimitMax = z.preprocess(
  (value) => (value === undefined || value === null || value === '' ? '60' : value),
  z
    .string({ error: 'MARKS_RATE_LIMIT_MAX must be a positive integer' })
    .trim()
    .regex(/^[1-9]\d*$/, { error: 'MARKS_RATE_LIMIT_MAX must be a positive integer' })
    .transform((value) => Number(value)),
);

const corsOriginsSchema = z.preprocess(
  (value) => (value === undefined || value === null || value === '' ? 'http://localhost:3000' : value),
  z
    .string({ error: 'CORS_ORIGINS must be a full URL' })
    .superRefine((value, ctx) => {
      const origins = value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0);
      if (origins.some((origin) => origin === '*')) {
        ctx.addIssue({
          code: 'custom',
          message:
            'CORS_ORIGINS must not be "*": allowing every origin lets any website read this API from a user\'s browser',
        });
        return;
      }
      for (const origin of origins) {
        if (!fullUrl(origin)) {
          ctx.addIssue({
            code: 'custom',
            message: `CORS_ORIGINS must be a full URL (received ${JSON.stringify(origin)})`,
          });
        }
      }
    })
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
    ),
);

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
  JWT_SECRET: withDefault('dev-access-token-secret'),
  MARKS_RATE_LIMIT_MAX: marksRateLimitMax,
  CORS_ORIGINS: corsOriginsSchema,
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
