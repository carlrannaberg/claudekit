# Vitest Testing Framework Expert Research

## Overview

This document provides comprehensive research and expertise content for Vitest testing framework, focusing on configuration, Vite integration, Jest migration, modern JavaScript features, and performance optimization patterns.

## Scope and Boundaries

**One-sentence scope**: "Vitest configuration, Vite integration, modern testing patterns, ESM support, and Jest migration strategies"

**Primary focus areas**: Vitest as a next-generation testing framework powered by Vite, offering Jest compatibility, modern JavaScript support, and enhanced developer experience.

## Core Expertise Areas

### 1. Vite Integration & Configuration

#### Basic Configuration
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Basic test configuration
    include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
    exclude: ['**/node_modules/**', '**/.git/**'],
    environment: 'node',
    globals: true,
  },
})
```

#### Advanced Configuration Patterns
- **Pool Configuration**: Choose between `threads`, `forks`, or `vmThreads` for optimal performance
- **Dependency Optimization**: Enable dependency bundling for improved test performance
- **Transform Mode**: Configure module transformation for SSR vs. browser environments

### 2. Jest Migration & Compatibility

#### API Compatibility
Vitest aims for Jest API compatibility with key differences:
- Test name formatting: Vitest uses `>` separator vs Jest's space
- Mock behavior: `mockReset()` restores original implementation in Vitest vs empty function in Jest
- Type imports: Direct imports from 'vitest' package instead of Jest namespace

#### Migration Patterns
```typescript
// Jest → Vitest migration examples

// Timeout configuration
jest.setTimeout(5_000) // ❌ Jest
vi.setConfig({ testTimeout: 5_000 }) // ✅ Vitest

// Type imports
let fn: jest.Mock<(name: string) => number> // ❌ Jest
import type { Mock } from 'vitest'
let fn: Mock<(name: string) => number> // ✅ Vitest

// Module mocking
jest.mock('./module', () => 'hello') // ❌ Jest
vi.mock('./module', () => ({ default: 'hello' })) // ✅ Vitest

// Importing actual modules
const { cloneDeep } = jest.requireActual('lodash/cloneDeep') // ❌ Jest
const { cloneDeep } = await vi.importActual('lodash/cloneDeep') // ✅ Vitest
```

### 3. Browser Mode Testing

#### Basic Browser Configuration
```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright', // or 'webdriverio'
      instances: [
        { browser: 'chromium' },
        { browser: 'firefox' },
        { browser: 'webkit' },
      ],
      headless: true,
    },
  },
})
```

#### Multi-Browser Testing
```typescript
export default defineConfig({
  test: {
    browser: {
      provider: 'playwright',
      instances: [
        {
          browser: 'chromium',
          launch: { devtools: true },
        },
        {
          browser: 'firefox',
          setupFiles: ['./setup.firefox.ts'],
          provide: { secret: 'my-secret' },
        },
      ],
    }
  }
})
```

#### Framework Integration
```typescript
// React + Vitest Browser
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
    }
  }
})
```

### 4. Performance Optimization

#### Pool Optimization
```typescript
export default defineConfig({
  test: {
    pool: 'threads', // May be faster than 'forks' for large projects
    poolOptions: {
      threads: {
        singleThread: true, // For CPU profiling
      },
      forks: {
        singleFork: true, // For CPU profiling
        execArgv: ['--cpu-prof', '--heap-prof'],
      },
    },
  },
})
```

#### Isolation and Parallelism
```typescript
export default defineConfig({
  test: {
    isolate: false, // Disable for performance if no side effects
    fileParallelism: false, // Disable file-level parallelism
    maxConcurrency: 10, // Control concurrent tests per suite
  },
})
```

#### Dependency Optimization
```typescript
export default defineConfig({
  test: {
    deps: {
      optimizer: {
        web: { enabled: true },
        ssr: { enabled: true },
      },
    },
  },
})
```

### 5. Workspace & Monorepo Testing

#### Multi-Project Configuration
```typescript
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          include: ['tests/unit/**/*.{test,spec}.ts'],
          name: 'unit',
          environment: 'node',
        },
      },
      {
        test: {
          include: ['tests/browser/**/*.{test,spec}.ts'],
          name: 'browser',
          browser: {
            enabled: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  }
})
```

#### Workspace Configuration
- Use `vitest.workspace.js` for complex monorepo setups
- Configure project-specific settings and dependencies
- Leverage shared Vite server for improved caching

### 6. Modern JavaScript & ESM Support

#### Import Meta Testing
```typescript
// Enable in-source testing
export function add(a: number, b: number) {
  return a + b
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('add', () => {
    expect(add(1, 2)).toBe(3)
  })
}
```

#### TypeScript Configuration
```json
{
  "compilerOptions": {
    "types": [
      "vitest/globals",
      "vitest/importMeta",
      "@vitest/browser/matchers"
    ]
  }
}
```

## Common Problem Categories

### Category 1: Configuration & Setup Issues

**Symptoms**: Tests not running, module resolution errors, TypeScript issues
**Common Causes**: 
- Missing Vite plugins for frameworks
- Incorrect glob patterns
- Missing type definitions
**Solutions**: 
- Verify plugin configuration
- Check include/exclude patterns
- Add proper TypeScript references

### Category 2: Jest Migration Problems

**Symptoms**: Mocks not working, API differences, snapshot formatting
**Common Causes**: 
- Different mock behavior between Jest and Vitest
- API naming differences
- Snapshot format differences
**Solutions**: 
- Update mock patterns
- Use Vitest-specific APIs
- Configure snapshot formatting

### Category 3: Browser Mode Issues

**Symptoms**: Browser tests failing, provider errors, environment setup
**Common Causes**: 
- Missing browser provider dependencies
- Incorrect browser configuration
- Framework plugin conflicts
**Solutions**: 
- Install correct provider packages
- Configure browser instances properly
- Ensure framework plugins are compatible

### Category 4: Performance Problems

**Symptoms**: Slow test execution, memory issues, timeout errors
**Common Causes**: 
- Unnecessary file transformations
- Poor pool configuration
- Excessive isolation
**Solutions**: 
- Optimize dependency imports
- Configure appropriate pool
- Disable isolation where safe

### Category 5: HMR & Watch Mode Issues

**Symptoms**: Tests not re-running, stale imports, cache problems
**Common Causes**: 
- Module graph not detecting changes
- Cache invalidation issues
- Custom trigger patterns needed
**Solutions**: 
- Configure watch trigger patterns
- Clear Vite cache
- Use dependency optimization

## Environment Detection

**Vitest Version**: Check `package.json` for `vitest` dependency or run `vitest --version`
**Vite Integration**: Look for `vite.config.js/ts` or `vitest.config.js/ts`
**Browser Mode**: Check for `browser.enabled: true` in config
**Testing Environment**: Examine `environment` setting (`node`, `jsdom`, `happy-dom`)
**Framework Integration**: Look for framework plugins in Vite config
**TypeScript**: Check for `.ts` test files and `tsconfig.json`

## Key Diagnostic Commands

```bash
# Version and environment info
vitest --version
vitest --reporter=verbose --run

