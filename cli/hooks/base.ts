/**
 * BaseHook Abstract Class
 * Provides the foundation for all Claude Code hooks
 */

import fs from 'fs-extra';
import * as path from 'path';
import { execCommand, detectPackageManager, formatError, findProjectRoot } from './utils.js';
import type { ExecResult, PackageManager } from './utils.js';

export interface ClaudePayload {
  tool_name?: string;
  tool_input?: {
    file_path?: string;
    [key: string]: unknown;
  };
  stop_hook_active?: boolean;
  transcript_path?: string;
  [key: string]: unknown;
}

export interface HookContext {
  filePath?: string | undefined;
  projectRoot: string;
  payload: ClaudePayload;
  packageManager: PackageManager;
}

export interface HookResult {
  exitCode: number;
  suppressOutput?: boolean;
  jsonResponse?: unknown;
  hookSpecificOutput?: {
    hookEventName?: string;
    permissionDecision?: 'allow' | 'deny';
    permissionDecisionReason?: string;
    [key: string]: unknown;
  };
}

export interface HookConfig {
  command?: string;
  timeout?: number;
  [key: string]: unknown; // Hook-specific config
}

export interface HookMetadata {
  id: string;
  displayName: string;
  description: string;
  category: 'validation' | 'testing' | 'git' | 'project-management' | 'utility';
  triggerEvent:
    | 'PostToolUse'
    | 'PreToolUse'
    | 'Stop'
    | 'SubagentStop'
    | 'SessionStart'
    | ('Stop' | 'SubagentStop')[];
  matcher?: string; // Tool patterns that trigger this hook (e.g., "Write|Edit|MultiEdit")
  dependencies?: string[];
}

export abstract class BaseHook {
  abstract name: string;
  protected config: HookConfig;
  protected debug: boolean;

  constructor(config: HookConfig = {}) {
    this.config = config;
    this.debug = process.env['CLAUDEKIT_DEBUG'] === 'true' || false;
  }

  // Main execution method - implements common flow
  async run(payload: ClaudePayload): Promise<HookResult> {
    // Check for infinite loop prevention
    if (payload.stop_hook_active === true) {
      return { exitCode: 0 };
    }

    // Extract file path if present
    const filePath = payload.tool_input?.file_path;

    // Find project root
    const projectRoot = await findProjectRoot(
      filePath !== undefined && filePath !== '' ? path.dirname(filePath) : process.cwd()
    );

    // Detect package manager
    const packageManager = await detectPackageManager(projectRoot);

    // Create context
    const context: HookContext = {
      filePath,
      projectRoot,
      payload,
      packageManager,
    };

    // Execute hook-specific logic
    return this.execute(context);
  }

  // Hook-specific implementation
  abstract execute(context: HookContext): Promise<HookResult>;

  // Common utilities
  protected async execCommand(
    command: string,
    args: string[] = [],
    options?: { cwd?: string; timeout?: number }
  ): Promise<ExecResult> {
    const mergedOptions: { cwd?: string; timeout?: number } = {
      ...options,
    };

    // Only set timeout if it's defined in either config or options
    if (this.config.timeout !== undefined) {
      mergedOptions.timeout = this.config.timeout;
    }
    if (options?.timeout !== undefined) {
      mergedOptions.timeout = options.timeout;
    }

    if (this.debug) {
      console.error(`[DEBUG] Executing command: ${command} ${args.join(' ')}`);
      console.error(`[DEBUG] Command options:`, mergedOptions);
    }

    const result = await execCommand(command, args, mergedOptions);

    if (this.debug) {
      console.error(`[DEBUG] Command exit code: ${result.exitCode}`);
      console.error(`[DEBUG] Command stdout length: ${result.stdout.length}`);
      console.error(`[DEBUG] Command stderr length: ${result.stderr.length}`);
      if (result.exitCode !== 0) {
        console.error(`[DEBUG] Command stderr:`, result.stderr);
      }
    }

    return result;
  }

  // Progress message to stderr
  protected progress(message: string): void {
    console.error(message);
  }

  // Success message to stderr
  protected success(message: string): void {
    console.error(`✅ ${message}`);
  }

  // Warning message to stderr
  protected warning(message: string): void {
    console.error(`⚠️  ${message}`);
  }

  // Error output with instructions
  protected error(title: string, details: string, instructions: string[]): void {
    console.error(formatError(title, details, instructions));
  }

  // Silent JSON output
  protected jsonOutput(data: unknown): void {
    console.log(JSON.stringify(data));
  }

  // File operations
  protected async fileExists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  protected async readFile(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  // Skip conditions
  protected shouldSkipFile(filePath: string | undefined, extensions: string[]): boolean {
    if (filePath === undefined || filePath === '') {
      return true;
    }
    if (!extensions.some((ext) => filePath.endsWith(ext))) {
      return true;
    }
    return false;
  }
}
