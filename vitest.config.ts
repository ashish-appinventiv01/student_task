import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      PASS_PERCENTAGE: '40',
      ACADEMIC_YEAR: '2026-27',
    },
  },
});