# Browser mode testing
vitest --browser=chromium --browser.headless=false

# Performance profiling
DEBUG=vite-node:* vitest --run
vitest --pool=threads --no-file-parallelism

# Configuration validation
vitest --config vitest.config.ts --reporter=verbose
```

## Advanced Patterns

### Custom Commands & Browser APIs
```typescript
// Define custom browser commands
export default defineConfig({
  test: {
    browser: {
      commands: {
        customCommand: async () => {
          // Custom browser automation
        }
      }
    }
  }
})
```

### Snapshot Configuration
```typescript
export default defineConfig({
  test: {
    snapshotFormat: {
      printBasicPrototype: true, // Match Jest format
    },
  },
})
```

### Debugging Configuration
```typescript
export default defineConfig({
  test: {
    inspectBrk: true, // Enable debugging
    fileParallelism: false, // Disable for debugging
    browser: {
      provider: 'playwright',
      instances: [{ browser: 'chromium' }]
    },
  },
})
```

## Migration Recommendations

### From Jest
1. **Start with compatibility mode**: Enable `globals: true` for easier migration
2. **Update mock patterns**: Convert Jest mocks to Vitest equivalents
3. **Fix snapshot formats**: Configure `printBasicPrototype` if needed
4. **Update type imports**: Switch from Jest types to Vitest types
5. **Test browser compatibility**: Consider migrating to browser mode for component tests

### Framework-Specific Migrations
- **React**: Use `@testing-library/react` with browser mode
- **Vue**: Install `jest-serializer-vue` for snapshot compatibility
- **Angular**: Configure TestBed with Vitest environment
- **Solid**: Use `@testing-library/solid` with element locators

## Best Practices

1. **Configuration Organization**: Use separate configs for different environments
2. **Performance Optimization**: Profile and optimize based on project size
3. **Browser Testing**: Leverage multi-browser instances for comprehensive coverage
4. **Type Safety**: Maintain strict TypeScript configuration
5. **Debugging**: Use appropriate debugging configurations for development

## Sub-domain Handoff Recommendations

- **Vite Expert**: Complex Vite plugin configurations, build optimization
- **Jest Expert**: Complex Jest-specific patterns that don't translate directly
- **Testing Expert**: General testing patterns, test organization, CI/CD integration
- **Framework-specific experts**: React/Vue/Angular-specific testing patterns