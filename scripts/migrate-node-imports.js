#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import fastGlob from 'fast-glob';

const NODE_BUILTINS = [
  'fs', 'fs/promises', 'path', 'crypto', 'child_process', 
  'os', 'url', 'util', 'stream', 'buffer', 'events', 
  'net', 'http', 'https', 'readline', 'zlib', 'timers',
  'perf_hooks', 'assert', 'cluster', 'console', 'dgram',
  'dns', 'domain', 'process', 'querystring', 'repl',
  'string_decoder', 'sys', 'tls', 'tty', 'vm',
  'worker_threads', 'async_hooks', 'inspector', 
  'trace_events', 'punycode', 'v8', 'http2'
];

async function migrateFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;
  
  for (const builtin of NODE_BUILTINS) {
    // Skip if already has node: prefix
    if (content.includes(`'node:${builtin}'`) || content.includes(`"node:${builtin}"`)) {
      continue;
    }
    
    // Handle various import patterns
    const patterns = [
      // ES6 imports
      { from: `from '${builtin}'`, to: `from 'node:${builtin}'` },
      { from: `from "${builtin}"`, to: `from "node:${builtin}"` },
      // CommonJS requires
      { from: `require('${builtin}')`, to: `require('node:${builtin}')` },
      { from: `require("${builtin}")`, to: `require("node:${builtin}")` },
    ];
    
    for (const { from, to } of patterns) {
      if (content.includes(from)) {
        content = content.replace(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), to);
        modified = true;
      }
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content);
    console.log(`✅ Migrated: ${filePath}`);
    return true;
  }
  return false;
}

async function main() {
  console.log('🔍 Scanning for files to migrate...\n');
  
  const files = await fastGlob('**/*.{ts,js,mjs,cjs}', {
    ignore: ['node_modules/**', 'dist/**', 'temp/**', '.claude/**', 'scripts/migrate-node-imports.js']
  });
  
  let count = 0;
  for (const file of files) {
    if (await migrateFile(file)) {
      count++;
    }
  }
  
  console.log(`\n✅ Migrated ${count} files to use node: prefix`);
  
  if (count > 0) {
    console.log('\n📝 Next steps:');
    console.log('1. Run: npm run build');
    console.log('2. Run: npm run validate:deps');
    console.log('3. Run: npm test');
    console.log('4. Commit the changes');
  }
}

main().catch(console.error);