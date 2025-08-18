/**
 * Shared utilities for codebase-map functionality
 * Used by both codebase-map and codebase-context hooks
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { checkToolAvailable } from './utils.js';

const execAsync = promisify(exec);

export interface CodebaseMapConfig {
  command?: string;
  format?: 'auto' | 'json' | 'dsl' | 'graph' | 'markdown' | string;
  updateOnChanges?: boolean;
}

export interface CodebaseMapOptions {
  command?: string | undefined;
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
      error: new Error('codebase-map CLI not found. Install it from: https://github.com/carlrannaberg/codebase-map')
    };
  }

  try {
    // First, scan the project to create/update the index
    const scanCommand = options.command ?? 'codebase-map scan';
    await execAsync(scanCommand, {
      cwd: options.projectRoot,
      maxBuffer: 10 * 1024 * 1024
    });

    // Then format and get the result
    const formatCommand = `codebase-map format --format ${options.format ?? 'auto'}`;
    const { stdout } = await execAsync(formatCommand, {
      cwd: options.projectRoot,
      maxBuffer: 10 * 1024 * 1024
    });

    return { success: true, output: stdout?.trim() };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Update codebase map for a specific file
 */
export async function updateCodebaseMap(filePath: string, projectRoot: string, command?: string): Promise<boolean> {
  if (!(await checkToolAvailable('codebase-map', 'package.json', projectRoot))) {
    return false;
  }

  try {
    const updateCommand = command ?? `codebase-map update "${filePath}"`;
    await execAsync(updateCommand, {
      cwd: projectRoot,
      maxBuffer: 10 * 1024 * 1024
    });
    return true;
  } catch {
    // Silent failure for updates to avoid disrupting workflow
    return false;
  }
}