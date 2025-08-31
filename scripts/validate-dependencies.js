#!/usr/bin/env node

/**
 * Dependency validation script for claudekit
 * Analyzes TypeScript source files to validate imports against package.json
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packagePath = join(__dirname, '../package.json');
const distPath = join(__dirname, '../dist');

console.log('🔍 Validating production dependencies by analyzing source files...\n');

// Check if dist directory exists
if (!existsSync(distPath)) {
  console.error('❌ dist/ directory not found. Run npm run build first.');
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
const declaredDependencies = new Set(Object.keys(packageJson.dependencies || {}));

// Known externals that should not be bundled
const expectedExternals = [
  'react-devtools-core',    // Optional dependency that causes esbuild issues
  'oh-my-logo'              // Has ink dependency that causes esbuild issues  
];
const optionalExternals = new Set(['react-devtools-core']); // Don't need to be in dependencies

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
  // Handle both 'fs' and 'node:fs' formats
  return nodeBuiltins.has(moduleName) || 
         (moduleName.startsWith('node:') && nodeBuiltins.has(moduleName.slice(5)));
}

function extractPackageName(importPath) {
  // Handle scoped packages (@scope/package)
  if (importPath.startsWith('@')) {
    const scopeMatch = importPath.match(/^(@[^/]+\/[^/]+)/);
    return scopeMatch ? scopeMatch[1] : null;
  }
  
  // Handle regular packages (package or package/subpath)
  const packageMatch = importPath.match(/^([^/]+)/);
  return packageMatch ? packageMatch[1] : null;
}

// Analyze TypeScript source files for actual imports
console.log('📊 Analyzing TypeScript source files for imports...\n');

const actualImports = new Set();

try {
  // Get all TypeScript files in the cli directory
  const tsFilesOutput = execSync('find cli -name "*.ts" -type f', { encoding: 'utf8' }).trim();
  const tsFiles = tsFilesOutput ? tsFilesOutput.split('\n') : [];
  
  console.log(`Found ${tsFiles.length} TypeScript files to analyze`);
  
  for (const filePath of tsFiles) {
    if (!existsSync(filePath)) {
      continue;
    }
    
    const content = readFileSync(filePath, 'utf8');
    
    // Extract import statements using regex
    const importRegexes = [
      /import\s+(?:(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"])/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g // dynamic imports
    ];
    
    for (const regex of importRegexes) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip relative imports (./foo, ../foo)
        if (importPath.startsWith('.')) {
          continue;
        }
        
        // Skip Node.js built-ins
        if (isNodeBuiltin(importPath)) {
          continue;
        }
        
        // Extract package name
        const packageName = extractPackageName(importPath);
        if (packageName && !isNodeBuiltin(packageName)) {
          actualImports.add(packageName);
        }
      }
    }
  }
  
} catch (error) {
  console.error(`❌ Failed to analyze source files: ${error.message}`);
  process.exit(1);
}

console.log(`\n📦 Analysis Results:`);
console.log(`  • TypeScript files analyzed: Found import statements`);
console.log(`  • Actual imports found: ${actualImports.size}`);

console.log('\n📋 ACTUAL IMPORTS (from source code analysis):');
const sortedActualImports = Array.from(actualImports).sort();
sortedActualImports.forEach(dep => {
  const inPackageJson = declaredDependencies.has(dep);
  const status = inPackageJson ? '✅' : '❌';
  const note = inPackageJson ? '' : ' (MISSING from package.json!)';
  console.log(`  ${status} ${dep}${note}`);
});

// Validation checks
console.log('\n🔍 Validation Results:\n');

let hasErrors = false;

// Check 1: All actual imports should be in package.json dependencies
const missingFromPackageJson = sortedActualImports.filter(dep => !declaredDependencies.has(dep));

if (missingFromPackageJson.length > 0) {
  console.error('❌ MISSING DEPENDENCIES: These packages are imported but not in package.json:');
  missingFromPackageJson.forEach(dep => console.error(`  - ${dep}`));
  console.error(`   Fix: npm install --save ${missingFromPackageJson.join(' ')}`);
  hasErrors = true;
}

// Check 2: Find unused dependencies (in package.json but never imported)
const unusedDependencies = Array.from(declaredDependencies).filter(dep => 
  !actualImports.has(dep) && !expectedExternals.includes(dep)
);

if (unusedDependencies.length > 0) {
  console.log('⚠️  UNUSED DEPENDENCIES: These packages are in package.json but never imported:');
  unusedDependencies.forEach(dep => console.log(`  - ${dep}`));
  console.log(`   Consider: npm uninstall ${unusedDependencies.join(' ')}`);
  // Don't treat unused deps as hard errors, just warnings
}

// Check 3: Validate expected externals
const missingExternals = expectedExternals.filter(dep => 
  !optionalExternals.has(dep) && !declaredDependencies.has(dep)
);

if (missingExternals.length > 0) {
  console.error('❌ MISSING EXTERNAL DEPENDENCIES:');
  missingExternals.forEach(dep => console.error(`  - ${dep} (should be external but missing from package.json)`));
  hasErrors = true;
}

// Check 4: Validate built files exist  
const expectedBuilds = ['cli.cjs', 'hooks-cli.cjs', 'index.cjs'];
const missingBuilds = expectedBuilds.filter(file => !existsSync(join(distPath, file)));

if (missingBuilds.length > 0) {
  console.error('❌ MISSING BUILD ARTIFACTS:');
  missingBuilds.forEach(file => console.error(`  - dist/${file}`));
  hasErrors = true;
}

// Summary
if (hasErrors) {
  console.error('\n💥 Dependency validation failed!\n');
  console.error('To fix:');
  console.error('1. Add missing dependencies to package.json');  
  console.error('2. Run npm install');
  console.error('3. Run npm run build to regenerate bundles');
  console.error('4. Re-run this validation script');
  process.exit(1);
} else {
  console.log('✅ All dependency validations passed!');
  console.log('✅ All actual imports are declared in package.json');
  console.log('✅ All external dependencies are properly configured');
  console.log('✅ All build artifacts are present');
  
  if (unusedDependencies.length > 0) {
    console.log('ℹ️  Note: Found unused dependencies (warnings only)');
  }
}