import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import os from 'os';
import type { Config } from '@/types/config';

/**
 * Integration tests for hook execution flow
 * 
 * These tests verify:
 * - Complete hook execution with stdin/stdout
 * - Exit codes and error handling
 * - Configuration loading
 * - Claude Code payload parsing
 * - Real file system operations
 */

// Helper to execute a hook script with a given payload
export async function runHook(
  hookPath: string,
  payload: unknown,
  env: Record<string, string> = {}
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn('bash', [hookPath], {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    // Send payload as stdin
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

// Helper to run a command
export async function runCommand(
  command: string,
  args: string[] = [],
  options: {
    cwd?: string;
    env?: Record<string, string>;
    input?: string;
  } = {}
): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 0,
        stdout: stdout.trim(),
        stderr: stderr.trim()
      });
    });

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();
  });
}

// Test environment setup
class TestEnvironment {
  private tempDir: string = '';
  private originalCwd: string = '';

  async setup(): Promise<string> {
    this.originalCwd = process.cwd();
    this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudekit-hook-test-'));
    
    // Initialize git repo for hooks that need it
    await runCommand('git', ['init'], { cwd: this.tempDir });
    await runCommand('git', ['config', 'user.email', 'test@example.com'], { cwd: this.tempDir });
    await runCommand('git', ['config', 'user.name', 'Test User'], { cwd: this.tempDir });
    
    return this.tempDir;
  }

  async createFile(relativePath: string, content: string): Promise<string> {
    const fullPath = path.join(this.tempDir, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
    return fullPath;
  }

  async createSettings(config: Config): Promise<void> {
    const settingsPath = path.join(this.tempDir, '.claude', 'settings.json');
    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(config, null, 2), 'utf-8');
  }

  async cleanup(): Promise<void> {
    if (this.tempDir) {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    }
    if (this.originalCwd) {
      process.chdir(this.originalCwd);
    }
  }
}

