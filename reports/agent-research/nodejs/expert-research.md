# Node.js Expert Research

## Research Overview
This document contains comprehensive research for creating a Node.js expert agent focused on runtime debugging, async patterns, module system issues, performance optimization, and filesystem operations.

## Scope Definition
**One-sentence scope**: Node.js runtime debugging, async patterns, module system, performance optimization, and filesystem operations

**15 Recurring Problems** (frequency × complexity):
1. Unhandled promise rejections (high freq, medium complexity)
2. Event loop blocking and performance issues (high freq, high complexity) 
3. Module resolution and ESM/CommonJS conflicts (high freq, medium complexity)
4. Memory leaks in long-running processes (medium freq, high complexity)
5. File system operation errors and permissions (high freq, low complexity)
6. Stream processing and backpressure (medium freq, high complexity)
7. Worker threads and child process management (low freq, high complexity)
8. HTTP server configuration and middleware issues (high freq, medium complexity)
9. Package.json configuration and npm scripts (high freq, low complexity)
10. Environment variable and configuration management (high freq, low complexity)
11. Debugging and profiling Node.js applications (medium freq, medium complexity)
12. Database connection pooling and management (medium freq, medium complexity)
13. Security vulnerabilities and dependency management (medium freq, high complexity)
14. Process management and clustering (low freq, high complexity)
15. Buffer and binary data handling (low freq, medium complexity)

## Topic Mapping (6 Categories)

### Category 1: Async & Promises
**Common Errors/Symptoms:**
- "UnhandledPromiseRejectionWarning" 
- "Promise.all fails fast"
- "Async function returns [object Promise]"
- "Cannot read property of undefined in async chain"

**Root Causes:**
- Missing .catch() handlers
- Mixing callback and promise patterns
- Not awaiting async functions
- Race conditions in async operations

**Diagnostic Commands:**
- `node --unhandled-rejections=strict`
- `node --trace-warnings`
- `node --inspect --inspect-brk`

**Official References:**
- https://nodejs.org/api/errors.html
- https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick
- https://nodejs.org/api/async_hooks.html

### Category 2: Module System & Dependencies
**Common Errors/Symptoms:**
- "Cannot use import statement outside a module"
- "require() of ES modules not supported"
- "Module not found" errors
- "Circular dependency detected"

**Root Causes:**
- Incorrect module type configuration
- ESM/CommonJS interop issues  
- Invalid module resolution paths
- Missing file extensions in ESM

**Diagnostic Commands:**
- `node --trace-warnings`
- `npm ls --depth=0`
- `node --experimental-loader`

**Official References:**
- https://nodejs.org/api/modules.html
- https://nodejs.org/api/esm.html
- https://nodejs.org/api/packages.html

### Category 3: Performance & Memory
**Common Errors/Symptoms:**
- "JavaScript heap out of memory"
- "Event loop lag detected"
- High CPU usage with low throughput
- Memory leaks in long-running processes

**Root Causes:**
- Event loop blocking operations
- Memory leaks from unclosed resources
- Synchronous operations in hot paths
- Large object retention

**Diagnostic Commands:**
- `node --prof`
- `node --prof-process`
- `node --inspect`
- `node --heap-prof`
- `node --max-old-space-size`

**Official References:**
- https://nodejs.org/en/docs/guides/simple-profiling
- https://nodejs.org/en/docs/guides/dont-block-the-event-loop
- https://nodejs.org/api/perf_hooks.html

### Category 4: Filesystem & Streams  
**Common Errors/Symptoms:**
- "ENOENT: no such file or directory"
- "EACCES: permission denied"
- "EMFILE: too many open files"
- Stream backpressure issues

**Root Causes:**
- Incorrect file paths
- Permission issues
- File descriptor leaks
- Improper stream handling

**Diagnostic Commands:**
- `node --trace-fs-sync`
- `lsof -p <pid>`
- `ulimit -n`

**Official References:**
- https://nodejs.org/api/fs.html
- https://nodejs.org/api/stream.html
- https://nodejs.org/api/path.html

### Category 5: Process & Environment
**Common Errors/Symptoms:**
- "Cannot read property of undefined (process.env)"
- Process hanging or not exiting
- Signal handling issues
- Child process spawn errors

**Root Causes:**
- Missing environment variables
- Event loop keeps process alive
- Improper signal handling
- Child process stdio issues

**Diagnostic Commands:**
- `node --trace-exit`
- `node --trace-sigint`
- `ps aux | grep node`
- `netstat -tulpn | grep node`

**Official References:**
- https://nodejs.org/api/process.html
- https://nodejs.org/api/child_process.html
- https://nodejs.org/api/cluster.html

### Category 6: HTTP & Networking
**Common Errors/Symptoms:**
- "ECONNREFUSED"
- "ETIMEOUT" 
- "Cannot set headers after they are sent"
- "Request timeout"

**Root Causes:**
- Server not listening
- Network connectivity issues
- Response already sent
- Request hanging

**Diagnostic Commands:**
- `netstat -tulpn`
- `curl -v`
- `node --trace-http`

**Official References:**  
- https://nodejs.org/api/http.html
- https://nodejs.org/api/https.html
- https://nodejs.org/api/net.html

## Environment Detection Patterns

### Node.js Version Detection
```javascript
// Version check
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

// Feature availability
if (majorVersion >= 18) {
  // Can use fetch API
}
```

