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
    process.stdin.on('data', (chunk) => (data += chunk));
    process.stdin.on('end', () => resolve(data));
    // No timeout - wait indefinitely for input
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
      const pkg = (await fs.readJson(path.join(dir, 'package.json'))) as {
        packageManager?: string;
      };
      if (pkg.packageManager !== undefined && typeof pkg.packageManager === 'string') {
        if (pkg.packageManager.startsWith('pnpm') === true) {
          return { name: 'pnpm', exec: 'pnpm dlx', run: 'pnpm run', test: 'pnpm test' };
        }
        if (pkg.packageManager.startsWith('yarn') === true) {
          return { name: 'yarn', exec: 'yarn dlx', run: 'yarn', test: 'yarn test' };
        }
      }
    } catch {
      // Ignore errors reading package.json
      // This is expected when package.json doesn't exist or is malformed
    }
  }
  return { name: 'npm', exec: 'npx', run: 'npm run', test: 'npm test' };
}

// Command execution wrapper
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  /** True when the process was killed due to timeout */
  timedOut?: boolean;
  /** Signal used to terminate the process, if any (e.g., SIGTERM) */
  signal?: string | null;
  /** Whether the process was killed */
  killed?: boolean;
  /** Elapsed time in milliseconds for the executed command */
  durationMs?: number;
}

export async function execCommand(
  command: string,
  args: string[] = [],
  options: { cwd?: string; timeout?: number } = {}
): Promise<ExecResult> {
  const fullCommand = `${command} ${args.join(' ')}`.trim();
  const start = Date.now();
  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      cwd: options.cwd ?? process.cwd(),
      timeout: options.timeout ?? 30000,
      maxBuffer: 1024 * 1024 * 10, // 10MB
    });
    const durationMs = Date.now() - start;
    return { stdout, stderr, exitCode: 0, durationMs, timedOut: false };
  } catch (error) {
    const durationMs = Date.now() - start;
    const execError = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
      killed?: boolean;
      signal?: string | null;
      timedOut?: boolean; // some environments
    };

    // Robust timeout detection:
    // - child_process.exec sets error.killed=true and error.signal='SIGTERM' when timed out
    // - some runtimes set error.timedOut=true
    // - as a fallback, if a timeout was specified and elapsed time >= timeout - small delta, treat as timeout
    const requestedTimeout = options.timeout ?? 30000;
    const elapsedNearTimeout = durationMs >= Math.max(0, requestedTimeout - 25);
    const didTimeOut =
      execError.timedOut === true ||
      (execError.killed === true &&
        (execError.signal === 'SIGTERM' || execError.signal === 'SIGKILL')) ||
      elapsedNearTimeout;

    return {
      stdout: execError.stdout ?? '',
      stderr: execError.stderr ?? '',
      exitCode: execError.code ?? 1,
      timedOut: didTimeOut,
      signal: execError.signal ?? null,
      killed: execError.killed ?? false,
      durationMs,
    };
  }
}

// Error formatting
export function formatError(title: string, details: string, instructions: string[]): string {
  const instructionsList = instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n');

  return `BLOCKED: ${title}\n\n${details}\n\nMANDATORY INSTRUCTIONS:\n${instructionsList}`;
}

// Tool availability checking
export async function checkToolAvailable(
  tool: string,
  configFile: string,
  projectRoot: string
): Promise<boolean> {
  // Check config file exists
  if (!(await fs.pathExists(path.join(projectRoot, configFile)))) {
    return false;
  }

  // Check tool is executable
  const pm = await detectPackageManager(projectRoot);
  const result = await execCommand(pm.exec, [tool, '--version'], {
    cwd: projectRoot,
    timeout: 10000,
  });

  return result.exitCode === 0;
}

/**
 * Execute a shell command and return the output
 */
export async function executeCommand(
  command: string,
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, { cwd });
    return result;
  } catch (error) {
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
export async function readJsonFile<T = unknown>(filePath: string): Promise<T> {
  return await fs.readJson(filePath);
}

/**
 * Write JSON file
 */
export async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
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
    .map((file) => path.join(directory, file));
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
export async function parseStdinPayload(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = '';

    process.stdin.on('data', (chunk) => {
      data += chunk;
    });

    process.stdin.on('end', () => {
      try {
        const payload = JSON.parse(data);
        resolve(payload);
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });

    process.stdin.on('error', reject);
  });
}

/**
 * Extract file paths from hook payload
 */
export function extractFilePaths(payload: unknown): string[] {
  const paths: string[] = [];

  if (payload === null || payload === undefined || typeof payload !== 'object') {
    return paths;
  }

  const obj = payload as Record<string, unknown>;

  // Check common payload structures
  if (typeof obj['file_path'] === 'string') {
    paths.push(obj['file_path']);
  }

  if (
    obj['tool_input'] !== null &&
    obj['tool_input'] !== undefined &&
    typeof obj['tool_input'] === 'object'
  ) {
    const toolInput = obj['tool_input'] as Record<string, unknown>;
    if (typeof toolInput['file_path'] === 'string') {
      paths.push(toolInput['file_path']);
    }
  }

  if (obj['edits'] !== null && obj['edits'] !== undefined && Array.isArray(obj['edits'])) {
    obj['edits'].forEach((edit: unknown) => {
      if (edit !== null && edit !== undefined && typeof edit === 'object') {
        const editObj = edit as Record<string, unknown>;
        if (typeof editObj['file_path'] === 'string') {
          paths.push(editObj['file_path']);
        }
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

/**
 * Format TypeScript errors with proper indentation
 */
export function formatTypeScriptErrors(result: ExecResult, command?: string): string {
  const header = '████ TypeScript Validation Failed ████\n\n';
  const message = 'TypeScript compilation errors must be fixed:\n\n';
  const output = result.stderr || result.stdout;
  const indentedOutput = output
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  const step2 = command !== undefined && command !== null && command.length > 0
    ? `2. Run '${command}' to verify fixes`
    : '2. Run type checking command to verify fixes';
  
  const actions = `

REQUIRED ACTIONS:
1. Fix all TypeScript errors shown above
${step2}
3. Make necessary corrections
4. The validation will run again automatically`;

  return header + message + indentedOutput + actions;
}

/**
 * Format ESLint errors with proper indentation
 */
export function formatESLintErrors(result: ExecResult): string {
  const header = '████ ESLint Validation Failed ████\n\n';
  const message = 'ESLint errors must be fixed:\n\n';
  const output = result.stdout || result.stderr;
  const indentedOutput = output
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  const actions =
    '\n\nREQUIRED ACTIONS:\n' +
    '1. Fix all ESLint errors shown above\n' +
    '2. Run lint command to verify fixes\n' +
    '3. Make necessary corrections\n' +
    '4. The validation will run again automatically';

  return header + message + indentedOutput + actions;
}

/**
 * Format test errors with proper indentation
 */
export function formatTestErrors(result: ExecResult): string {
  const header = '████ Test Suite Failed ████\n\n';
  const message = 'Test failures must be fixed:\n\n';
  const output = result.stdout + result.stderr;
  const indentedOutput = output
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

  const actions =
    '\n\nREQUIRED ACTIONS:\n' +
    '1. Fix all test failures shown above\n' +
    '2. Run test command to verify fixes\n' +
    '3. Make necessary corrections\n' +
    '4. The validation will run again automatically';

  return header + message + indentedOutput + actions;
}
