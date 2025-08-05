# Task Breakdown: Embedded Hooks System
Generated: 2025-07-31
Source: specs/feat-embedded-hooks-system.md

## Overview
Migrate existing shell script hooks to TypeScript and package them in a dedicated `claudekit-hooks` executable. This implementation will provide type safety, better testing capabilities, and consistent cross-platform behavior while maintaining the same functionality as the current shell scripts.

## Phase 1: Foundation - Core Infrastructure

### Task 1.1: Set up TypeScript project structure for hooks
**Description**: Create the directory structure and TypeScript configuration for the hooks subsystem
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None (foundation task)

**Technical Requirements**:
- Create directory structure as specified in the spec
- Set up TypeScript configuration for hooks compilation
- Configure build tools for dual binary output

**Directory Structure to Create**:
```
cli/
├── hooks-cli.ts              # New hooks CLI entry point
├── hooks/
│   ├── base.ts               # BaseHook abstract class
│   ├── runner.ts             # HookRunner class
│   ├── registry.ts           # Hook registry
│   └── utils.ts              # Common utilities
└── types/
    └── hooks.ts              # Hook-specific types
bin/
└── claudekit-hooks           # New hooks CLI wrapper
```

**TypeScript Configuration**:
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

**Acceptance Criteria**:
- [ ] Directory structure created according to specification
- [ ] TypeScript configuration supports ES modules and strict mode
- [ ] Build configuration includes hooks directory
- [ ] Binary wrapper script created at bin/claudekit-hooks

### Task 1.2: Implement hooks CLI entry point
**Description**: Create the claudekit-hooks binary entry point with command routing
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.3

**Implementation**:
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

**Binary Wrapper (bin/claudekit-hooks)**:
```javascript
#!/usr/bin/env node

// Direct import of the hooks CLI
import('../dist/hooks-cli.js');
```

**Acceptance Criteria**:
- [ ] CLI accepts hook name as argument
- [ ] --list option displays available hooks
- [ ] --config option allows custom config path
- [ ] Binary wrapper correctly imports dist/hooks-cli.js
- [ ] Exit codes propagate correctly from hooks

### Task 1.3: Implement common hook utilities
**Description**: Create shared utilities module for all hooks with stdin reader, project root discovery, package manager detection, command execution wrapper, error formatting, and tool availability checking
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.2

**Implementation**:
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

**Acceptance Criteria**:
- [ ] readStdin with 1-second timeout implemented
- [ ] Project root discovery via git rev-parse
- [ ] Package manager detection for npm/yarn/pnpm
- [ ] Command execution with timeout and output capture
- [ ] Error formatting follows BLOCKED: pattern
- [ ] Tool availability checker works correctly

### Task 1.4: Implement base hook class
**Description**: Create the abstract base hook class that all hooks extend, incorporating common patterns for input processing, execution flow, and output handling
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.3
**Can run parallel with**: None

**Implementation**:
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

**Acceptance Criteria**:
- [ ] Base class implements common execution flow
- [ ] Context creation with project root and package manager
- [ ] Utility methods for progress, success, warning, error
- [ ] File operations helpers implemented
- [ ] Skip condition helpers for file type checking
- [ ] JSON output method for Stop hooks
- [ ] Exit code handling (0 for success/skip, 2 for blocking)

### Task 1.5: Implement hook runner and configuration
**Description**: Build the hook runner that manages hook execution, configuration loading, and registry
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.4
**Can run parallel with**: None

