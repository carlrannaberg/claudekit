# Vite Build Tool Expert Research

## Executive Summary

This document provides comprehensive research for the Vite build tool expert agent, focusing on ESM-first development, build speed optimization, and the Vite ecosystem. Vite is a next-generation frontend tooling that provides instant server start, lightning-fast Hot Module Replacement (HMR), and optimized builds for modern web applications.

## 1. SCOPE AND BOUNDARIES

**One-sentence scope**: "Vite build tool optimization, plugin ecosystem, development server configuration, and modern build patterns"

### 15 Recurring Problems (frequency × complexity):

1. **Vite configuration optimization and plugin integration** (high freq, medium complexity)
2. **Development server performance and hot module replacement** (high freq, medium complexity)
3. **Build optimization and production bundle configuration** (medium freq, high complexity)
4. **ESM and legacy browser compatibility handling** (medium freq, high complexity)
5. **Plugin development and custom transformation logic** (low freq, high complexity)
6. **Asset handling and static file optimization** (high freq, low complexity)
7. **Framework integration (React, Vue, Svelte) configuration** (high freq, medium complexity)
8. **Environment variable management and build modes** (high freq, low complexity)
9. **TypeScript integration and type checking optimization** (high freq, low complexity)
10. **Dependency pre-bundling and optimization strategies** (medium freq, medium complexity)
11. **CSS preprocessing and PostCSS integration** (medium freq, medium complexity)
12. **Testing integration with Vitest and other testing tools** (medium freq, medium complexity)
13. **Migration from Webpack and other build tools** (low freq, high complexity)
14. **Monorepo support and workspace configuration** (low freq, high complexity)
15. **Custom build pipeline and advanced optimization** (low freq, high complexity)

### Sub-domain mapping recommendations:
- **build-tools-expert**: General build tool issues, cross-platform compatibility, CI/CD integration
- **vitest-expert**: Testing configuration, test runner optimization, coverage reporting
- **performance-expert**: Bundle size analysis, runtime optimization, Core Web Vitals

## 2. TOPIC MAP (6 categories)

### Category 1: Configuration & Plugin Ecosystem
- **Vite configuration patterns**: `defineConfig`, conditional configuration, multi-environment setup
- **Plugin system**: Rollup compatibility, Vite-specific hooks, plugin lifecycle
- **Plugin development**: Custom transformations, build hooks, development vs production behavior
- **Popular plugins**: Framework integrations, utility plugins, optimization plugins

### Category 2: Development Server & HMR
- **Dev server optimization**: Fast startup, request handling, middleware configuration
- **Hot Module Replacement**: HMR API, custom HMR logic, framework-specific HMR
- **Development experience**: Source maps, error handling, debugging tools
- **Server configuration**: Proxy setup, CORS, HTTPS, network access

### Category 3: Build Optimization & Production
- **Production builds**: Rollup integration, code splitting, tree shaking
- **Bundle optimization**: Manual chunking, dynamic imports, asset optimization
- **Build targets**: Browser compatibility, ESM vs legacy, polyfill strategies
- **Library mode**: Single/multiple entries, external dependencies, output formats

### Category 4: Framework Integration & TypeScript
- **React integration**: Vite + React, JSX transforms, Fast Refresh
- **Vue integration**: SFC support, Vue 3 features, template optimization
- **Svelte integration**: SvelteKit compatibility, component optimization
- **TypeScript setup**: TSC vs esbuild, type checking, declaration generation

### Category 5: Asset Handling & Preprocessing
- **Static assets**: Public directory, asset imports, URL handling
- **CSS preprocessing**: Sass, Less, Stylus, PostCSS integration
- **Image optimization**: Asset bundling, format conversion, lazy loading
- **Font handling**: Web fonts, subsetting, preloading strategies

### Category 6: Migration & Advanced Patterns
- **Migration strategies**: From Create React App, Webpack, Parcel
- **Monorepo configuration**: Workspace setup, shared dependencies
- **SSR and SSG**: Server-side rendering, static site generation
- **Advanced customization**: Custom build functions, environment APIs

## 3. ENVIRONMENT DETECTION

### Detection Methods:
```bash
# Vite version detection
vite --version
npm list vite
yarn list vite

# Configuration files
ls vite.config.{js,ts,mjs,cjs}
ls vitest.config.{js,ts,mjs,cjs}

# Framework integration detection
grep -r "@vitejs/plugin-" package.json
grep -r "plugins:" vite.config.*

# Build mode detection
grep -r "mode:" vite.config.*
grep -r "command:" vite.config.*
```

