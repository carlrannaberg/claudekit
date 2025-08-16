import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { InlineConfig } from 'vitest';

const testConfig: InlineConfig = {
  globals: true,
  environment: 'node',
  setupFiles: ['./tests/setup.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    exclude: [
      'node_modules/',
      'dist/',
      'bin/',
      '**/*.d.ts',
      '**/*.config.*',
      '**/mockData.ts',
      'tests/**',
      'coverage/**',
      'cli/cli.ts' // CLI entry point, tested via integration
    ],
    thresholds: {
      global: {
        branches: 70,
        functions: 65,
        lines: 70,
        statements: 70
      },
      // Lower thresholds for command files due to CLI interaction complexity
      'cli/commands/**/*.ts': {
        branches: 40,
        functions: 10,
        lines: 21,
        statements: 21
      }
    },
    all: true,
    include: ['cli/**/*.ts'],
    watermarks: {
      statements: [70, 85],
      functions: [70, 85],
      branches: [70, 85],
      lines: [70, 85]
    }
  },
  include: ['tests/**/*.test.ts'],
  exclude: [
    'node_modules', 
    'dist', 
    'coverage'
  ],
  testTimeout: 10000,
  hookTimeout: 10000,
  teardownTimeout: 5000,
  // Enable file watching in development
  watch: process.env['CI'] === undefined,
  // Use forks pool for better module resolution compatibility
  pool: 'forks',
  poolOptions: {
    forks: {
      singleFork: false,
      isolate: true
    }
  },
  // Minimal output by default - only show failures and summary
  // Use VERBOSE_TESTS env var to get full output
  reporters: ((): Array<string | [string, Record<string, unknown>]> => {
    if (process.env['CI'] !== undefined) {
      return ['default', 'junit'];
    }
    if (process.env['VERBOSE_TESTS'] === 'true') {
      return ['verbose'];
    }
    // Minimal output - show only file-level results, not individual tests
    return ['dot'];
  })(),
  // Minimal output settings - suppress stdout from tests in minimal mode
  silent: process.env['VERBOSE_TESTS'] === 'true' ? false : 'passed-only', // Only show logs from failing tests
  passWithNoTests: true,
  // Hide stdout from tests in minimal mode, show in verbose or on failure
  printConsoleTrace: process.env['VERBOSE_TESTS'] === 'true',
  // Only show stdout/stderr on test failure in minimal mode
  hideSkippedTests: process.env['VERBOSE_TESTS'] !== 'true'
};

// Add outputFile only when in CI environment
if (process.env['CI'] !== undefined) {
  testConfig.outputFile = {
    junit: './coverage/junit.xml'
  };
}


export default defineConfig({
  plugins: [tsconfigPaths({ 
    root: './',
    projects: ['./tsconfig.json']
  })],
  resolve: {
    alias: {
      '@tests': new globalThis.URL('./tests', import.meta.url).pathname
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  },
  test: testConfig
});