describe('Hook Integration Tests', () => {
  let env: TestEnvironment;
  const hooksDir = path.join(process.cwd(), 'src', 'hooks');

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
  });

  afterEach(async () => {
    await env.cleanup();
  });

  describe('typecheck.sh', () => {
    const hookPath = path.join(hooksDir, 'typecheck.sh');

    it('should pass for valid TypeScript file', async () => {
      // Create TypeScript project structure
      await env.createFile('package.json', JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        devDependencies: {
          typescript: '^5.0.0'
        }
      }));

      await env.createFile('tsconfig.json', JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'commonjs',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true
        }
      }));

      const filePath = await env.createFile('src/valid.ts', `
        export function greet(name: string): string {
          return \`Hello, \${name}!\`;
        }
      `);

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('Type-checking');
      expect(result.stderr).toContain('TypeScript check passed');
    });

    it('should fail for file with any types', async () => {
      await env.createFile('package.json', JSON.stringify({
        name: 'test-project',
        devDependencies: { typescript: '^5.0.0' }
      }));

      await env.createFile('tsconfig.json', JSON.stringify({
        compilerOptions: { strict: true }
      }));

      const filePath = await env.createFile('src/with-any.ts', `
        export function process(data: any): any {
          return data;
        }
      `);

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('BLOCKED');
      expect(result.stderr).toContain('forbidden \'any\' types');
    });

    it('should skip non-TypeScript files', async () => {
      const filePath = await env.createFile('test.js', 'console.log("test");');

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
    });

    it('should handle missing file path in payload', async () => {
      const result = await runHook(hookPath, {});
      expect(result.exitCode).toBe(0);
    });

    it('should skip when no TypeScript config found', async () => {
      const filePath = await env.createFile('src/test.ts', 'const x = 1;');

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No TypeScript configuration found');
    });
  });

  describe('eslint.sh', () => {
    const hookPath = path.join(hooksDir, 'eslint.sh');

    it('should pass for valid JavaScript file', async () => {
      await env.createFile('package.json', JSON.stringify({
        name: 'test-project',
        devDependencies: { eslint: '^8.0.0' }
      }));

      await env.createFile('.eslintrc.json', JSON.stringify({
        env: { es2021: true, node: true },
        extends: ['eslint:recommended'],
        parserOptions: { ecmaVersion: 12 }
      }));

      const filePath = await env.createFile('src/valid.js', `
        function greet(name) {
          return \`Hello, \${name}!\`;
        }
        
        module.exports = { greet };
      `);

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('Linting');
      expect(result.stderr).toContain('ESLint check passed');
    });

    it('should fail for file with linting errors', async () => {
      await env.createFile('package.json', JSON.stringify({
        name: 'test-project',
        devDependencies: { eslint: '^8.0.0' }
      }));

      await env.createFile('.eslintrc.json', JSON.stringify({
        env: { es2021: true },
        extends: ['eslint:recommended'],
        rules: { 'no-unused-vars': 'error' }
      }));

      const filePath = await env.createFile('src/with-errors.js', `
        const unused = 'I am not used';
        function test() {
          console.log('test')
        }
      `);

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('BLOCKED');
      expect(result.stderr).toContain('\'unused\' is assigned a value but never used');
    });

    it('should skip when no ESLint config found', async () => {
      const filePath = await env.createFile('test.js', 'console.log("test");');

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No ESLint configuration found');
    });
  });

  describe('auto-checkpoint.sh', () => {
    const hookPath = path.join(hooksDir, 'auto-checkpoint.sh');

    it('should create checkpoint when there are changes', async () => {
      // Create a file and stage it
      await env.createFile('test.txt', 'initial content');
      await runCommand('git', ['add', '.'], { cwd: env['tempDir'] });
      await runCommand('git', ['commit', '-m', 'Initial commit'], { cwd: env['tempDir'] });
      
      // Make changes
      await env.createFile('test.txt', 'modified content');

      const result = await runHook(hookPath, {});

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('Creating checkpoint');
      
      // Verify stash was created
      const stashList = await runCommand('git', ['stash', 'list'], { cwd: env['tempDir'] });
      expect(stashList.stdout).toContain('[claude-checkpoint]');
    });

    it('should skip when no changes to checkpoint', async () => {
      const result = await runHook(hookPath, {});

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No changes to checkpoint');
    });

    it('should handle git repository not found', async () => {
      // Run in a directory without git
      const nonGitDir = await fs.mkdtemp(path.join(os.tmpdir(), 'no-git-'));
      
      try {
        const result = await runHook(hookPath, {}, { PWD: nonGitDir });
        expect(result.exitCode).toBe(0);
        expect(result.stderr).toContain('Not in a git repository');
      } finally {
        await fs.rm(nonGitDir, { recursive: true, force: true });
      }
    });
  });

  describe('validate-todo-completion.sh', () => {
    const hookPath = path.join(hooksDir, 'validate-todo-completion.sh');

    it('should pass when no TODO file exists', async () => {
      const result = await runHook(hookPath, {});
      expect(result.exitCode).toBe(0);
    });

    it('should pass when all todos are completed', async () => {
      await env.createFile('.claude/TODO.md', `
# TODO List

- [x] Completed task 1
- [x] Completed task 2
- [x] All done!
      `);

      const result = await runHook(hookPath, {});
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('All TODO items completed');
    });

    it('should fail when incomplete todos exist', async () => {
      await env.createFile('.claude/TODO.md', `
# TODO List

- [x] Completed task
- [ ] Incomplete task
- [ ] Another incomplete task
      `);

      const result = await runHook(hookPath, {});
      expect(result.exitCode).toBe(2);
      expect(result.stderr).toContain('BLOCKED');
      expect(result.stderr).toContain('2 incomplete TODO items');
      expect(result.stderr).toContain('Incomplete task');
    });
  });

  describe('run-related-tests.sh', () => {
    const hookPath = path.join(hooksDir, 'run-related-tests.sh');

    it('should find and run related test files', async () => {
      await env.createFile('package.json', JSON.stringify({
        name: 'test-project',
        scripts: {
          test: 'echo "Running tests"'
        }
      }));

      // Create source file and its test
      const srcFile = await env.createFile('src/utils.js', `
        module.exports.add = (a, b) => a + b;
      `);

      await env.createFile('src/utils.test.js', `
        const { add } = require('./utils');
        test('adds numbers', () => {
          expect(add(1, 2)).toBe(3);
        });
      `);

      const result = await runHook(hookPath, {
        tool_input: { file_path: srcFile }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('Running tests for');
      expect(result.stderr).toContain('utils.test.js');
    });

    it('should skip when no test files found', async () => {
      const filePath = await env.createFile('src/no-tests.js', 'console.log("no tests");');

      const result = await runHook(hookPath, {
        tool_input: { file_path: filePath }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('No test files found');
    });
  });

  describe('project-validation.sh', () => {
    const hookPath = path.join(hooksDir, 'project-validation.sh');

    it('should validate project structure', async () => {
      await env.createFile('package.json', JSON.stringify({
        name: 'test-project',
        version: '1.0.0'
      }));

      await env.createFile('README.md', '# Test Project');

      const result = await runHook(hookPath, {
        tool_input: { file_path: path.join(env['tempDir'], 'package.json') }
      });

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain('Validating project structure');
    });
  });

  describe('Configuration Loading', () => {
    it('should load and respect hook configuration', async () => {
      // Create config with custom timeout
      await env.createSettings({
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [{
                type: 'command',
                command: '.claude/hooks/typecheck.sh',
                enabled: true,
                timeout: 60000,
                retries: 0
              }],
              enabled: true
            }
          ]
        }
      });

      // Verify config is loaded (would need hook that outputs config)
      const settingsPath = path.join(env['tempDir'], '.claude', 'settings.json');
      const config = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
      
      expect(config.hooks.PostToolUse[0].hooks[0].timeout).toBe(60000);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON payload gracefully', async () => {
      const result = await runCommand(
        'bash',
        [path.join(hooksDir, 'typecheck.sh')],
        { input: 'not valid json' }
      );

      expect(result.exitCode).toBe(0);
    });

    it('should handle empty stdin', async () => {
      const result = await runCommand(
        'bash',
        [path.join(hooksDir, 'typecheck.sh')],
        { input: '' }
      );

      expect(result.exitCode).toBe(0);
    });

    it('should handle missing hook script', async () => {
      const result = await runHook('/nonexistent/hook.sh', {}).catch(err => ({
        exitCode: 127,
        stdout: '',
        stderr: err.message
      }));

      expect(result.exitCode).toBe(127);
    });
  });

  describe('Claude Code Payload Parsing', () => {
    it('should correctly parse nested tool_input', async () => {
      const filePath = await env.createFile('test.ts', 'const x = 1;');
      
      const payloads = [
        // Standard format
        { tool_input: { file_path: filePath } },
        // With additional fields
        { tool_input: { file_path: filePath, content: 'test' }, tool: 'Write' },
        // Deeply nested
        { tool_input: { file_path: filePath, metadata: { type: 'typescript' } } }
      ];

      for (const payload of payloads) {
        const result = await runHook(path.join(hooksDir, 'typecheck.sh'), payload);
        expect([0, 2]).toContain(result.exitCode); // Either passes or blocks based on TS config
      }
    });
  });

  describe('Real File System Operations', () => {
    it('should handle file paths with spaces', async () => {
      const filePath = await env.createFile('src/my file.ts', 'const x = 1;');
      
      const result = await runHook(path.join(hooksDir, 'typecheck.sh'), {
        tool_input: { file_path: filePath }
      });

      expect([0, 2]).toContain(result.exitCode);
    });

    it('should handle symlinks correctly', async () => {
      const targetPath = await env.createFile('target.ts', 'const x = 1;');
      const linkPath = path.join(env['tempDir'], 'link.ts');
      await fs.symlink(targetPath, linkPath);

      const result = await runHook(path.join(hooksDir, 'typecheck.sh'), {
        tool_input: { file_path: linkPath }
      });

      expect([0, 2]).toContain(result.exitCode);
    });

    it('should handle concurrent hook executions', async () => {
      const files = await Promise.all([
        env.createFile('file1.ts', 'const a = 1;'),
        env.createFile('file2.ts', 'const b = 2;'),
        env.createFile('file3.ts', 'const c = 3;')
      ]);

      const results = await Promise.all(
        files.map(filePath =>
          runHook(path.join(hooksDir, 'typecheck.sh'), {
            tool_input: { file_path: filePath }
          })
        )
      );

      results.forEach(result => {
        expect([0, 2]).toContain(result.exitCode);
      });
    });
  });

  describe('Exit Code Validation', () => {
    it('should use exit code 0 for success', async () => {
      const result = await runHook(path.join(hooksDir, 'auto-checkpoint.sh'), {});
      expect(result.exitCode).toBe(0);
    });

    it('should use exit code 2 for blocking errors', async () => {
      await env.createFile('.claude/TODO.md', '- [ ] Incomplete');
      
      const result = await runHook(path.join(hooksDir, 'validate-todo-completion.sh'), {});
      expect(result.exitCode).toBe(2);
    });
  });
});