### Key Indicators:
- **Vite version**: 2.x (legacy), 3.x (current), 4.x (latest), 5.x (future)
- **Configuration**: `vite.config.js/ts` presence and structure
- **Framework plugins**: `@vitejs/plugin-react`, `@vitejs/plugin-vue`
- **TypeScript integration**: `@vitejs/plugin-react-swc`, TypeScript config
- **Testing setup**: Vitest configuration, test runner integration
- **Build modes**: Development, production, custom modes

## 4. SOURCE MATERIAL PRIORITIES

### Primary Sources:
1. **Vite Official Documentation**: Configuration guides, API reference
2. **Plugin Ecosystem**: Official and community plugins, plugin development guides
3. **Framework Integration**: React, Vue, Svelte specific setup and optimization
4. **Performance Guides**: Build optimization, development server tuning
5. **Migration Guides**: From Webpack, Parcel, other build tools
6. **GitHub Issues**: Common problems, solutions, workarounds

### Content Priorities:
- **Configuration patterns**: Real-world config examples, best practices
- **Performance optimization**: Bundle analysis, build speed improvements
- **Plugin integration**: Popular plugin combinations, configuration tips
- **Troubleshooting**: Common errors, debugging techniques
- **Advanced use cases**: Library mode, SSR, custom environments

## 5. CONFIGURATION PATTERNS & BEST PRACTICES

### Basic Configuration Structure:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
})
```

### Conditional Configuration:
```javascript
export default defineConfig(({ command, mode }) => {
  const config = {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
    }
  }

  if (command === 'serve') {
    config.define.__API_URL__ = '"http://localhost:3001"'
  } else {
    config.define.__API_URL__ = '"https://api.production.com"'
  }

  return config
})
```

### Multi-Environment Setup:
```javascript
export default defineConfig({
  environments: {
    client: {
      build: {
        outDir: 'dist/client',
        rollupOptions: {
          input: 'src/client/main.js'
        }
      }
    },
    ssr: {
      build: {
        outDir: 'dist/server',
        ssr: 'src/server/entry-server.js'
      }
    }
  }
})
```

## 6. DEVELOPMENT SERVER OPTIMIZATION

### Performance Tuning:
```javascript
export default defineConfig({
  server: {
    // Warm up frequently used files
    warmup: {
      clientFiles: [
        './src/components/BigComponent.vue',
        './src/utils/big-utils.js'
      ]
    },
    // File system optimizations
    fs: {
      allow: ['..']
    },
    // Proxy configuration for API calls
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  // Dependency optimization
  optimizeDeps: {
    include: ['lodash-es', 'date-fns'],
    exclude: ['some-large-package'],
    force: true // Force re-bundling
  }
})
```

### HMR Customization:
```javascript
// Custom HMR handling
if (import.meta.hot) {
  import.meta.hot.accept('./someModule.js', (newModule) => {
    // Handle module update
  })
  
  import.meta.hot.dispose(() => {
    // Cleanup before update
  })
}
```

## 7. PRODUCTION BUILD OPTIMIZATION

### Bundle Optimization:
```javascript
export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'esbuild', // or 'terser' for better compression
    rollupOptions: {
      output: {
        // Manual chunking strategy
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash-es', 'date-fns']
        },
        // Dynamic chunking
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          if (id.includes('src/components')) {
            return 'components'
          }
        }
      }
    },
    // Generate build manifest
    manifest: true,
    sourcemap: true
  }
})
```

### Library Mode Configuration:
```javascript
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'lib/main.js'),
      name: 'MyLib',
      fileName: (format) => `my-lib.${format}.js`,
      formats: ['es', 'cjs', 'umd']
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  }
})
```

## 8. PLUGIN ECOSYSTEM

### Essential Plugins:
- **@vitejs/plugin-react**: React support with Fast Refresh
- **@vitejs/plugin-vue**: Vue.js SFC support
- **@vitejs/plugin-legacy**: Legacy browser support
- **vite-plugin-pwa**: Progressive Web App features
- **vite-plugin-eslint**: ESLint integration
- **vite-plugin-windicss**: WindiCSS integration

### Custom Plugin Development:
```javascript
function customPlugin() {
  return {
    name: 'custom-plugin',
    configResolved(config) {
      // Access resolved config
    },
    buildStart() {
      // Build initialization
    },
    transform(code, id) {
      // Transform code
      if (id.includes('special-file')) {
        return transformSpecialFile(code)
      }
    },
    generateBundle(options, bundle) {
      // Modify generated bundle
    }
  }
}
```

## 9. COMMON ISSUES & SOLUTIONS

### Dependency Pre-bundling Issues:
```javascript
// Force specific dependencies to be pre-bundled
export default defineConfig({
  optimizeDeps: {
    include: [
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'styled-components'
    ],
    exclude: ['@vite/client']
  }
})
```

### Import Resolution Problems:
```javascript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'components': path.resolve(__dirname, 'src/components')
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  }
})
```

### Build Performance Issues:
```javascript
export default defineConfig({
  build: {
    // Reduce bundle size
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Split chunks more aggressively
        experimentalMinChunkSize: 20000
      }
    }
  },
  // Optimize dependency scanning
  optimizeDeps: {
    holdUntilCrawlEnd: false // New optimization strategy
  }
})
```

## 10. MIGRATION STRATEGIES

### From Create React App:
1. **Install Vite**: `npm install vite @vitejs/plugin-react`
2. **Update package.json scripts**:
   ```json
   {
     "scripts": {
       "dev": "vite",
       "build": "vite build",
       "preview": "vite preview"
     }
   }
   ```
3. **Create vite.config.js**
4. **Move index.html to root**
5. **Update import paths**

### From Webpack:
1. **Configuration mapping**: webpack.config.js → vite.config.js
2. **Plugin equivalents**: Find Vite/Rollup alternatives
3. **Asset handling**: Update static asset imports
4. **Environment variables**: Migrate from process.env to import.meta.env

## 11. TESTING INTEGRATION

### Vitest Configuration:
```javascript
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts'
  }
})
```

## 12. PERFORMANCE MONITORING

### Bundle Analysis:
```bash
# Install bundle analyzer
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.js
import { visualizer } from 'rollup-plugin-visualizer'

