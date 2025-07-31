/**
 * Hook Utilities
 * Common utilities for hook implementation
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import * as path from 'path';
import { Logger } from '../utils/logger.js';

const logger = new Logger('utils');

const execAsync = promisify(exec);

// Standard input reader
export async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => resolve(data));
    setTimeout(() => resolve(''), 1000); // Timeout fallback
  });
}

// Project root discovery
export async function findProjectRoot(startDir: string = process.cwd()): Promise<string> {
  try {
    const { stdout } = await execAsync('git rev-parse --show-toplevel', { cwd: startDir });
    return stdout.trim();
  } catch {
    return process.cwd();
  }
}

// Package manager detection
export interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm';
  exec: string;
  run: string;
  test: string;
}

export async function detectPackageManager(dir: string): Promise<PackageManager> {
  if (await fs.pathExists(path.join(dir, 'pnpm-lock.yaml'))) {
    return { name: 'pnpm', exec: 'pnpm dlx', run: 'pnpm run', test: 'pnpm test' };
  }
  if (await fs.pathExists(path.join(dir, 'yarn.lock'))) {
    return { name: 'yarn', exec: 'yarn dlx', run: 'yarn', test: 'yarn test' };
  }
  if (await fs.pathExists(path.join(dir, 'package.json'))) {
    // Check packageManager field
    try {
      const pkg = await fs.readJson(path.join(dir, 'package.json'));
      if (pkg.packageManager?.startsWith('pnpm')) {
        return { name: 'pnpm', exec: 'pnpm dlx', run: 'pnpm run', test: 'pnpm test' };
      }
      if (pkg.packageManager?.startsWith('yarn')) {
        return { name: 'yarn', exec: 'yarn dlx', run: 'yarn', test: 'yarn test' };
      }
    } catch {}
  }
  return { name: 'npm', exec: 'npx', run: 'npm run', test: 'npm test' };
}

// Command execution wrapper
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function execCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
): Promise<ExecResult> {
  const fullCommand = command + ' ' + args.join(' ');
  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: options.cwd || process.cwd(),
      timeout: options.timeout || 30000,
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.code || 1
    };
  }
}

// Error formatting
export function formatError(
  title: string,
  details: string,
  instructions: string[]
): string {
  const instructionsList = instructions
    .map((inst, i) => `${i + 1}. ${inst}`)
    .join('\n');
    
  return `BLOCKED: ${title}\n\n${details}\n\nMANDATORY INSTRUCTIONS:\n${instructionsList}`;
}

// Tool availability checking
export async function checkToolAvailable(
  tool: string,
  configFile: string,
  projectRoot: string
): Promise<boolean> {
  // Check config file exists
  if (!await fs.pathExists(path.join(projectRoot, configFile))) {
    return false;
  }
  
  // Check tool is executable
  const pm = await detectPackageManager(projectRoot);
  const result = await execCommand(pm.exec, [tool, '--version'], {
    cwd: projectRoot,
    timeout: 10000
  });
  
  return result.exitCode === 0;
}

/**
 * Execute a shell command and return the output
 */
export async function executeCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, { cwd });
    return result;
  } catch (error: any) {
    logger.error(error instanceof Error ? error : new Error(`Command failed: ${command}`));
    throw error;
  }
}

/**
 * Check if a file exists
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    return await fs.pathExists(filePath);
  } catch {
    return false;
  }
}

/**
 * Read JSON file
 */
export async function readJsonFile<T = any>(filePath: string): Promise<T> {
  return await fs.readJson(filePath);
}

/**
 * Write JSON file
 */
export async function writeJsonFile(filePath: string, data: any): Promise<void> {
  await fs.writeJson(filePath, data, { spaces: 2 });
}

/**
 * Find files matching a pattern
 */
export async function findFiles(pattern: string, directory: string): Promise<string[]> {
  const { stdout } = await executeCommand(`find . -name "${pattern}"`, directory);
  return stdout
    .split('\n')
    .filter(Boolean)
    .map(file => path.join(directory, file));
}

/**
 * Get file modification time
 */
export async function getFileModTime(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

/**
 * Create directory if it doesn't exist
 */
export async function ensureDirectory(dirPath: string): Promise<void> {
  await fs.ensureDir(dirPath);
}

/**
 * Parse hook payload from stdin
 */
export async function parseStdinPayload(): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = '';
    
    process.stdin.on('data', chunk => {
      data += chunk;
    });
    
    process.stdin.on('end', () => {
      try {
        const payload = JSON.parse(data);
        resolve(payload);
      } catch (error) {
        reject(new Error('Invalid JSON payload'));
      }
    });
    
    process.stdin.on('error', reject);
  });
}

/**
 * Extract file paths from hook payload
 */
export function extractFilePaths(payload: any): string[] {
  const paths: string[] = [];
  
  // Check common payload structures
  if (payload.file_path) {
    paths.push(payload.file_path);
  }
  
  if (payload.tool_input?.file_path) {
    paths.push(payload.tool_input.file_path);
  }
  
  if (payload.edits && Array.isArray(payload.edits)) {
    payload.edits.forEach((edit: any) => {
      if (edit.file_path) {
        paths.push(edit.file_path);
      }
    });
  }
  
  return [...new Set(paths)]; // Remove duplicates
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}