import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths({ 
    root: './',
    projects: ['./tsconfig.json']
  })],
  resolve: {
    alias: {
      '@tests': new globalThis.URL('./tests', import.meta.url).pathname,
    },
    extensions: ['.mjs', '.js', '.mts', '.ts', '.jsx', '.tsx', '.json'],
    // Allow TypeScript files to be imported without extension
    mainFields: ['module', 'main']
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // deps: {
    //   registerNodeLoader: true,
    // },
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
    // Better error reporting
    reporters: process.env['CI'] !== undefined ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: './coverage/junit.xml'
    }
  }
});