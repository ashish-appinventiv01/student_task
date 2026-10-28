import { describe, expect, it } from 'vitest';
import { validateConfig } from '../src/config/env';

const validConfig = {
  PASS_PERCENTAGE: '33.5',
  ACADEMIC_YEAR: '2026-27',
};

describe('validateConfig', () => {
  it('says PASS_PERCENTAGE is required but missing', () => {
    expect(() => validateConfig({ ACADEMIC_YEAR: '2026-27' })).toThrow(/PASS_PERCENTAGE is required but missing/);
  });

  it('rejects an empty PASS_PERCENTAGE', () => {
    expect(() => validateConfig({ ...validConfig, PASS_PERCENTAGE: '' })).toThrowError(
      /^PASS_PERCENTAGE is required but missing$/,
    );
  });

  it('rejects a non-numeric PASS_PERCENTAGE', () => {
    expect(() => validateConfig({ ...validConfig, PASS_PERCENTAGE: 'abc' })).toThrowError(
      /^PASS_PERCENTAGE must be a number \(received "abc"\)$/,
    );
  });

  it('rejects a PASS_PERCENTAGE above 100', () => {
    expect(() => validateConfig({ ...validConfig, PASS_PERCENTAGE: '150' })).toThrowError(
      /^PASS_PERCENTAGE must be between 0 and 100 \(received "150"\)$/,
    );
  });

  it('rejects an academic year that is not YYYY-YY', () => {
    expect(() => validateConfig({ ...validConfig, ACADEMIC_YEAR: '26-27' })).toThrowError(
      /^ACADEMIC_YEAR must use YYYY-YY format \(received "26-27"\)$/,
    );
  });

  it('rejects an academic year whose second year does not follow the first', () => {
    expect(() => validateConfig({ ...validConfig, ACADEMIC_YEAR: '2026-28' })).toThrowError(
      /^ACADEMIC_YEAR: second year must follow the first \(received "2026-28"\)$/,
    );
  });

  it('parses a valid PASS_PERCENTAGE to a number', () => {
    const config = validateConfig(validConfig);
    expect(config.PASS_PERCENTAGE).toBe(33.5);
    expect(config.ACADEMIC_YEAR).toBe('2026-27');
  });

  it('accepts a century rollover', () => {
    expect(validateConfig({ ...validConfig, ACADEMIC_YEAR: '1999-00' }).ACADEMIC_YEAR).toBe('1999-00');
  });
});
