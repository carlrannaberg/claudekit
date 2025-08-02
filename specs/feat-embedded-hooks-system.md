# Embedded Hooks System

**Status**: Draft  
**Authors**: Claude, 2025-07-29  
**Type**: Feature  
**POC**: ✅ [Completed](feat-embedded-hooks-system-poc.md)

## Overview

Migrate existing shell script hooks to TypeScript and package them in a dedicated `claudekit-hooks` executable. Hooks will be invoked through `claudekit-hooks [hookname]` commands in Claude Code settings.json, with per-hook configuration stored in `.claudekit/config.json`.

## Background/Problem Statement

Currently, hooks are implemented as standalone shell scripts that must be copied to each project. This creates several issues:

### Current Implementation Issues
- **Distribution complexity**: Shell scripts must be copied to `.claude/hooks/`
- **No centralized configuration**: Hook-specific settings are hardcoded
- **Limited testability**: Shell scripts are harder to unit test
- **No type safety**: Configuration and execution lack type checking
- **Platform inconsistencies**: Shell scripts behave differently across OS

### Desired State
- Dedicated `claudekit-hooks` executable for all hook logic
- Hooks invoked via `claudekit-hooks [hookname]` 
- Per-hook configuration in `.claudekit/config.json`
- Full TypeScript implementation with type safety
- Clear separation between main CLI and hooks subsystem

### Why Hooks Instead of Direct Commands?

While tools like ESLint, TypeScript, and test runners can be called directly from Claude Code settings, hooks provide significant value:

1. **Context-Aware Execution**: Hooks receive Claude Code payloads (file paths, tools used) and can make intelligent decisions. For example, only running TypeScript checks on `.ts` files or only running tests related to changed files.

2. **Unified Error Formatting**: Hooks provide consistent, Claude-friendly error messages with clear instructions on how to fix issues. Direct tool output can be verbose and harder to parse.

3. **Project Configuration**: Hooks adapt to project-specific settings (timeouts, custom commands, tool versions) through `.claudekit/config.json` without modifying Claude Code settings.

4. **Graceful Fallbacks**: Hooks check for tool availability and project configuration before running, preventing errors in projects that don't use certain tools.

5. **Enhanced Validations**: Hooks can perform additional checks beyond the base tool, like detecting forbidden `any` types in TypeScript or ensuring checkpoint limits.

6. **Cross-Platform Consistency**: TypeScript hooks work consistently across Windows, macOS, and Linux, unlike shell commands that may vary.

## Goals

- ✅ **Dedicated hooks binary**: Separate `claudekit-hooks` executable
- ✅ **TypeScript implementation**: Rewrite shell scripts in TypeScript
- ✅ **Simple CLI interface**: `claudekit-hooks [hookname]` command
- ✅ **Per-hook configuration**: Configurable settings in `.claudekit/config.json`
- ✅ **Same behavior**: Maintain hook logic and exit codes (not shell compatibility)
- ✅ **Unix philosophy**: Separate tool for separate concern

## Non-Goals

- ❌ **Auto-discovery**: No automatic hook detection or registration
- ❌ **Hook metadata systems**: No complex metadata or capability definitions
- ❌ **Migration tools**: No automated migration from shell to TypeScript
- ❌ **Backward compatibility**: Shell script hooks will no longer be supported
- ❌ **Coverage requirements**: No minimum coverage percentages or coverage reporting
- ❌ **Edge case testing**: No tests for timeouts, malformed JSON, concurrent execution, or very large files
- ❌ **Platform-specific tests**: No Windows-specific or cross-platform path handling tests
- ❌ **Error scenario tests**: No tests for missing tools, permissions, or disk space issues
- ❌ **Performance tests**: No benchmarking, performance regression, or memory usage tests

## Technical Dependencies

### External Libraries
- **commander** (^14.0.0): CLI command routing
- **zod** (^3.24.1): Configuration validation
- **fs-extra** (^11.3.0): File operations

### Internal Dependencies
- `cli/cli.ts`: Main claudekit CLI entry point
- `cli/hooks-cli.ts`: Hooks binary entry point
- `cli/types/config.ts`: Configuration types

## Directory Structure

```
claudekit/
├── cli/
│   ├── cli.ts                    # Main claudekit CLI (existing)
│   ├── hooks-cli.ts              # New hooks CLI entry point
│   ├── hooks/
│   │   ├── base.ts               # BaseHook abstract class
│   │   ├── runner.ts             # HookRunner class
│   │   ├── registry.ts           # Hook registry
│   │   ├── typecheck.ts          # TypecheckHook implementation
│   │   ├── no-any.ts             # NoAnyHook implementation
│   │   ├── eslint.ts             # EslintHook implementation
│   │   ├── auto-checkpoint.ts    # AutoCheckpointHook implementation
│   │   ├── run-related-tests.ts  # RunRelatedTestsHook implementation
│   │   ├── project-validation.ts # ProjectValidationHook implementation
│   │   └── validate-todo.ts      # ValidateTodoCompletionHook implementation
│   └── types/
│       ├── config.ts             # Existing config types
│       └── hooks.ts              # New hook-specific types
├── bin/
│   ├── claudekit                 # Existing CLI wrapper
│   └── claudekit-hooks           # New hooks CLI wrapper
├── dist/                         # Built output
│   ├── cli.js                    # Main CLI
│   ├── hooks-cli.js              # Hooks CLI
│   └── ...                       # Other compiled files
├── .claudekit/                   # Project hook configuration
│   └── config.json               # Hook settings
├── .claude/                      # Claude Code configuration
│   └── settings.json             # Hook matchers
└── package.json                  # Updated with dual binaries
```

## Hook Execution Patterns

Based on analysis of existing shell hooks, all hooks follow consistent patterns for input processing, command execution, output formatting, and exit code handling.

### Input Processing Pattern

All hooks read Claude Code JSON from stdin and parse relevant fields:

```typescript
interface ClaudePayload {
  tool_input?: {
    file_path?: string;
    [key: string]: any;
  };
  stop_hook_active?: boolean;
  transcript_path?: string;
  [key: string]: any;
}

// Standard input processing flow
async function processInput(): Promise<ClaudePayload> {
  const input = await readStdin();
  return JSON.parse(input);
}
```

### Command Execution Patterns

Hooks use three main patterns for executing external commands:

