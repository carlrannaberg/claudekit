#!/usr/bin/env node
import { readFileSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import * as path from 'path';

// Simple config interface
interface Config {
  hooks?: {
    'auto-checkpoint'?: {
      prefix?: string;
      maxCheckpoints?: number;
    };
  };
}

// Read stdin payload
async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(''), 1000); // Timeout fallback
  });
}

// Main execution
async function main() {
  const hookName = process.argv[2];
  
  if (hookName !== 'auto-checkpoint') {
    console.error(`Unknown hook: ${hookName}`);
    process.exit(1);
  }
  
  // Load config if exists
  let config: Config = {};
  const configPath = path.join(process.cwd(), '.claudekit/config.json');
  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (e) {
      console.error('Invalid config file');
    }
  }
  
  // Get hook config
  const hookConfig = config.hooks?.['auto-checkpoint'] || {};
  const prefix = hookConfig.prefix || 'claude';
  const maxCheckpoints = hookConfig.maxCheckpoints || 10;
  
  // Check if git repo
  const gitStatus = spawn('git', ['status', '--porcelain'], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  gitStatus.stdout.on('data', (data) => stdout += data);

  gitStatus.on('close', (code) => {
    if (code !== 0) {
      console.log('Not a git repository, skipping checkpoint');
      process.exit(0);
    }
    
    // Check if there are changes
    if (!stdout.trim()) {
      console.log('No changes to checkpoint');
      process.exit(0);
    }
    
    // Create checkpoint
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const message = `${prefix}-checkpoint-${timestamp}`;
    
    const stash = spawn('git', ['stash', 'push', '-m', message], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    stash.on('close', (stashCode) => {
      if (stashCode !== 0) {
        console.error('Failed to create checkpoint');
        process.exit(1);
      }
      
      // Apply stash to restore working directory
      spawn('git', ['stash', 'apply'], {
        stdio: 'ignore'
      }).on('close', () => {
        console.log(`✅ Checkpoint created: ${message}`);
        process.exit(0);
      });
    });
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});