import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
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
        'src/cli.ts' // CLI entry point, tested via integration
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85
        },
        // Lower thresholds for command files due to CLI interaction complexity
        'src/commands/**/*.ts': {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      },
      all: true,
      include: ['src/**/*.ts'],
      watermarks: {
        statements: [70, 85],
        functions: [70, 85],
        branches: [70, 85],
        lines: [70, 85]
      }
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'coverage'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    // Enable file watching in development
    watch: process.env['CI'] === undefined,
    // Parallel testing for faster execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true
      }
    },
    // Better error reporting
    reporters: process.env['CI'] !== undefined ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: './coverage/junit.xml'
    }
  },
  resolve: {
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json']
  }
});