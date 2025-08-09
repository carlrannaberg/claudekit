# TypeScript Build Expert Research

**Research Date**: August 9, 2025  
**Scope**: TypeScript compiler configuration, build optimization, module resolution, and build tool integration  
**Sub-domain Boundaries**: When to escalate to webpack-expert, vite-expert, or typescript-type-expert

## Executive Summary

The TypeScript Build Expert handles compiler configuration, build performance optimization, module resolution issues, and build tool integration. This agent should be invoked for tsconfig.json issues, build performance problems, module resolution failures, and bundler integration challenges.

### Key Escalation Points
- **webpack-expert**: Deep webpack plugin development, complex loader chains, advanced optimization strategies
- **vite-expert**: Vite-specific build optimizations, SSR setup, advanced plugin configurations
- **typescript-type-expert**: Complex type system issues, generic constraints, advanced type-level programming

## Problem Categories & Frequency Analysis

### Category 1: TSConfig & Compiler Options (High Frequency, Medium Complexity)
**Common Issues:**
- Option conflicts and inheritance problems
- Target/lib version mismatches
- Module system configuration errors
- Strict mode migration challenges

**Key Patterns:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  }
}
```

### Category 2: Module Resolution & Path Mapping (High Frequency, Medium Complexity)
**Common Issues:**
- Path mapping not working at runtime
- Circular dependency detection failures
- Node.js vs bundler resolution conflicts
- Barrel export performance problems

**Critical Understanding:**
- TypeScript paths only work at compile time
- Runtime requires additional tooling (tsconfig-paths, bundler aliases)
- Module resolution strategy affects build performance significantly

### Category 3: Build Tool Integration (High Frequency, Medium Complexity)
**Common Issues:**
- TypeScript configuration conflicts with bundler settings
- Source map generation inconsistencies
- Watch mode performance problems
- Hot module replacement failures with TypeScript

**Integration Patterns:**
- **Webpack**: ts-loader vs babel-loader + @babel/preset-typescript
- **Vite**: Built-in TypeScript support with esbuild
- **Rollup**: @rollup/plugin-typescript configuration

### Category 4: Performance & Optimization (Medium Frequency, High Complexity)
**Common Issues:**
- Slow type checking blocking builds
- Memory usage in large projects
- Incremental compilation not working
- Watch mode file change detection issues

**Optimization Strategies:**
1. **Compiler Performance:**
   - `skipLibCheck: true` for library types only
   - `incremental: true` with proper .tsbuildinfo handling
   - Type-only imports: `import type { ... } from '...'`

2. **Build Performance:**
   - Separate type checking from transpilation
   - Use build tool's TypeScript handling instead of tsc
   - Optimize include/exclude patterns

### Category 5: Output & Bundling (Medium Frequency, Medium Complexity)
**Common Issues:**
- Declaration file generation problems
- Tree-shaking not working with TypeScript
- Output directory structure issues
- Source map configuration problems

**Best Practices:**
- Use `declaration: true` for libraries
- Configure `outDir` and `rootDir` properly
- Set up proper source map generation

### Category 6: Monorepo & Project References (Low Frequency, High Complexity)
**Common Issues:**
- Project reference configuration errors
- Build order dependencies
- Incremental builds not working across packages
- Path resolution in monorepo context

**Project References Pattern:**
```json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" }
  ],
  "files": []
}
```

## Environment Detection Strategy

### TypeScript Installation Detection
```bash
# Check TypeScript installation
npx tsc --version
npm list typescript --depth=0

# Check for TypeScript configs
find . -name "tsconfig*.json" -not -path "*/node_modules/*"

# Detect build tools
ls -la | grep -E "(webpack|vite|rollup)\.config\.(js|ts)"
```

### Build Tool Integration Detection
```bash
# Package.json script analysis
jq '.scripts | to_entries[] | select(.value | contains("tsc") or contains("typescript"))' package.json

# Webpack detection
test -f webpack.config.js && echo "Webpack found"
grep -q "ts-loader\|babel-loader" webpack.config.js 2>/dev/null && echo "TS integration found"

