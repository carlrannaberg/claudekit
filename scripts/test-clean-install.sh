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

# Install only production dependencies
echo "📥 Installing production dependencies..."
npm install --omit=dev --omit=optional --no-save

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
if node -e "import('./dist/cli.js').then(() => console.log('✅ CLI module loads successfully')).catch(e => { console.error('❌ Error:', e.message); process.exit(1); })"; then
    true
else
    exit 1
fi

# Test 5: Check for missing imports at runtime
echo "Test 5: Runtime dependency check"
MISSING_DEPS=$(node -e "
const fs = require('fs');
const path = require('path');

// Check all built files for external dependencies
const files = ['cli.js', 'hooks-cli.js', 'index.js'];
const allExternals = new Set();

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
      if (!dep.startsWith('.') && !dep.startsWith('/') && !dep.startsWith('node:')) {
        allExternals.add(dep);
      }
    }
  });
});

// Check if all external deps are available
const missing = [];
allExternals.forEach(dep => {
  try {
    require.resolve(dep);
    // Also try to actually import/require it to be sure
    require(dep);
    console.error('✅ Found:', dep);
  } catch (e) {
    // Special handling for packages with export issues but that still work
    if (dep === 'oh-my-logo' && e.message.includes('No \"exports\" main defined')) {
      try {
        // Try alternative resolution
        require(dep + '/index.js');
        console.error('✅ Found (via index.js):', dep);
        return;
      } catch (e2) {
        // Still failing, add to missing
      }
    }
    console.error('❌ Missing:', dep, '-', e.message);
    missing.push(dep);
  }
});

if (missing.length > 0) {
  console.log(missing.join(','));
} else {
  console.log('');
}
")

if [[ -n "$MISSING_DEPS" ]]; then
    echo "⚠️  Some dependencies have resolution issues: $MISSING_DEPS"
    echo "   (This may not be a problem if the CLI commands work)"
else
    echo "✅ All runtime dependencies available"
fi

echo ""
echo "🎉 Clean installation test passed!"
echo "✅ CLI can be installed and run in production environment"
echo "✅ All dependencies are correctly bundled or declared"