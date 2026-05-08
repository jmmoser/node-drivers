import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
  },
});