**Implementation**:
```typescript
// cli/hooks/runner.ts
import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';
import { readStdin } from './utils.js';
import { BaseHook, HookResult } from './base.js';

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
    
    // Registry will be populated in Phase 2
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

**Configuration Type Definitions**:
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

**Acceptance Criteria**:
- [ ] Hook runner loads configuration from .claudekit/config.json
- [ ] Configuration validated with Zod schema
- [ ] Stdin payload parsed and passed to hooks
- [ ] Unknown hook names return exit code 1
- [ ] JSON responses handled for Stop hooks
- [ ] Default configuration returned when file missing

### Task 1.6: Update build system for dual binaries
**Description**: Configure the build system to produce both claudekit and claudekit-hooks binaries
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.2
**Can run parallel with**: None

**Package.json Updates**:
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

**Build Configuration**:
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

**Acceptance Criteria**:
- [ ] Package.json includes both binary entries
- [ ] Build scripts compile both CLIs separately
- [ ] ESBuild configuration for production builds
- [ ] TypeScript compilation for development builds
- [ ] External node modules properly configured
- [ ] Source maps generated for debugging

## Phase 2: Core Features - Hook Implementations

### Task 2.1: Implement TypeScript compiler hook
**Description**: Port the TypeScript compilation checking functionality to the new system
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.2, 2.3, 2.4

**Implementation**:
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

**Acceptance Criteria**:
- [ ] Checks only .ts and .tsx files
- [ ] Skips when no tsconfig.json present
- [ ] Uses project's package manager for execution
- [ ] Respects custom command from config
- [ ] Returns exit code 2 on compilation errors
- [ ] Clear error message with fix instructions

### Task 2.2: Implement no-any types hook
**Description**: Create hook that forbids the use of 'any' types in TypeScript files
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.1, 2.3, 2.4

**Implementation**:
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

**Acceptance Criteria**:
- [ ] Detects various 'any' type patterns
- [ ] Skips comments and test utilities (expect.any)
- [ ] Reports line numbers with errors
- [ ] Provides specific fix examples
- [ ] Returns exit code 2 when 'any' found
- [ ] Clear success message when clean

### Task 2.3: Implement ESLint hook
**Description**: Port ESLint validation to check JavaScript and TypeScript files
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.1, 2.2, 2.4

**Implementation (Part 1)**:
```typescript
// cli/hooks/eslint.ts (part 1)
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
```

**Implementation (Part 2)**:
```typescript
  // cli/hooks/eslint.ts (part 2)
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

**Note**: Some method names need adjustment to match BaseHook (log → progress, exec → execCommand, etc.)

**Acceptance Criteria**:
- [ ] Checks .js, .jsx, .ts, .tsx files
- [ ] Detects ESLint configuration files
- [ ] Verifies ESLint is executable
- [ ] Supports custom command from config
- [ ] Supports fix flag and extensions config
- [ ] Returns exit code 2 on lint errors
- [ ] Clear error formatting with common fixes

### Task 2.4: Implement auto-checkpoint hook
**Description**: Create git auto-checkpoint functionality that creates timestamped stashes on Stop events
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.1, 2.2, 2.3

**Implementation**:
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

**Acceptance Criteria**:
- [ ] Detects uncommitted changes using git status --porcelain
- [ ] Creates stash without modifying working directory
- [ ] Uses configured prefix (default: 'claude')
- [ ] Includes ISO timestamp in message
- [ ] Cleans up old checkpoints over limit
- [ ] Returns silent JSON response for Stop hook
- [ ] Handles case when no changes present

### Task 2.5: Implement run-related-tests hook
**Description**: Run tests related to changed files automatically
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.6, 2.7

**Implementation (Part 1)**:
```typescript
// cli/hooks/run-related-tests.ts (part 1)
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
```

**Implementation (Part 2)**:
```typescript
    // cli/hooks/run-related-tests.ts (part 2)
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

**Acceptance Criteria**:
- [ ] Runs tests only for source files (not test files)
- [ ] Finds test files using common patterns
- [ ] Warns when no tests found with suggestion
- [ ] Runs tests with proper package manager
- [ ] Detailed error instructions for failures
- [ ] Exit code 2 on test failures
- [ ] Supports custom test command from config

### Task 2.6: Implement project validation hook
**Description**: Create comprehensive project-wide validation running TypeScript, ESLint, and tests
**Size**: Large
**Priority**: Medium
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.5, 2.7

**Implementation (Part 1)**:
```typescript
// cli/hooks/project-validation.ts (part 1)
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
```

**Implementation (Part 2)**:
```typescript
    // cli/hooks/project-validation.ts (part 2)
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

**Acceptance Criteria**:
- [ ] Runs TypeScript, ESLint, and tests if available
- [ ] Checks tool availability before running
- [ ] Aggregates all validation results
- [ ] Clear output showing pass/fail for each check
- [ ] Lists failed commands for user to run
- [ ] Exit code 2 if any validation fails
- [ ] Supports custom commands from config

### Task 2.7: Implement validate-todo-completion hook
**Description**: Validate that all todos are completed before allowing Stop events
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.5, 2.6