**Pattern A: Output Capture**
```typescript
// Capture output for analysis
const { stdout, stderr, exitCode } = await execCommand(command, args);
if (stdout.includes('error') || stderr) {
  return { success: false, output: stdout + stderr };
}
```

**Pattern B: Exit Code Check**
```typescript
// Simple success/failure based on exit code
const { exitCode } = await execCommand('git', ['status']);
if (exitCode !== 0) {
  return { skip: true, reason: 'Not a git repository' };
}
```

**Pattern C: Streaming with Temp Files**
```typescript
// For large outputs or complex processing
const tempFile = await createTempFile();
await execCommand(command, args, { outputFile: tempFile });
const output = await readFile(tempFile);
await cleanup(tempFile);
```

### Output Message Patterns

Hooks produce three types of output:

**Silent Success**
```typescript
// For background operations (auto-checkpoint)
console.log(JSON.stringify({ suppressOutput: true }));
process.exit(0);
```

**Progress Messages**
```typescript
// Status updates to stderr (visible to user)
console.error('🔍 Running ESLint on file.ts...');
console.error('✅ ESLint check passed!');
process.exit(0);
```

**Structured Error Blocks**
```typescript
// Detailed error with instructions
console.error(`BLOCKED: TypeScript validation failed.

${errorOutput}

MANDATORY INSTRUCTIONS:
1. Fix ALL TypeScript errors shown above
2. Run the project's type check command to verify
   (Check AGENT.md/CLAUDE.md or package.json scripts)
`);
process.exit(2);
```

### Exit Code Logic

Hooks use consistent exit codes:
- `0` - Success or allowed to continue (skip conditions)
- `2` - Block operation with error message

Note: The POC incorrectly used exit code 1 for failures. This should be corrected in the full implementation.

**Binary Decision**
```typescript
if (validationFailed) {
  showError();
  process.exit(2);
}
process.exit(0);
```

**Aggregated Results**
```typescript
let hasFailures = false;
for (const check of checks) {
  if (!await runCheck(check)) {
    hasFailures = true;
  }
}
process.exit(hasFailures ? 2 : 0);
```

**JSON Response (Stop hooks)**
```typescript
// Stop hooks return JSON with exit 0
console.log(JSON.stringify({
  decision: 'block',
  reason: 'Incomplete todos remain'
}));
process.exit(0);
```

### Tool Detection Pattern

Hooks check tool availability before running:

```typescript
async function hasTypeScript(projectRoot: string): Promise<boolean> {
  // Check configuration exists
  if (!await fileExists(join(projectRoot, 'tsconfig.json'))) {
    return false;
  }
  
  // Check tool is executable
  try {
    await execCommand(packageExec, ['tsc', '--version']);
    return true;
  } catch {
    return false;
  }
}
```

### State Management Patterns

**Git State**
```typescript
const { stdout } = await execCommand('git', ['status', '--porcelain']);
if (stdout.trim()) {
  // Has changes - process them
}
```

**Complex State (Transcript parsing)**
```typescript
const lines = (await readFile(transcriptPath)).split('\n');
for (const line of lines.reverse()) {  // Read from end
  const entry = JSON.parse(line);
  if (entry.toolUseResult?.newTodos) {
    return processTodos(entry.toolUseResult.newTodos);
  }
}
```

### Error Message Template

All hooks use consistent error formatting:

```
BLOCKED: [Component] failed.

[Detailed error output]

MANDATORY INSTRUCTIONS:
1. [Specific required action]
2. [Another required action]
...

[Optional examples or context]
```

### Precondition Checking

Hooks validate conditions before execution:

```typescript
// File-specific hooks
if (!payload.tool_input?.file_path) return exit(0);
if (!existsSync(filePath)) return exit(0);
if (!filePath.match(/\.(ts|tsx)$/)) return exit(0);

// Prevent infinite loops
if (payload.stop_hook_active) return exit(0);
```

## Detailed Design

### 1. Separate Hooks Binary Structure

Create new executable entry point:

```typescript
// cli/hooks-cli.ts
import { Command } from 'commander';
import { HookRunner } from './hooks/runner.js';

export function createHooksCLI(): Command {
  const program = new Command('claudekit-hooks')
    .description('Claude Code hooks execution system')
    .version('1.0.0')
    .argument('<hook>', 'Hook name to execute')
    .option('--config <path>', 'Path to config file', '.claudekit/config.json')
    .option('--list', 'List available hooks')
    .action(async (hookName: string, options: any) => {
      if (options.list) {
        console.log('Available hooks:');
        console.log('  typecheck      - TypeScript type checking');
        console.log('  no-any         - Forbid any types in TypeScript');
        console.log('  eslint         - ESLint code validation');
        console.log('  auto-checkpoint - Git auto-checkpoint on stop');
        console.log('  run-related-tests - Run tests for changed files');
        console.log('  project-validation - Full project validation');
        console.log('  validate-todo-completion - Validate todo completions');
        process.exit(0);
      }
      
      const hookRunner = new HookRunner(options.config);
      const exitCode = await hookRunner.run(hookName);
      process.exit(exitCode);
    });
    
  return program;
}

// Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  createHooksCLI().parse(process.argv);
}
```

### 2. Common Hook Utilities

Based on the patterns identified, we need shared utilities:

```typescript
// cli/hooks/utils.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';

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
  const fullCommand = `${command} ${args.join(' ')}`;
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
    
  return `BLOCKED: ${title}

${details}

MANDATORY INSTRUCTIONS:
${instructionsList}`;
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
```

### 3. Hook Implementation Structure

Each hook extends the BaseHook class and implements the execute method. See the complete implementations in sections 4, 6, 8-11.

### 4. Base Hook Class

The base hook class incorporates all common patterns:

