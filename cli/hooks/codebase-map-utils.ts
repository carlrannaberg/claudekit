/**
 * Shared utilities for codebase-map functionality
 * Used by both codebase-map and codebase-context hooks
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { checkToolAvailable } from './utils.js';

const execAsync = promisify(exec);

export interface CodebaseMapConfig {
  include?: string[];
  exclude?: string[];
  format?: 'auto' | 'json' | 'dsl' | 'graph' | 'markdown' | 'tree' | string;
}

export interface CodebaseMapOptions {
  include?: string[] | undefined;
  exclude?: string[] | undefined;
  format?: string | undefined;
  projectRoot: string;
}

export interface CodebaseMapResult {
  success: boolean;
  output?: string;
  error?: Error;
}

/**
 * Generate a codebase map for the project
 */
export async function generateCodebaseMap(options: CodebaseMapOptions): Promise<CodebaseMapResult> {
  // Check if codebase-map is installed
  if (!(await checkToolAvailable('codebase-map', 'package.json', options.projectRoot))) {
    return {
      success: false,
      error: new Error(
        'codebase-map CLI not found. Install it from: https://github.com/carlrannaberg/codebase-map'
      ),
    };
  }

  try {
    // First, scan the project to create/update the index (scan everything for comprehensive index)
    const scanCommand = 'codebase-map scan';
    await execAsync(scanCommand, {
      cwd: options.projectRoot,
      maxBuffer: 10 * 1024 * 1024,
    });

    // Then format and get the result with filtering
    let formatCommand = `codebase-map format --format ${options.format ?? 'auto'}`;
    
    // Add include patterns if specified
    if (options.include && options.include.length > 0) {
      const includeArgs = options.include.map(pattern => `--include "${pattern}"`).join(' ');
      formatCommand += ` ${includeArgs}`;
    }
    
    // Add exclude patterns if specified
    if (options.exclude && options.exclude.length > 0) {
      const excludeArgs = options.exclude.map(pattern => `--exclude "${pattern}"`).join(' ');
      formatCommand += ` ${excludeArgs}`;
    }
    
    // Debug output to show exact command being run
    if (process.env['DEBUG'] === 'true') {
      console.error('Running codebase-map command:', formatCommand);
    }
    
    const { stdout } = await execAsync(formatCommand, {
      cwd: options.projectRoot,
      maxBuffer: 10 * 1024 * 1024,
    });

    return { success: true, output: stdout?.trim() };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Update codebase map for a specific file
 */
export async function updateCodebaseMap(
  filePath: string,
  projectRoot: string
): Promise<boolean> {
  if (!(await checkToolAvailable('codebase-map', 'package.json', projectRoot))) {
    return false;
  }

  try {
    const updateCommand = `codebase-map update "${filePath}"`;
    await execAsync(updateCommand, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
    return true;
  } catch {
    // Silent failure for updates to avoid disrupting workflow
    return false;
  }
}