**Implementation**:
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

**Acceptance Criteria**:
- [ ] Reads transcript path from payload
- [ ] Expands ~ to home directory
- [ ] Finds most recent todo state in transcript
- [ ] Blocks stop if incomplete todos exist
- [ ] Returns JSON response for Stop hook
- [ ] Clear reason message with todo list
- [ ] Exit code 0 (JSON controls decision)

### Task 2.8: Create hook registry
**Description**: Implement the hook registry that maps hook names to their implementations
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1-2.7
**Can run parallel with**: None

**Implementation**:
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

**Update Hook Runner**:
```typescript
// In cli/hooks/runner.ts constructor:
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
```

**Acceptance Criteria**:
- [ ] Registry exports all hook classes
- [ ] Type definition for valid hook names
- [ ] Hook runner imports and registers all hooks
- [ ] All hooks accessible by name

## Phase 3: Testing and Quality

### Task 3.1: Create unit tests for base infrastructure
**Description**: Write unit tests for BaseHook, HookRunner, and utilities
**Size**: Large
**Priority**: High
**Dependencies**: Phase 1 complete
**Can run parallel with**: Task 3.2

**Test Structure**:
```typescript
// tests/hooks/unit/base.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BaseHook } from '../../../cli/hooks/base.js';

class TestHook extends BaseHook {
  name = 'test';
  async execute(context): Promise<HookResult> {
    return { exitCode: 0 };
  }
}

describe('BaseHook', () => {
  it('should handle infinite loop prevention', async () => {
    const hook = new TestHook({});
    const result = await hook.run({ stop_hook_active: true });
    expect(result.exitCode).toBe(0);
  });
  
  it('should extract file path from payload', async () => {
    const hook = new TestHook({});
    vi.spyOn(hook as any, 'execute').mockResolvedValue({ exitCode: 0 });
    
    await hook.run({ tool_input: { file_path: '/test/file.ts' } });
    
    expect(hook.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        filePath: '/test/file.ts'
      })
    );
  });
});

// tests/hooks/unit/utils.test.ts
describe('readStdin', () => {
  it('should timeout after 1 second', async () => {
    const start = Date.now();
    const result = await readStdin();
    const duration = Date.now() - start;
    
    expect(result).toBe('');
    expect(duration).toBeGreaterThan(900);
    expect(duration).toBeLessThan(1100);
  });
});
```

**Acceptance Criteria**:
- [ ] Test BaseHook common flow
- [ ] Test utility functions (readStdin, findProjectRoot, etc.)
- [ ] Test HookRunner configuration loading
- [ ] Mock file system and command execution
- [ ] Verify exit codes and error handling
- [ ] Test timeout behavior

### Task 3.2: Create integration tests for hooks
**Description**: Write integration tests that verify complete hook execution flow
**Size**: Large
**Priority**: High
**Dependencies**: Phase 2 complete
**Can run parallel with**: Task 3.1

**Integration Test Framework**:
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
      
      const exitCode = await runHook('no-any', payload, testDir);
      expect(exitCode).toBe(2);
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
    
    child.on('close', (code) => {
      resolve(code || 0);
    });
  });
}
```

**Acceptance Criteria**:
- [ ] Test full hook execution with stdin/stdout
- [ ] Verify each hook's happy path
- [ ] Test error cases and exit codes
- [ ] Test configuration loading
- [ ] Verify Claude Code payload parsing
- [ ] Test with real file system operations

### Task 3.3: Create example configurations
**Description**: Create example .claudekit/config.json files demonstrating hook configuration
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 2 complete
**Can run parallel with**: Task 3.4

**Example Configuration**:
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

**Claude Settings Example**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks typecheck"},
          {"type": "command", "command": "claudekit-hooks no-any"}
        ]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
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

**Acceptance Criteria**:
- [ ] Example shows all hook configurations
- [ ] Claude settings show matcher patterns
- [ ] Comments explain each configuration option
- [ ] Examples for different package managers
- [ ] Save to examples/ directory

### Task 3.4: Update documentation
**Description**: Update README and create hook reference documentation
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 2 complete
**Can run parallel with**: Task 3.3

**Documentation Updates**:
- README.md updates for claudekit-hooks binary
- Hook configuration reference
- Migration guide from shell scripts
- Installation instructions

**Hook Reference Template**:
```markdown
## Hook Configuration Reference