```typescript
// cli/hooks/base.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import { execCommand, detectPackageManager, formatError, findProjectRoot } from './utils.js';
import type { ExecResult, PackageManager } from './utils.js';

export interface ClaudePayload {
  tool_input?: {
    file_path?: string;
    [key: string]: any;
  };
  stop_hook_active?: boolean;
  transcript_path?: string;
  [key: string]: any;
}

export interface HookContext {
  filePath?: string;
  projectRoot: string;
  payload: ClaudePayload;
  packageManager: PackageManager;
}

export interface HookResult {
  exitCode: number;
  suppressOutput?: boolean;
  jsonResponse?: any;
}

export interface HookConfig {
  command?: string;
  timeout?: number;
  [key: string]: any; // Hook-specific config
}

export abstract class BaseHook {
  abstract name: string;
  protected config: HookConfig;
  
  constructor(config: HookConfig = {}) {
    this.config = config;
  }
  
  // Main execution method - implements common flow
  async run(payload: ClaudePayload): Promise<HookResult> {
    // Check for infinite loop prevention
    if (payload.stop_hook_active) {
      return { exitCode: 0 };
    }
    
    // Extract file path if present
    const filePath = payload.tool_input?.file_path;
    
    // Find project root
    const projectRoot = await findProjectRoot(filePath ? path.dirname(filePath) : process.cwd());
    
    // Detect package manager
    const packageManager = await detectPackageManager(projectRoot);
    
    // Create context
    const context: HookContext = {
      filePath,
      projectRoot,
      payload,
      packageManager
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
    return execCommand(command, args, {
      timeout: this.config.timeout,
      ...options
    });
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
  protected jsonOutput(data: any): void {
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
    if (!filePath) return true;
    if (!extensions.some(ext => filePath.endsWith(ext))) return true;
    return false;
  }
}
```

### 5. Decomposed TypeScript Hooks

The original TypeScript hook has been split into two single-purpose hooks:

#### 5.1 TypeScript Compiler Hook

```typescript
// cli/hooks/typecheck.ts
import { BaseHook, HookContext, HookResult } from './base.js';
import { checkToolAvailable } from './utils.js';

export class TypecheckHook extends BaseHook {
  name = 'typecheck';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;
    
    // Skip if no file or wrong extension
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }
    
    // Check if TypeScript is available
    if (!await checkToolAvailable('tsc', 'tsconfig.json', projectRoot)) {
      this.warning('No TypeScript configuration found, skipping check');
      return { exitCode: 0 };
    }
    
    this.progress(`📘 Type-checking ${filePath}`);
    
    // Run TypeScript compiler
    const command = this.config.command || `${packageManager.exec} tsc --noEmit`;
    const result = await this.execCommand(command, [], {
      cwd: projectRoot
    });
    
    if (result.exitCode !== 0) {
      this.error(
        'TypeScript compilation failed',
        result.stderr || result.stdout,
        [
          'Fix ALL TypeScript errors shown above',
          'Run the project\'s type check command to verify all errors are resolved',
          '(Check AGENT.md/CLAUDE.md or package.json scripts for the exact command)'
        ]
      );
      return { exitCode: 2 };
    }
    
    this.success('TypeScript check passed!');
    return { exitCode: 0 };
  }
}
```

#### 5.2 No-Any Types Hook

```typescript
// cli/hooks/no-any.ts
import { BaseHook, HookContext, HookResult } from './base.js';

export class NoAnyHook extends BaseHook {
  name = 'no-any';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { filePath } = context;
    
    // Skip if no file or wrong extension
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }
    
    this.progress(`🚫 Checking for 'any' types in ${filePath}`);
    
    const content = await this.readFile(filePath!);
    const lines = content.split('\n');
    const errors: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // Skip comments and test utilities
      if (line.trim().startsWith('//') || 
          line.trim().startsWith('*') ||
          line.includes('expect.any(') ||
          line.includes('.any(')) {
        continue;
      }
      
      // Check for forbidden 'any' patterns
      const anyPattern = /:\s*any\b|:\s*any\[\]|<any>|as\s+any\b|=\s*any\b/;
      if (anyPattern.test(line)) {
        errors.push(`Line ${lineNum}: ${line.trim()}`);
      }
    }
    
    if (errors.length > 0) {
      this.error(
        'Forbidden \'any\' types detected',
        `❌ File contains ${errors.length} forbidden 'any' type${errors.length > 1 ? 's' : ''}:\n\n${errors.join('\n')}`,
        [
          'Replace ALL \'any\' types with proper types',
          'Use specific interfaces, union types, or generics instead of \'any\'',
          'Examples of fixes:',
          '  - Instead of: data: any → Define: interface Data { ... }',
          '  - Instead of: items: any[] → Use: items: Item[] or items: Array<{id: string, name: string}>',
          '  - Instead of: value: any → Use: value: string | number | boolean',
          '  - Instead of: response: any → Use: response: unknown (then add type guards)'
        ]
      );
      return { exitCode: 2 };
    }
    
    this.success('No forbidden \'any\' types found!');
    return { exitCode: 0 };
  }
}
```

### 6. Hook Runner Implementation

The hook runner manages hook execution and configuration:

```typescript
// cli/hooks/runner.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';
import { readStdin } from './utils.js';
import { BaseHook, HookResult } from './base.js';

// Import all hooks
import { TypecheckHook } from './typecheck.js';
import { NoAnyHook } from './no-any.js';
import { EslintHook } from './eslint.js';
import { AutoCheckpointHook } from './auto-checkpoint.js';
import { RunRelatedTestsHook } from './run-related-tests.js';
import { ProjectValidationHook } from './project-validation.js';
import { ValidateTodoCompletionHook } from './validate-todo.js';

// Configuration schema
const HookConfigSchema = z.object({
  command: z.string().optional(),
  timeout: z.number().optional().default(30000),
}).passthrough();

const ConfigSchema = z.object({
  hooks: z.record(z.string(), HookConfigSchema).optional().default({}),
});

export class HookRunner {
  private hooks: Map<string, new (config: any) => BaseHook> = new Map();
  private configPath: string;
  
  constructor(configPath: string = '.claudekit/config.json') {
    this.configPath = configPath;
    
    // Register all hooks
    this.hooks.set('typecheck', TypecheckHook);
    this.hooks.set('no-any', NoAnyHook);
    this.hooks.set('eslint', EslintHook);
    this.hooks.set('auto-checkpoint', AutoCheckpointHook);
    this.hooks.set('run-related-tests', RunRelatedTestsHook);
    this.hooks.set('project-validation', ProjectValidationHook);
    this.hooks.set('validate-todo-completion', ValidateTodoCompletionHook);
  }
  
  async run(hookName: string): Promise<number> {
    // Get hook class
    const HookClass = this.hooks.get(hookName);
    if (!HookClass) {
      console.error(`Unknown hook: ${hookName}`);
      return 1;
    }
    
    // Load configuration
    const config = await this.loadConfig();
    const hookConfig = config.hooks[hookName] || {};
    
    // Read Claude payload from stdin
    const input = await readStdin();
    let payload;
    try {
      payload = JSON.parse(input || '{}');
    } catch {
      payload = {};
    }
    
    // Create and run hook
    const hook = new HookClass(hookConfig);
    const result = await hook.run(payload);
    
    // Handle different result types
    if (result.jsonResponse) {
      console.log(JSON.stringify(result.jsonResponse));
    }
    
    return result.exitCode;
  }
  
  private async loadConfig(): Promise<z.infer<typeof ConfigSchema>> {
    try {
      const configPath = path.resolve(this.configPath);
      const configData = await fs.readJson(configPath);
      return ConfigSchema.parse(configData);
    } catch {
      // Return default config if file doesn't exist or is invalid
      return { hooks: {} };
    }
  }
}
```