export default defineConfig({
  plugins: [
    // ... other plugins
    visualizer({
      filename: 'dist/stats.html',
      open: true
    })
  ]
})
```

### Build Performance Metrics:
```javascript
export default defineConfig({
  build: {
    // Report compressed size
    reportCompressedSize: true,
    // Chunk size warning
    chunkSizeWarningLimit: 500
  }
})
```

## 13. ADVANCED PATTERNS

### SSR Configuration:
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        client: 'src/entry-client.js',
        server: 'src/entry-server.js'
      }
    },
    ssr: 'src/entry-server.js'
  }
})
```

### Custom Build Function:
```javascript
export default defineConfig({
  builder: {
    buildApp: async (builder) => {
      const environments = Object.values(builder.environments)
      return Promise.all(
        environments.map((env) => builder.build(env))
      )
    }
  }
})
```

## 14. TROUBLESHOOTING GUIDE

### Common Error Patterns:
1. **"Failed to resolve import"**: Check path aliases, file extensions
2. **"The requested module does not provide an export"**: ESM/CJS compatibility issues
3. **"Pre-bundling dependencies"**: Dependency optimization conflicts
4. **"Cannot access before initialization"**: Circular dependency issues
5. **"ENOENT: no such file"**: Incorrect file paths, case sensitivity

### Debugging Techniques:
```bash
# Enable debug mode
DEBUG=vite:* npm run dev

# Force dependency re-optimization
rm -rf node_modules/.vite
npm run dev

# Build analysis
npm run build -- --debug
```

## 15. FUTURE CONSIDERATIONS

### Vite 6.0 Features:
- **Environment API**: Multiple runtime support
- **Improved performance**: Better cold start optimization
- **Enhanced plugin system**: More granular control

### Ecosystem Evolution:
- **Rolldown integration**: Rust-based bundler for better performance
- **Framework agnostic**: Better support for all frontend frameworks
- **Edge runtime support**: Cloudflare Workers, Deno Deploy compatibility

## CONCLUSION

This research document provides comprehensive coverage of Vite build tool expertise, focusing on practical patterns, performance optimization, and real-world problem-solving. The content emphasizes ESM-first development, modern build practices, and the rich plugin ecosystem that makes Vite a powerful choice for frontend development.

The expert agent should proactively use this knowledge for:
- Vite configuration optimization
- Development server performance tuning
- Production build optimization
- Plugin integration and development
- Migration assistance from other build tools
- Framework-specific integration patterns
- Advanced customization and extension points