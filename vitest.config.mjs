import { defineConfig } from 'vitest/config';

// Only this repository's tests: CI checks out the tool into .tool/, which has its own.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
