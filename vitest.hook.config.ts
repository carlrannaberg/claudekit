import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

// Ultra-fast configuration specifically for hook testing
// This configuration is optimized for the Stop hook timeout constraint
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
  
  test: {
    globals: true,
    environment: 'node',
    
    // Minimal setup for maximum speed
    setupFiles: [], // Skip global setup for speed
    
    // Ultra-aggressive performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Use single thread for maximum speed
        isolate: false,
        useAtomics: true
      }
    },
    
    // Minimal file discovery
    include: [
      'tests/unit/typecheck-project.test.ts',
      'tests/unit/lint-project.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'tests/integration/**', // Always exclude integration tests
      '**/*.d.ts'
    ],
    
    // Aggressive timeouts
    testTimeout: 2000,
    hookTimeout: 1000,
    teardownTimeout: 100,
    
    // No file watching
    watch: false,
    
    // Ultra-minimal output
    reporters: ['dot'],
    silent: true,
    passWithNoTests: true,
    printConsoleTrace: false,
    hideSkippedTests: true,
    
    // No coverage for speed
    coverage: {
      enabled: false
    },
    
    // Optimize all dependencies
    deps: {
      optimizer: {
        web: {
          enabled: true,
          include: ['commander', 'picocolors', 'fs-extra', 'zod']
        },
        ssr: {
          enabled: true,
          include: ['commander', 'picocolors', 'fs-extra', 'zod']
        }
      }
    },
    
    server: {
      deps: {
        inline: true
      }
    }
  }
});