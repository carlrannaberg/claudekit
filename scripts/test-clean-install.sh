#!/usr/bin/env bash

################################################################################
# Clean Installation Test                                                      #
# Tests the built CLI in a clean environment to catch missing dependencies    #
################################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DIR="/tmp/claudekit-install-test-$$"

echo "🧪 Testing clean installation in isolated environment..."
echo ""

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up test directory..."
    rm -rf "$TEST_DIR"
}
trap cleanup EXIT

# Create clean test environment
echo "📁 Creating clean test environment: $TEST_DIR"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

# Copy built artifacts
echo "📦 Copying built artifacts..."
cp -r "$PROJECT_ROOT/dist" .
cp "$PROJECT_ROOT/package.json" .
mkdir -p bin
cp -r "$PROJECT_ROOT/bin"/* bin/

# Install only the external dependencies that can't be bundled
echo "📦 Installing minimal external dependencies (oh-my-logo)..."
npm install --no-save oh-my-logo

# Node.js ESM support note
echo "📝 Note: Using Node.js ESM with dynamic require support via createRequire"

echo ""
echo "🔍 Testing CLI functionality..."

# Test 1: Help command
echo "Test 1: Help command"
if node bin/claudekit --help > /dev/null 2>&1; then
    echo "✅ Help command works"
else
    echo "❌ Help command failed"
    exit 1
fi

# Test 2: Version command  
echo "Test 2: Version command"
if node bin/claudekit --version > /dev/null 2>&1; then
    echo "✅ Version command works"
else
    echo "❌ Version command failed"
    exit 1
fi

# Test 3: Hooks CLI
echo "Test 3: Hooks CLI help"
if node bin/claudekit-hooks --help > /dev/null 2>&1; then
    echo "✅ Hooks CLI works"
else
    echo "❌ Hooks CLI failed"
    exit 1
fi

# Test 4: Test module loading
echo "Test 4: Test CLI module loading"
if node -e "try { require('./dist/cli.cjs'); console.log('✅ CLI module loads successfully'); } catch(e) { console.error('❌ Error:', e.message); process.exit(1); }"; then
    true
else
    exit 1
fi

# Test 5: Verify full bundling (should have no external deps except Node.js built-ins)
echo "Test 5: Bundling verification"
EXTERNAL_DEPS=$(node -e "
const fs = require('fs');

// Expected externals (should only be these)
const allowedExternals = new Set(['react-devtools-core', 'oh-my-logo']);

// Node.js built-in modules (both with and without node: prefix)
const nodeBuiltins = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 
  'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 
  'module', 'net', 'os', 'path', 'process', 'querystring', 'readline', 
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 
  'url', 'util', 'vm', 'zlib', 'worker_threads', 'perf_hooks', 'async_hooks',
  'inspector', 'trace_events', 'punycode', 'v8', 'http2'
]);

// Transitive dependencies that are acceptable
const transitiveAllowed = new Set(['esprima', 'iconv-lite']);

// Check all built files for external dependencies
const files = ['cli.cjs', 'hooks-cli.cjs', 'index.cjs'];
const unexpectedExternals = new Set();

files.forEach(file => {
  if (!fs.existsSync('./dist/' + file)) return;
  
  const content = fs.readFileSync('./dist/' + file, 'utf8');
  const patterns = [
    /require\(['\"]([^'\"]+)['\"]\)/g,
    /import.*from\s*['\"]([^'\"]+)['\"]/g
  ];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const dep = match[1];
      // Skip relative imports, absolute paths, and Node.js built-ins
      if (!dep.startsWith('.') && !dep.startsWith('/') && !dep.startsWith('node:') && !nodeBuiltins.has(dep)) {
        // Skip allowed externals and transitive dependencies
        if (!allowedExternals.has(dep) && !transitiveAllowed.has(dep)) {
          unexpectedExternals.add(dep);
        }
      }
    }
  });
});

if (unexpectedExternals.size > 0) {
  console.log(Array.from(unexpectedExternals).join(','));
} else {
  console.log('');
}
")

if [[ -n "$EXTERNAL_DEPS" ]]; then
    echo "❌ Found unexpected external dependencies: $EXTERNAL_DEPS"
    echo "   These should be bundled for a self-contained CLI"
    exit 1
else
    echo "✅ Fully self-contained - no unexpected external dependencies"
fi

echo ""
echo "🎉 Clean installation test passed!"
echo "✅ CLI can be installed and run in production environment"
echo "✅ All dependencies are correctly bundled or declared"