### 7. Auto-Checkpoint Hook Example

Example of a simple hook using the new patterns:

```typescript
// cli/hooks/auto-checkpoint.ts
import { BaseHook, HookContext, HookResult } from './base.js';

export class AutoCheckpointHook extends BaseHook {
  name = 'auto-checkpoint';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot } = context;
    const prefix = this.config.prefix || 'claude';
    const maxCheckpoints = this.config.maxCheckpoints || 10;
    
    // Check if there are any changes to checkpoint
    const { stdout } = await this.execCommand('git', ['status', '--porcelain'], {
      cwd: projectRoot
    });
    
    if (!stdout.trim()) {
      // No changes, suppress output
      return { exitCode: 0, suppressOutput: true };
    }
    
    // Create checkpoint with timestamp
    const timestamp = new Date().toISOString();
    const message = `${prefix}-checkpoint: Auto-save at ${timestamp}`;
    
    // Add all files temporarily
    await this.execCommand('git', ['add', '-A'], { cwd: projectRoot });
    
    // Create stash object without modifying working directory
    const { stdout: stashSha } = await this.execCommand(
      'git', 
      ['stash', 'create', message],
      { cwd: projectRoot }
    );
    
    if (stashSha.trim()) {
      // Store the stash in the stash list
      await this.execCommand(
        'git',
        ['stash', 'store', '-m', message, stashSha.trim()],
        { cwd: projectRoot }
      );
      
      // Reset index to unstage files
      await this.execCommand('git', ['reset'], { cwd: projectRoot });
      
      // Clean up old checkpoints if needed
      await this.cleanupOldCheckpoints(prefix, maxCheckpoints, projectRoot);
    }
    
    // Silent success
    return { 
      exitCode: 0, 
      suppressOutput: true,
      jsonResponse: { suppressOutput: true }
    };
  }
  
  private async cleanupOldCheckpoints(
    prefix: string, 
    maxCount: number,
    projectRoot: string
  ): Promise<void> {
    // Get list of checkpoints
    const { stdout } = await this.execCommand(
      'git',
      ['stash', 'list'],
      { cwd: projectRoot }
    );
    
    const checkpoints = stdout
      .split('\n')
      .filter(line => line.includes(`${prefix}-checkpoint`))
      .map((line, index) => ({ line, index }));
    
    // Remove old checkpoints if over limit
    if (checkpoints.length > maxCount) {
      const toRemove = checkpoints.slice(maxCount);
      for (const checkpoint of toRemove.reverse()) {
        await this.execCommand(
          'git',
          ['stash', 'drop', `stash@{${checkpoint.index}}`],
          { cwd: projectRoot }
        );
      }
    }
  }
}
```

### 8. Hook Decomposition Benefits

The TypeScript hook was decomposed into two single-purpose hooks to follow the Unix philosophy:

1. **`typecheck`** - Runs TypeScript compiler to check for type errors
   - Focuses solely on compilation errors
   - Uses the project's TypeScript configuration
   - Can be configured with custom commands

2. **`no-any`** - Forbids the use of 'any' types in TypeScript files
   - Single responsibility: enforce strict typing
   - Fast execution (no compilation required)
   - Clear, focused error messages

This decomposition provides several benefits:
- **Granular Control**: Users can enable/disable specific checks
- **Performance**: Run only what's needed (e.g., skip compilation for quick 'any' checks)
- **Clear Error Messages**: Each hook provides focused feedback for its specific concern
- **Flexible Configuration**: Different timeouts and settings for each check
- **Parallel Execution**: Claude Code can run both hooks concurrently

### 9. Summary of Key Patterns

The hook execution patterns analysis revealed:

1. **Standardized Input Flow**: All hooks read JSON from stdin, parse fields, and validate preconditions
2. **Consistent Exit Codes**: 0 for success/skip, 2 for blocking errors
3. **Three Output Types**: Silent JSON, progress to stderr, structured error blocks
4. **Command Execution**: Wrapped with timeout, output capture, and error handling
5. **Tool Detection**: Check config file + executable availability before running
6. **Error Formatting**: Consistent "BLOCKED:" format with instructions
7. **State Management**: Git operations, transcript parsing, file analysis
8. **Self-Contained Design**: Each hook includes all needed functionality

These patterns enable a clean TypeScript implementation with:
- Base class handling common flow
- Utility module for shared functions
- Consistent interfaces across all hooks
- Type-safe configuration via Zod schemas
- Proper error handling and user feedback

### 10. ESLint Hook Implementation

