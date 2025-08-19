#!/usr/bin/env node

/**
 * Dependency validation script for claudekit
 * Ensures all runtime dependencies are properly declared in package.json
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '../package.json');
const distPath = join(__dirname, '../dist');

console.log('🔍 Validating production dependencies...\n');

// Node.js built-in modules (should not be in dependencies)
const nodeBuiltins = new Set([
  'assert', 'buffer', 'child_process', 'cluster', 'console', 'constants', 
  'crypto', 'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'https', 
  'module', 'net', 'os', 'path', 'process', 'querystring', 'readline', 
  'repl', 'stream', 'string_decoder', 'sys', 'timers', 'tls', 'tty', 
  'url', 'util', 'vm', 'zlib', 'worker_threads', 'perf_hooks', 'async_hooks',
  'inspector', 'trace_events', 'punycode', 'v8', 'http2'
]);

function isNodeBuiltin(moduleName) {
  return nodeBuiltins.has(moduleName);
}

// Read package.json
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const dependencies = new Set(Object.keys(packageJson.dependencies || {}));

// Check if dist directory exists
if (!existsSync(distPath)) {
  console.error('❌ dist/ directory not found. Run npm run build first.');
  process.exit(1);
}

// Patterns for external dependencies that should NOT be bundled
const expectedExternals = [
  'node:',           // Node.js built-ins
  'fs-extra',        // File system operations (native dependencies)
  '@inquirer/prompts', // Interactive CLI (complex dependencies)
  'commander',       // CLI framework (commonly external)
  'ora',            // Progress spinners (terminal specific)
  'oh-my-logo'      // Logo display (terminal specific)
];

// Patterns for dependencies that SHOULD be bundled
const shouldBeBundled = [
  'chalk',          // Color utilities (small, pure JS)
  'glob',           // File globbing (small, pure JS)
  'picomatch',      // Pattern matching (small, pure JS)
  'picocolors',     // Minimal color library
  'gray-matter',    // YAML frontmatter parser
  'zod'             // Schema validation
];

// Transitive dependencies that may appear external but are acceptable
// if their parent is in production dependencies
const transitiveAllowed = {
  'esprima': 'gray-matter',  // esprima is transitive dep of gray-matter
  'js-yaml': 'gray-matter'   // js-yaml is transitive dep of gray-matter
};

console.log('📦 Dependencies that should be EXTERNAL (not bundled):');
expectedExternals.forEach(dep => {
  if (!dep.startsWith('node:')) {
    const status = dependencies.has(dep) ? '✅' : '❌';
    console.log(`  ${status} ${dep} ${!dependencies.has(dep) ? '(missing from dependencies!)' : ''}`);
  } else {
    console.log(`  ✅ ${dep} (Node.js built-in)`);
  }
});

console.log('\n📦 Dependencies that should be BUNDLED:');
shouldBeBundled.forEach(dep => {
  const status = dependencies.has(dep) ? '✅' : '❌';
  console.log(`  ${status} ${dep} ${!dependencies.has(dep) ? '(missing from dependencies!)' : ''}`);
});

// Validation checks
let hasErrors = false;

// Check 1: All external dependencies are in package.json dependencies
const missingProduction = expectedExternals.filter(dep => 
  !dep.startsWith('node:') && !dependencies.has(dep)
);

if (missingProduction.length > 0) {
  console.error('\n❌ Missing production dependencies for external packages:');
  missingProduction.forEach(dep => console.error(`  - ${dep}`));
  hasErrors = true;
}

// Check 2: All bundled dependencies are in package.json dependencies
const missingBundled = shouldBeBundled.filter(dep => !dependencies.has(dep));

if (missingBundled.length > 0) {
  console.error('\n❌ Missing production dependencies for bundled packages:');
  missingBundled.forEach(dep => console.error(`  - ${dep}`));
  hasErrors = true;
}

// Check 3: Validate built files exist
const expectedBuilds = ['cli.js', 'hooks-cli.js', 'index.js'];
const missingBuilds = expectedBuilds.filter(file => 
  !existsSync(join(distPath, file))
);

if (missingBuilds.length > 0) {
  console.error('\n❌ Missing build artifacts:');
  missingBuilds.forEach(file => console.error(`  - dist/${file}`));
  hasErrors = true;
}

// Check 4: Analyze built files for external imports
console.log('\n🔍 Analyzing built files for external imports...');
const builtFiles = expectedBuilds.filter(file => existsSync(join(distPath, file)));

for (const file of builtFiles) {
  const content = readFileSync(join(distPath, file), 'utf8');
  
  // Look for import/require patterns that might indicate unbundled dependencies
  const importMatches = content.match(/(?:import.*from\s*['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g);
  
  if (importMatches) {
    const externalImports = importMatches
      .map(match => {
        const moduleMatch = match.match(/['"]([^'"]+)['"]/);
        return moduleMatch ? moduleMatch[1] : null;
      })
      .filter(Boolean)
      .filter(mod => !mod.startsWith('node:') && !mod.startsWith('.') && !mod.startsWith('/'))
      .filter(mod => !isNodeBuiltin(mod))
      .filter((mod, index, arr) => arr.indexOf(mod) === index); // dedupe
    
    if (externalImports.length > 0) {
      console.log(`  📄 ${file}:`);
      for (const imp of externalImports) {
        const isInDeps = dependencies.has(imp);
        const isTransitiveAllowed = transitiveAllowed[imp] && dependencies.has(transitiveAllowed[imp]);
        const isValid = isInDeps || isTransitiveAllowed;
        
        const status = isValid ? '✅' : '❌';
        let message = '';
        if (!isInDeps && isTransitiveAllowed) {
          message = `(transitive of ${transitiveAllowed[imp]})`;
        } else if (!isValid) {
          message = '(NOT in dependencies!)';
        }
        
        console.log(`    ${status} ${imp} ${message}`);
        if (!isValid) {
          hasErrors = true;
        }
      }
    } else {
      console.log(`  📄 ${file}: ✅ No external imports found`);
    }
  }
}

// Summary
if (hasErrors) {
  console.error('\n💥 Dependency validation failed!');
  console.error('\nTo fix:');
  console.error('1. Move missing packages from devDependencies to dependencies in package.json');
  console.error('2. Run npm install to update node_modules');
  console.error('3. Run npm run build to regenerate bundle');
  console.error('4. Re-run this validation script');
  process.exit(1);
} else {
  console.log('\n✅ All dependency validations passed!');
  console.log('✅ Build artifacts are present');
  console.log('✅ External dependencies are in production dependencies');
  console.log('✅ Bundled dependencies are in production dependencies');
  console.log('✅ No unbundled imports found in built files');
}