### typecheck
Runs TypeScript compiler to check for type errors.

**Configuration Options:**
- `command` (string): Custom TypeScript command (default: uses package manager)
- `timeout` (number): Maximum execution time in ms (default: 30000)

**Example:**
```json
{
  "hooks": {
    "typecheck": {
      "command": "yarn tsc --noEmit",
      "timeout": 45000
    }
  }
}
```

### no-any
Forbids the use of 'any' types in TypeScript files.

**Configuration Options:**
- `timeout` (number): Maximum execution time in ms (default: 5000)

[Continue for all hooks...]
```

**Acceptance Criteria**:
- [ ] README includes dual binary information
- [ ] Installation guide updated
- [ ] Each hook has configuration documentation
- [ ] Migration guide from shell scripts
- [ ] Examples for common scenarios

## Phase 4: Release Preparation

### Task 4.1: Fix ESLint hook implementation issues
**Description**: Correct method names and imports in ESLint hook to match BaseHook interface
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: None

**Required Changes**:
- Change `log` to `progress`, `warning`, or `error` methods
- Change `exec` to `execCommand`
- Change `outputError` to `error`
- Remove undefined methods like `detectPackageManager` (use from context)
- Fix other method name mismatches

**Acceptance Criteria**:
- [ ] All method calls match BaseHook interface
- [ ] ESLint hook compiles without errors
- [ ] Methods use correct signatures

### Task 4.2: Add package dependencies
**Description**: Add required npm packages for the hooks system
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 4.3

**Dependencies to Add**:
```json
{
  "dependencies": {
    "commander": "^14.0.0",
    "zod": "^3.24.1",
    "fs-extra": "^11.3.0"
  }
}
```

**Acceptance Criteria**:
- [ ] Package.json includes all required dependencies
- [ ] Versions match specification
- [ ] No conflicting dependencies

### Task 4.3: Test build process
**Description**: Verify dual binary build process works correctly
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.6, Phase 2 complete
**Can run parallel with**: Task 4.2

**Testing Steps**:
1. Run `npm run build`
2. Verify dist/cli.js created
3. Verify dist/hooks-cli.js created
4. Test binary wrappers work
5. Check file sizes are reasonable

**Acceptance Criteria**:
- [ ] Build completes without errors
- [ ] Both binaries created in dist/
- [ ] Binary wrappers execute correctly
- [ ] File sizes under 20MB each
- [ ] Source maps generated

### Task 4.4: Create release checklist
**Description**: Document the release process and final verification steps
**Size**: Small
**Priority**: Medium
**Dependencies**: All previous tasks
**Can run parallel with**: None

**Release Checklist**:
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Examples working
- [ ] Build process verified
- [ ] Package version bumped
- [ ] Changelog updated
- [ ] Migration guide completed

**Acceptance Criteria**:
- [ ] Comprehensive release checklist created
- [ ] All items verified before release
- [ ] Release notes drafted

## Summary

**Total Tasks**: 20
**Phase Breakdown**:
- Phase 1 (Foundation): 6 tasks
- Phase 2 (Core Features): 8 tasks  
- Phase 3 (Testing & Quality): 4 tasks
- Phase 4 (Release): 4 tasks

**Complexity Distribution**:
- Small: 5 tasks
- Medium: 9 tasks
- Large: 6 tasks

**Parallel Execution Opportunities**:
- Phase 1: Tasks 1.2 and 1.3 can run in parallel
- Phase 2: Tasks 2.1-2.4 can run in parallel, Tasks 2.5-2.7 can run in parallel
- Phase 3: Tasks 3.1 and 3.2 can run in parallel, Tasks 3.3 and 3.4 can run in parallel
- Phase 4: Tasks 4.2 and 4.3 can run in parallel

**Critical Path**:
1.1 → 1.2/1.3 → 1.4 → 1.5 → 2.1-2.7 → 2.8 → 3.1/3.2 → 4.1 → 4.3 → 4.4

**Recommended Execution Strategy**:
1. Complete Phase 1 foundation tasks first
2. Implement hooks in parallel during Phase 2
3. Run tests and documentation in parallel during Phase 3
4. Final fixes and release preparation in Phase 4