```typescript
// cli/hooks/eslint.ts
import * as path from 'path';
import { BaseHook, HookContext, HookResult } from './base.js';

export class EslintHook extends BaseHook {
  name = 'eslint';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot } = context;
    
    // Skip if no file path or not JavaScript/TypeScript file
    if (!filePath || !filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0, skipped: true };
    }
    
    // Check if ESLint is configured
    if (!await this.hasEslint(projectRoot)) {
      this.log('info', 'ESLint not configured, skipping lint check');
      return { exitCode: 0, skipped: true };
    }
    
    this.log('info', `Running ESLint on ${filePath}...`);
    
    // Run ESLint
    const eslintResult = await this.runEslint(filePath, projectRoot);
    if (eslintResult.code !== 0 || this.hasEslintErrors(eslintResult.stdout)) {
      const errorMessage = this.formatEslintErrors(eslintResult.stdout || eslintResult.stderr);
      this.outputError('ESLint check failed', errorMessage);
      return { exitCode: 2 };
    }
    
    this.log('info', 'ESLint check passed!');
    return { exitCode: 0 };
  }
  
  private async hasEslint(projectRoot: string): Promise<boolean> {
    // Check for ESLint config files
    const configFiles = [
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs'
    ];
    
    for (const configFile of configFiles) {
      if (await this.fileExists(path.join(projectRoot, configFile))) {
        // Verify ESLint is available
        const pm = await this.detectPackageManager(projectRoot);
        const pmExec = this.getPackageManagerExec(pm);
        const result = await this.exec(`${pmExec} --quiet eslint --version`, {
          cwd: projectRoot,
          timeout: 10000
        });
        
        return result.code === 0;
      }
    }
    
    return false;
  }
  
  private async runEslint(filePath: string, projectRoot: string): Promise<any> {
    const pm = await this.detectPackageManager(projectRoot);
    const pmExec = this.getPackageManagerExec(pm);
    const eslintCommand = this.config.command || `${pmExec} eslint`;
    
    // Build ESLint arguments
    const eslintArgs: string[] = [];
    
    // Add file extensions if configured
    if (this.config.extensions) {
      eslintArgs.push(`--ext ${this.config.extensions.join(',')}`);
    }
    
    // Add fix flag if configured
    if (this.config.fix) {
      eslintArgs.push('--fix');
    }
    
    // Add the file path
    eslintArgs.push(`"${filePath}"`);
    
    const fullCommand = `${eslintCommand} ${eslintArgs.join(' ')}`;
    return await this.exec(fullCommand, {
      cwd: projectRoot,
      timeout: this.config.timeout || 30000
    });
  }
  
  private hasEslintErrors(output: string): boolean {
    return output.includes('error') || output.includes('warning');
  }
  
  private formatEslintErrors(output: string): string {
    return `
${output}

MANDATORY INSTRUCTIONS:
You MUST fix ALL lint errors and warnings shown above.

REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run the project's lint command to verify all issues are resolved
   (Check AGENT.md/CLAUDE.md or package.json scripts for the exact command)
3. Common fixes:
   - Missing semicolons or trailing commas
   - Unused variables (remove or use them)
   - Console.log statements (remove from production code)
   - Improper indentation or spacing`;
  }
}
```

### 11. Run Related Tests Hook Implementation

```typescript
// cli/hooks/run-related-tests.ts
import * as path from 'path';
import { BaseHook, HookContext, HookResult } from './base.js';

export class RunRelatedTestsHook extends BaseHook {
  name = 'run-related-tests';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;
    
    // Skip if no file path
    if (!filePath) {
      return { exitCode: 0 };
    }
    
    // Only run tests for source files
    if (!filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0 };
    }
    
    // Skip test files themselves
    if (filePath.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0 };
    }
    
    this.progress(`🧪 Running tests related to: ${filePath}...`);
    
    // Find related test files
    const testFiles = await this.findRelatedTestFiles(filePath);
    
    if (testFiles.length === 0) {
      this.warning(`No test files found for ${path.basename(filePath)}`);
      this.warning(`Consider creating tests in: ${path.dirname(filePath)}/${path.basename(filePath, path.extname(filePath))}.test${path.extname(filePath)}`);
      return { exitCode: 0 };
    }
    
    this.progress(`Found related test files: ${testFiles.join(', ')}`);
    
    // Run tests
    const testCommand = this.config.command || `${packageManager.test}`;
    const result = await this.execCommand(testCommand, ['--', ...testFiles], {
      cwd: projectRoot
    });
    
    if (result.exitCode !== 0) {
      this.error(
        `Tests failed for ${filePath}`,
        result.stdout + result.stderr,
        [
          'You MUST fix ALL test failures, regardless of whether they seem related to your recent changes',
          'First, examine the failing test output above to understand what\'s broken',
          `Run the failing tests individually for detailed output: ${testCommand} -- ${testFiles.join(' ')}`,
          `Then run ALL tests to ensure nothing else is broken: ${testCommand}`,
          'Fix ALL failing tests by:',
          '  - Reading each test to understand its purpose',
          '  - Determining if the test or the implementation is wrong',
          '  - Updating whichever needs to change to match expected behavior',
          '  - NEVER skip, comment out, or use .skip() to bypass tests',
          'Common fixes to consider:',
          '  - Update mock data to match new types/interfaces',
          '  - Fix async timing issues with proper await/waitFor',
          '  - Update component props in tests to match changes',
          '  - Ensure test database/state is properly reset',
          '  - Check if API contracts have changed'
        ]
      );
      return { exitCode: 2 };
    }
    
    this.success('All related tests passed!');
    return { exitCode: 0 };
  }
  
  private async findRelatedTestFiles(filePath: string): Promise<string[]> {
    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);
    const ext = path.extname(filePath);
    
    // Common test file patterns
    const testPatterns = [
      `${dirName}/${baseName}.test${ext}`,
      `${dirName}/${baseName}.spec${ext}`,
      `${dirName}/__tests__/${baseName}.test${ext}`,
      `${dirName}/__tests__/${baseName}.spec${ext}`,
    ];
    
    const foundFiles: string[] = [];
    for (const pattern of testPatterns) {
      if (await this.fileExists(pattern)) {
        foundFiles.push(pattern);
      }
    }
    
    return foundFiles;
  }
}
```

### 12. Project Validation Hook Implementation