# Vite detection
test -f vite.config.ts && echo "Vite with TypeScript config"
test -f vite.config.js && echo "Vite found"
```

## Advanced Configuration Patterns

### Modern TypeScript Build Setup (2024-2025)
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "allowArbitraryExtensions": true,
    "noEmit": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Performance Optimization Config
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo",
    "skipLibCheck": true,
    "disableSourceOfProjectReferenceRedirect": true,
    "disableSolutionSearching": true
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

### Build Tool Specific Patterns

#### Webpack + TypeScript
```javascript
// webpack.config.js
module.exports = {
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true, // Type checking handled separately
              compilerOptions: {
                module: 'esnext'
              }
            }
          }
        ]
      }
    ]
  }
};
```

#### Vite + TypeScript
```typescript
// vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true
  },
  esbuild: {
    target: 'es2022'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
```

## Build Performance Optimization Strategies

### 1. Separation of Concerns
```bash
# Separate type checking from transpilation
npm run type-check & npm run build:transpile

# Type checking only
npx tsc --noEmit

# Transpilation only (using build tool)
npm run build
```

### 2. Incremental Compilation Setup
```json
{
  "compilerOptions": {
    "incremental": true,
    "composite": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### 3. Watch Mode Optimization
```bash
# Efficient watch command
npx tsc --watch --preserveWatchOutput --pretty

# Build tool watch with type checking
npm run dev & npm run type-check:watch
```

## Module Resolution Deep Dive

### Path Mapping Runtime Solutions
```javascript
// Node.js with ts-node
require('ts-node/register');
require('tsconfig-paths/register');

// Jest configuration
module.exports = {
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};

// Webpack alias (mirrors tsconfig paths)
resolve: {
  alias: {
    '@': path.resolve(__dirname, 'src')
  }
}
```

### Module Resolution Debugging
```bash
# Trace module resolution
npx tsc --traceResolution > resolution.log 2>&1
grep "Module resolution" resolution.log

# Check resolved paths
npx tsc --listFiles | head -20
```

## Monorepo Build Coordination

### Project References Setup
```json
// Root tsconfig.json
{
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/ui" },
    { "path": "./apps/web" }
  ],
  "files": []
}

// Package tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../core" }
  ]
}
```

### Monorepo Build Commands
```bash
# Build all projects with dependencies
npx tsc --build

# Clean and rebuild
npx tsc --build --clean
npx tsc --build

# Watch mode for development
npx tsc --build --watch
```

## Common Error Patterns & Solutions

### "Cannot find module" with Path Mapping
**Root Cause**: Path mapping only works at compile time
**Solutions**:
1. Use bundler aliases that mirror tsconfig paths
2. Install tsconfig-paths for Node.js runtime
3. Configure Jest/test runner module mapping

### Build Performance Issues
**Symptoms**: Slow builds, high memory usage
**Solutions**:
1. Enable `skipLibCheck: true`
2. Use `incremental: true` compilation
3. Separate type checking from transpilation
4. Optimize include/exclude patterns

### Module Resolution Conflicts
**Symptoms**: Different behavior in development vs production
**Solutions**:
1. Use consistent moduleResolution strategy
2. Align bundler configuration with TypeScript config
3. Test both development and production builds

## CI/CD Integration Patterns

### Build Pipeline Configuration
```yaml
# GitHub Actions example
- name: Type Check
  run: npm run type-check

- name: Build
  run: npm run build

- name: Test Build Output
  run: npm run test:build
```

### Docker Build Optimization
```dockerfile
# Multi-stage build for TypeScript
FROM node:18 AS builder
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-slim AS runtime
COPY --from=builder /app/dist ./dist
```

## Validation & Testing Strategies

### Build Validation Commands
```bash
# Comprehensive build check
npm run type-check && npm run build && npm run test

# Check build outputs
ls -la dist/
npm run build:analyze  # if available

# Validate generated declarations
npx tsc --noEmit --project tsconfig.build.json
```

### Build Performance Profiling
```bash
# TypeScript build performance
npx tsc --generateTrace trace --incremental false
npx @typescript/analyze-trace trace

# Bundle analysis
npm run build:analyze
npx webpack-bundle-analyzer dist/stats.json
```

## Tool-Specific Integration Guides

### ESBuild Integration
```javascript
// esbuild.config.js
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outdir: 'dist',
  target: 'es2020',
  format: 'esm',
  sourcemap: true,
  tsconfig: 'tsconfig.json'
});
```

### SWC Integration
```json
// .swcrc
{
  "jsc": {
    "parser": {
      "syntax": "typescript",
      "tsx": true
    },
    "target": "es2022"
  },
  "module": {
    "type": "es6"
  }
}
```

## Migration Strategies

### JavaScript to TypeScript Build Migration
1. **Phase 1**: Enable `allowJs: true` and `checkJs: true`
2. **Phase 2**: Rename files incrementally (.js → .ts)
3. **Phase 3**: Add type annotations
4. **Phase 4**: Enable strict mode options

### Legacy Build Tool Migration
1. **Assessment**: Audit current build pipeline
2. **Incremental**: Run both old and new builds in parallel
3. **Validation**: Compare outputs and performance
4. **Cutover**: Switch when confidence is high

## Advanced Topics

### Custom Transformers
```typescript
// custom-transformer.ts
import * as ts from 'typescript';

const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
  return (sourceFile) => {
    // Custom transformation logic
    return ts.visitEachChild(sourceFile, visit, context);
  };
};
```

### Build Caching Strategies
- Use `.tsbuildinfo` for incremental compilation
- Implement build artifact caching in CI
- Consider distributed build systems for large projects

## Resources & References

### Official Documentation
- [TypeScript Handbook - Project Configuration](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [TypeScript Handbook - Module Resolution](https://www.typescriptlang.org/docs/handbook/module-resolution.html)
- [TypeScript Performance Guide](https://github.com/microsoft/TypeScript/wiki/Performance)

### Build Tool Documentation
- [Webpack TypeScript Guide](https://webpack.js.org/guides/typescript/)
- [Vite TypeScript Support](https://vitejs.dev/guide/features.html#typescript)
- [Rollup TypeScript Plugin](https://github.com/rollup/plugins/tree/master/packages/typescript)

### Performance & Optimization
- [TypeScript Build Performance](https://github.com/microsoft/TypeScript/wiki/Performance)
- [Project References Guide](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Incremental Compilation](https://devblogs.microsoft.com/typescript/announcing-typescript-3-4/#faster-subsequent-builds-with-the-incremental-flag)

## Conclusion

The TypeScript Build Expert should focus on practical build configuration, performance optimization, and integration patterns. The key is understanding the interplay between TypeScript compiler options, build tools, and module resolution strategies to solve real-world build problems efficiently.