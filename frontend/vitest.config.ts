import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    include: ['lib/**/*.test.ts', 'components/**/*.test.tsx', 'app/**/*.test.ts', '*.test.ts'],
    setupFiles: ['./test/setup.ts'],
    testTimeout: 12000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      include: [
        'lib/trace.ts', 'lib/llm-session.ts', 'lib/demo.ts', 'lib/model.ts',
        'components/alignment-decision.tsx', 'components/alignment-scenario-replay.tsx',
        'app/api/reasoning/route.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
    },
  },
});