```typescript
// cli/hooks/project-validation.ts
import { BaseHook, HookContext, HookResult } from './base.js';
import { checkToolAvailable } from './utils.js';

export class ProjectValidationHook extends BaseHook {
  name = 'project-validation';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;
    
    this.progress('Running project-wide validation...');
    
    let hasFailures = false;
    let validationOutput = '';
    
    // Run TypeScript check if available
    if (await checkToolAvailable('tsc', 'tsconfig.json', projectRoot)) {
      validationOutput += '📘 Running TypeScript validation...\n';
      const tsCommand = this.config.typescriptCommand || `${packageManager.exec} tsc --noEmit`;
      const tsResult = await this.execCommand(tsCommand, [], { cwd: projectRoot });
      
      if (tsResult.exitCode === 0) {
        validationOutput += '✅ TypeScript validation passed\n\n';
      } else {
        hasFailures = true;
        validationOutput += '❌ TypeScript validation failed:\n';
        validationOutput += this.indent(tsResult.stderr || tsResult.stdout) + '\n\n';
      }
    }
    
    // Run ESLint if available
    if (await checkToolAvailable('eslint', '.eslintrc.json', projectRoot)) {
      validationOutput += '🔍 Running ESLint validation...\n';
      const eslintCommand = this.config.eslintCommand || `${packageManager.exec} eslint . --ext .js,.jsx,.ts,.tsx`;
      const eslintResult = await this.execCommand(eslintCommand, [], { cwd: projectRoot });
      
      if (eslintResult.exitCode === 0 && !eslintResult.stdout.includes('error')) {
        validationOutput += '✅ ESLint validation passed\n\n';
      } else {
        hasFailures = true;
        validationOutput += '❌ ESLint validation failed:\n';
        validationOutput += this.indent(eslintResult.stdout) + '\n\n';
      }
    }
    
    // Run tests if available
    const { stdout: pkgJson } = await this.execCommand('cat', ['package.json'], { cwd: projectRoot });
    if (pkgJson.includes('"test"')) {
      validationOutput += '🧪 Running test suite...\n';
      const testCommand = this.config.testCommand || packageManager.test;
      const testResult = await this.execCommand(testCommand, [], { cwd: projectRoot });
      
      if (testResult.exitCode === 0 && !testResult.stdout.match(/FAIL|failed|Error:|failing/)) {
        validationOutput += '✅ Test suite passed\n\n';
      } else {
        hasFailures = true;
        validationOutput += '❌ Test suite failed:\n';
        validationOutput += this.indent(testResult.stdout + testResult.stderr) + '\n\n';
      }
    }
    
    // Output results
    if (hasFailures) {
      // Build list of failed checks
      const failedChecks: string[] = [];
      if (validationOutput.includes('❌ TypeScript validation failed')) {
        failedChecks.push('Type checking command');
      }
      if (validationOutput.includes('❌ ESLint validation failed')) {
        failedChecks.push('Lint command');
      }
      if (validationOutput.includes('❌ Test suite failed')) {
        failedChecks.push('Test command');
      }
      
      console.error(`████ Project Validation Failed ████

Your implementation has validation errors that must be fixed:

${validationOutput}

REQUIRED ACTIONS:
1. Fix all errors shown above
2. Run the failed validation commands to verify fixes:
${failedChecks.map(check => `   - ${check}`).join('\n')}
   (Check AGENT.md/CLAUDE.md or package.json scripts for exact commands)
3. Make necessary corrections
4. The validation will run again automatically`);
      
      return { exitCode: 2 };
    }
    
    this.success('All validations passed! Great work!');
    return { exitCode: 0 };
  }
  
  private indent(text: string, spaces: number = 2): string {
    return text.split('\n').map(line => ' '.repeat(spaces) + line).join('\n');
  }
}
```

### 13. Validate Todo Completion Hook Implementation

```typescript
// cli/hooks/validate-todo.ts
import * as path from 'path';
import { BaseHook, HookContext, HookResult } from './base.js';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export class ValidateTodoCompletionHook extends BaseHook {
  name = 'validate-todo-completion';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { payload } = context;
    
    // Get transcript path
    let transcriptPath = payload.transcript_path;
    if (!transcriptPath) {
      // Allow stop - no transcript to check
      return { exitCode: 0 };
    }
    
    // Expand ~ to home directory
    transcriptPath = transcriptPath.replace(/^~/, process.env.HOME || '');
    
    if (!await this.fileExists(transcriptPath)) {
      // Allow stop - transcript not found
      return { exitCode: 0 };
    }
    
    // Find the most recent todo state
    const todoState = await this.findLatestTodoState(transcriptPath);
    
    if (!todoState) {
      // No todos found, allow stop
      return { exitCode: 0 };
    }
    
    // Check for incomplete todos
    const incompleteTodos = todoState.filter(todo => todo.status !== 'completed');
    
    if (incompleteTodos.length > 0) {
      // Block stop and return JSON response
      const reason = `You have ${incompleteTodos.length} incomplete todo items. You must complete all tasks before stopping:

${incompleteTodos.map(todo => `  - [${todo.status}] ${todo.content}`).join('\n')}

Use TodoRead to see the current status, then complete all remaining tasks. Mark each task as completed using TodoWrite as you finish them.`;
      
      this.jsonOutput({
        decision: 'block',
        reason: reason
      });
      
      return { exitCode: 0 }; // Note: exit 0 for Stop hooks, JSON controls decision
    }
    
    // All todos complete, allow stop
    return { exitCode: 0 };
  }
  
  private async findLatestTodoState(transcriptPath: string): Promise<Todo[] | null> {
    const content = await this.readFile(transcriptPath);
    const lines = content.split('\n').filter(line => line.trim());
    
    // Read from end to find most recent todo state
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      try {
        const entry = JSON.parse(line);
        if (entry.toolUseResult?.newTodos && Array.isArray(entry.toolUseResult.newTodos)) {
          return entry.toolUseResult.newTodos;
        }
      } catch {
        // Not valid JSON, continue
      }
    }
    
    return null;
  }
}
```

### 14. Hook Registry

```typescript
// cli/hooks/registry.ts
import { TypecheckHook } from './typecheck.js';
import { NoAnyHook } from './no-any.js';
import { EslintHook } from './eslint.js';
import { AutoCheckpointHook } from './auto-checkpoint.js';
import { RunRelatedTestsHook } from './run-related-tests.js';
import { ProjectValidationHook } from './project-validation.js';
import { ValidateTodoCompletionHook } from './validate-todo.js';

export const HOOK_REGISTRY = {
  'typecheck': TypecheckHook,
  'no-any': NoAnyHook,
  'eslint': EslintHook,
  'auto-checkpoint': AutoCheckpointHook,
  'run-related-tests': RunRelatedTestsHook,
  'project-validation': ProjectValidationHook,
  'validate-todo-completion': ValidateTodoCompletionHook,
};

export type HookName = keyof typeof HOOK_REGISTRY;
```

### 15. Configuration Schema

```typescript
// cli/types/hooks.ts
import { z } from 'zod';

// Base hook configuration that all hooks share
export const BaseHookConfigSchema = z.object({
  command: z.string().optional(),
  timeout: z.number().optional().default(30000),
}).passthrough(); // Allow hook-specific fields like 'pattern', 'prefix', etc.

// Complete configuration schema
export const ClaudekitConfigSchema = z.object({
  hooks: z.record(z.string(), BaseHookConfigSchema).optional().default({}),
});

export type HookConfig = z.infer<typeof BaseHookConfigSchema>;
export type ClaudekitConfig = z.infer<typeof ClaudekitConfigSchema>;
```

### 16. Example .claudekit/config.json

