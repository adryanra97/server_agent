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
        'components/access-roles.tsx', 'components/trace-preview.tsx',
        'components/demo-login.tsx',
        'app/api/reasoning/route.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      // Enforce 100% on each included production module, not only the aggregate.
      // Explicitly report the module count: this is not whole-application coverage.
      // Coverage files are explicitly listed above; do not confuse with whole-app coverage.
      thresholds: { perFile: true, lines: 100, statements: 100, branches: 100, functions: 100 },
    },
  },
});