### Package Manager Detection
```javascript
const fs = require('fs');

function detectPackageManager() {
  if (fs.existsSync('pnpm-lock.yaml')) return 'pnpm';
  if (fs.existsSync('yarn.lock')) return 'yarn';  
  if (fs.existsSync('package-lock.json')) return 'npm';
  return 'npm'; // default
}
```

### Module Type Detection
```javascript
const packageJson = require('./package.json');
const isESM = packageJson.type === 'module';
const isCommonJS = !packageJson.type || packageJson.type === 'commonjs';
```

### Framework Detection
```javascript
function detectFramework() {
  const pkg = require('./package.json');
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  
  if (deps.express) return 'express';
  if (deps.fastify) return 'fastify';
  if (deps.koa) return 'koa';
  if (deps.next) return 'nextjs';
  return 'vanilla';
}
```

## Key Debugging Techniques

### Inspector Usage
```bash
# Basic debugging
node --inspect app.js

# Break on start
node --inspect-brk app.js

# Custom port
node --inspect=127.0.0.1:9230 app.js

# Remote debugging (use SSH tunnel)
ssh -L 9221:localhost:9229 user@remote.host
```

### Profiling Commands
```bash
# CPU profiling
node --prof app.js
node --prof-process isolate-*.log > profile.txt

# Memory profiling  
node --heap-prof app.js

# Trace specific operations
node --trace-warnings app.js
node --trace-fs-sync app.js
```

### Event Loop Monitoring
```javascript
// Detect event loop lag
const { performance } = require('perf_hooks');

function checkEventLoopLag() {
  const start = performance.now();
  setImmediate(() => {
    const lag = performance.now() - start;
    if (lag > 10) {
      console.warn(`Event loop lag: ${lag}ms`);
    }
  });
}
```

## Common Fix Patterns

### Promise Error Handling
```javascript
// Minimal fix - add catch
promise.catch(err => console.error(err));

// Better fix - proper error handling
promise.catch(err => {
  logger.error('Operation failed:', err);
  // Handle gracefully
});

// Complete fix - structured error handling
async function safeOperation() {
  try {
    return await riskyOperation();
  } catch (error) {
    if (error.code === 'ENOENT') {
      // Handle missing file
      return null;
    }
    throw error; // Re-throw unexpected errors
  }
}
```

### Module Resolution Fixes
```javascript
// Minimal - add file extension
import utils from './utils.js';

// Better - explicit paths
import utils from './src/utils.js';

// Complete - proper package.json structure
{
  "type": "module",
  "exports": {
    ".": "./src/index.js",
    "./utils": "./src/utils.js"
  }
}
```

### Stream Backpressure Handling
```javascript
// Minimal - check write return value
if (!stream.write(chunk)) {
  stream.once('drain', () => {
    // Resume writing
  });
}

// Better - use pipeline
const { pipeline } = require('stream');
pipeline(source, transform, destination, (err) => {
  if (err) console.error('Pipeline failed:', err);
});

// Complete - custom transform with backpressure
class SafeTransform extends Transform {
  _transform(chunk, encoding, callback) {
    // Process chunk
    this.push(processedChunk);
    callback();
  }
}
```

## Performance Optimization Patterns

### Async Operations
```javascript
// Avoid blocking sync operations
const data = fs.readFileSync('large-file.txt'); // BAD

// Use async versions
const data = await fs.promises.readFile('large-file.txt'); // GOOD
```

### CPU-Intensive Tasks
```javascript
// Partition work to avoid blocking
function processLargeArray(items) {
  let index = 0;
  
  function processChunk() {
    const start = Date.now();
    while (index < items.length && Date.now() - start < 10) {
      processItem(items[index++]);
    }
    
    if (index < items.length) {
      setImmediate(processChunk);
    }
  }
  
  processChunk();
}
```

## Validation Steps

### Runtime Validation
```bash
# Check syntax without running
node --check app.js

# Validate with strict mode
node --strict app.js

# Test with warnings
node --trace-warnings app.js
```

### Memory Leak Detection
```bash
# Generate heap snapshots
node --inspect app.js
# Use Chrome DevTools Memory tab

# Or use clinic.js
npm install -g clinic
clinic doctor -- node app.js
```

### Performance Testing
```bash
# Load testing with autocannon
npx autocannon http://localhost:3000

# Profiling
node --prof app.js
# Generate load, then:
node --prof-process isolate-*.log
```

## Safety Rules

1. **No Destructive Operations**: Never delete files, kill processes, or modify system configs
2. **Avoid Global Installs**: Prefer local package installations
3. **Environment Isolation**: Don't modify global environment variables
4. **Process Safety**: Don't force-kill Node.js processes
5. **Data Safety**: Create backups before making changes to data files

## Sub-domain Recommendations

### When to Recommend Other Experts
- **Database Issues**: Connection pooling, query optimization → database-expert
- **Testing Problems**: Unit tests, integration tests, mocking → testing-expert  
- **Container Issues**: Docker setup, deployment → docker-expert
- **Build Problems**: Webpack, build tools → build-expert
- **Security Concerns**: Vulnerabilities, auth → security-expert

## Research Sources

All information sourced from official Node.js documentation:
- https://nodejs.org/en/docs/guides
- https://nodejs.org/api/ (various modules)
- Focus on debugging, performance, modules, streams, and error handling

## Content Distillation Focus

This research emphasizes:
- Non-obvious debugging patterns and async pitfalls
- Event loop behavior and blocking detection
- Module system interoperability challenges
- Performance profiling and memory management
- Stream processing and backpressure handling
- Practical diagnostic commands and validation steps

The content is designed for runtime issues rather than development setup, focusing on production debugging and performance optimization scenarios.