**Important**: The separation of concerns is clean:
- `.claudekit/config.json` defines **HOW** hooks run (commands, timeouts, settings)
- `.claude/settings.json` defines **WHICH** hooks run (via matcher rules)

A hook is executed when it's referenced in `.claude/settings.json`. If the hook has configuration in `.claudekit/config.json`, those settings are used. Otherwise, the hook runs with default settings.

```json
{
  "hooks": {
    "typecheck": {
      "command": "pnpm exec tsc --noEmit",
      "timeout": 45000
    },
    "no-any": {
      "timeout": 5000
    },
    "eslint": {
      "command": "pnpm exec eslint",
      "timeout": 30000
    },
    "run-related-tests": {
      "command": "pnpm test",
      "timeout": 60000,
      "pattern": "**/*.{test,spec}.{js,ts}"
    },
    "auto-checkpoint": {
      "timeout": 10000,
      "prefix": "claude",
      "maxCheckpoints": 10
    },
    "project-validation": {
      "command": "pnpm run validate",
      "timeout": 120000
    },
    "validate-todo-completion": {
      "timeout": 5000
    }
  }
}
```

### 17. Claude Code Integration

Update `.claude/settings.json` to use claudekit-hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks typecheck"},
          {"type": "command", "command": "claudekit-hooks no-any"}
        ]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
        "hooks": [{"type": "command", "command": "claudekit-hooks eslint"}]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks auto-checkpoint"},
          {"type": "command", "command": "claudekit-hooks validate-todo-completion"}
        ]
      }
    ]
  }
}
```

## User Experience

### Setup Flow
1. Install claudekit: `npm install -g claudekit`
2. Initialize project: `claudekit setup`
3. Configure hooks in `.claudekit/config.json`
4. Update `.claude/settings.json` to use `claudekit-hooks [name]`

### Configuration Discovery
The hooks system automatically finds the project configuration by:
1. **Traversing upward** from the current directory looking for `.claudekit/config.json`
2. **Falling back to git root** if no `.claudekit` directory is found
3. **Using current directory** as a last resort

This ensures hooks work correctly when Claude Code is run from any subdirectory within the project.

### Hook Binary Usage
```bash
# List available hooks
claudekit-hooks --list

# Run specific hook (typically called by Claude Code)
claudekit-hooks typecheck

# Run with custom config
claudekit-hooks eslint --config .claudekit/custom-config.json

# Can also work standalone for testing
echo '{"tool_input": {"file_path": "src/index.ts"}}' | claudekit-hooks typecheck
```

### Configuration Example
```bash
# User customizes test command for their project
echo '{
  "hooks": {
    "run-related-tests": {
      "testCommand": "pnpm test",
      "coverage": true
    }
  }
}' > .claudekit/config.json
```

## Testing Strategy

The testing approach focuses on core functionality validation to ensure hooks work as expected in typical scenarios.

### Unit Tests
- Test each hook class in isolation
- Mock file system and command execution
- Verify exit codes and error handling
- Test configuration loading and validation
- Focus on happy path and basic error cases

### Integration Tests
- Test full hook execution flow
- Verify stdin payload parsing
- Test with various project configurations
- Ensure behavioral compatibility with shell script hooks
- Validate hook integration with Claude Code payloads

### Test Structure
```typescript
describe('TypecheckHook', () => {
  it('should skip when no tsconfig.json exists', async () => {
    const hook = new TypecheckHook({});
    const result = await hook.execute({
      projectRoot: '/mock/project',
      filePath: 'test.ts',
      payload: {},
    });
    expect(result.exitCode).toBe(0);
    expect(result.skipped).toBe(true);
  });
  
  it('should use custom command from config', async () => {
    const hook = new TypecheckHook({ command: 'yarn tsc' });
    // ... test implementation
  });
});
```

## Integration Test Setup

### Test Structure

```typescript
// tests/hooks/integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOOKS_BIN = path.join(__dirname, '../../dist/hooks-cli.js');

describe('claudekit-hooks integration', () => {
  let testDir: string;
  
  beforeEach(async () => {
    // Create temp test directory
    testDir = path.join(__dirname, `test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    // Clean up
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  describe('typecheck hook', () => {
    it('should pass for valid TypeScript', async () => {
      // Create test files
      await fs.writeFile(path.join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { strict: true }
      }));
      
      await fs.writeFile(path.join(testDir, 'test.ts'), `
        const greeting: string = 'hello';
        console.log(greeting);
      `);
      
      // Create payload
      const payload = JSON.stringify({
        tool_input: { file_path: path.join(testDir, 'test.ts') }
      });
      
      // Run hook
      const exitCode = await runHook('typecheck', payload, testDir);
      expect(exitCode).toBe(0);
    });
    
    it('should fail for TypeScript with any types', async () => {
      await fs.writeFile(path.join(testDir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { strict: true }
      }));
      
      await fs.writeFile(path.join(testDir, 'test.ts'), `
        const data: any = { foo: 'bar' };
        console.log(data);
      `);
      
      const payload = JSON.stringify({
        tool_input: { file_path: path.join(testDir, 'test.ts') }
      });
      
      const exitCode = await runHook('typecheck', payload, testDir);
      expect(exitCode).toBe(2);
    });
  });
  
  describe('config loading', () => {
    it('should respect hook configuration', async () => {
      // Create config
      const configPath = path.join(testDir, '.claudekit/config.json');
      await fs.mkdir(path.dirname(configPath), { recursive: true });
      await fs.writeFile(configPath, JSON.stringify({
        hooks: {
          typecheck: { enabled: false }
        }
      }));
      
      const payload = JSON.stringify({
        tool_input: { file_path: 'test.ts' }
      });
      
      const exitCode = await runHook('typecheck', payload, testDir, configPath);
      expect(exitCode).toBe(0); // Should skip disabled hook
    });
  });
});

async function runHook(
  hookName: string,
  payload: string,
  cwd: string,
  configPath?: string
): Promise<number> {
  return new Promise((resolve) => {
    const args = [hookName];
    if (configPath) {
      args.push('--config', configPath);
    }
    
    const child = spawn('node', [HOOKS_BIN, ...args], {
      cwd,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Send payload to stdin
    child.stdin.write(payload);
    child.stdin.end();
    
    let stdout = '';
    let stderr = '';
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      if (process.env.DEBUG_TESTS) {
        console.log('STDOUT:', stdout);
        console.log('STDERR:', stderr);
      }
      resolve(code || 0);
    });
  });
}
```

### Mock Test Setup

```typescript
// tests/hooks/unit/typecheck.test.ts
import { describe, it, expect, vi } from 'vitest';
import { TypecheckHook } from '../../../cli/hooks/typecheck.js';

describe('TypecheckHook', () => {
  it('should check for any types', async () => {
    const hook = new TypecheckHook({});
    
    // Mock file system
    vi.spyOn(hook as any, 'readFile').mockResolvedValue(`
      const data: any = {};
    `);
    
    const result = await (hook as any).checkForAnyTypes('test.ts');
    expect(result.passed).toBe(false);
    expect(result.message).toContain('forbidden \'any\' types');
  });
});
```

## Performance Considerations

- **Startup time**: Minimal overhead from loading TypeScript
- **Execution speed**: Comparable to shell scripts
- **Binary size**: Separate hooks binary (~10-15MB)
- **Memory usage**: Node.js process per hook execution
- **Distribution**: Two binaries instead of one (claudekit + claudekit-hooks)

## Security Considerations

- **Command injection**: Sanitize all file paths and user inputs
- **Config validation**: Strict schema validation for config files
- **Process isolation**: Each hook runs in separate process
- **No eval**: No dynamic code execution

## Documentation

### Updates Required
- **README.md**: Add claudekit-hooks binary documentation
- **Installation guide**: Include `.claudekit/config.json` setup
- **Hook reference**: Document each hook's configuration options
- **package.json**: Add new binary entry for claudekit-hooks

### Example Documentation
```markdown
## Hook Configuration

Each hook can be configured in `.claudekit/config.json`:

### typecheck
- `command`: TypeScript command to run (default: "npx tsc")
- `timeout`: Maximum execution time in ms (default: 30000)

### eslint
- `command`: ESLint command (default: "npx eslint")
- `fix`: Auto-fix issues (default: false)
- `extensions`: File extensions to check
```

## Build Configuration

### Package.json Updates

```json
{
  "name": "claudekit",
  "version": "0.1.5",
  "bin": {
    "claudekit": "./bin/claudekit",
    "claudekit-hooks": "./bin/claudekit-hooks"
  },
  "scripts": {
    "build": "npm run clean && npm run build:main && npm run build:hooks && npm run build:types",
    "build:main": "esbuild cli/cli.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/cli.js --external:node:* --packages=external",
    "build:hooks": "esbuild cli/hooks-cli.ts --bundle --platform=node --target=node20 --format=esm --outfile=dist/hooks-cli.js --external:node:* --packages=external",
    "build:types": "tsc --project tsconfig.build.json --emitDeclarationOnly",
    "build:hooks-dev": "tsc cli/hooks-cli.ts --outDir dist --module esnext --target es2022 --moduleResolution node --skipLibCheck"
  }
}
```

### Binary Wrapper Scripts

**bin/claudekit**:
```bash
#!/usr/bin/env node
import('../dist/cli.js');
```

**bin/claudekit-hooks**:
```javascript
#!/usr/bin/env node

// Direct import of the hooks CLI
import('../dist/hooks-cli.js');
```

### ESBuild Configuration

```typescript
// build.config.ts
import { build } from 'esbuild';

const commonOptions = {
  bundle: true,
  platform: 'node' as const,
  target: 'node20',
  format: 'esm' as const,
  external: ['node:*'],
  packages: 'external' as const,
  sourcemap: true,
  minify: process.env.NODE_ENV === 'production',
};

// Build main CLI
await build({
  ...commonOptions,
  entryPoints: ['cli/cli.ts'],
  outfile: 'dist/cli.js',
});

// Build hooks CLI
await build({
  ...commonOptions,
  entryPoints: ['cli/hooks-cli.ts'],
  outfile: 'dist/hooks-cli.js',
});
```

### TypeScript Configuration

Ensure `tsconfig.json` includes the hooks directory:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./cli",
    "declaration": true,
    "declarationMap": true
  },
  "include": [
    "cli/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "tests"
  ]
}
```

## Lessons from POC

Based on the [POC implementation](feat-embedded-hooks-system-poc.md):

### Build Configuration
- TypeScript compilation requires additional flags: `--moduleResolution node --skipLibCheck`
- Simple binary wrapper with direct import works best
- esbuild for production, tsc for development/debugging

### Architecture Validation
- Separate binary approach proven successful
- Configuration loading pattern validated
- Exit code handling works as expected (0 for success/skip, 2 for blocking errors)
- Claude Code integration via hooks system confirmed
- Note: POC used exit code 1 incorrectly - should use 2 for blocking

### Performance Observations
- Acceptable startup time for POC
- No noticeable delays in hook execution
- Stdin reading with 1-second timeout sufficient

### Configuration Approach
- Current directory config loading acceptable for POC
- Project root discovery needed for full implementation
- Default values essential for missing config

## Implementation Phases

### Phase 1: Core Infrastructure
1. Create separate `claudekit-hooks` binary structure
2. Implement base hook class and runner
3. Add configuration loading
4. Port `typecheck` hook as proof of concept
5. Update build process to produce two binaries

### Phase 2: Hook Migration
1. Port remaining hooks to TypeScript
2. Maintain exact behavior compatibility
3. Add comprehensive tests for each hook

### Phase 3: Release
1. Update documentation
2. Test with real projects
3. Build and publish new version

## Open Questions

1. **Binary naming**
   - Should it be `claudekit-hooks` or `ck-hooks`?
   - Decision: Use `claudekit-hooks` for clarity

2. **Config file location**
   - Should config be in `.claudekit/config.json` or `.claudekit.json`?
   - Decision: Use `.claudekit/config.json` for better organization

3. **Backward compatibility**
   - Should we support running old shell scripts?
   - Decision: No, clean break with clear migration path

## Implementation Timeline

Based on POC validation:
- **POC**: ✅ Completed (2 hours)
- **Phase 1 (Core Infrastructure)**: 3-4 days
- **Phase 2 (Hook Migration)**: 5-7 days
- **Phase 3 (Testing & Documentation)**: 3-4 days
- **Phase 4 (Release)**: 1-2 days
- **Total**: 2-3 weeks

## References

- [POC Implementation](feat-embedded-hooks-system-poc.md)
- [POC Validation Report](../reports/POC_VALIDATION_REPORT.md)
- Current shell script implementations in `src/hooks/`
- Claude Code hooks documentation
- Existing claudekit CLI structure in `cli/`