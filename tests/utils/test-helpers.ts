/**
 * Test utilities and helpers for ClaudeKit CLI tests
 */

import { vi, expect } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type { Config } from '@/types/config';

// Test file system utilities
export class TestFileSystem {
  private tempDirs: Set<string> = new Set();

  async createTempDir(prefix = 'claudekit-test-'): Promise<string> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
    this.tempDirs.add(tempDir);
    return tempDir;
  }

  async createFileStructure(
    baseDir: string,
    structure: Record<string, string | Record<string, unknown>>
  ): Promise<void> {
    for (const [name, content] of Object.entries(structure)) {
      const fullPath = path.join(baseDir, name);
      
      if (typeof content === 'string') {
        // Create file
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
      } else if (typeof content === 'object' && content !== null) {
        // Create directory and recurse
        await fs.mkdir(fullPath, { recursive: true });
        await this.createFileStructure(fullPath, content as Record<string, string | Record<string, unknown>>);
      }
    }
  }

  async readFile(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  async readJson<T = unknown>(filePath: string): Promise<T> {
    const content = await this.readFile(filePath);
    return JSON.parse(content);
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, 'utf-8');
  }

  async writeJson(filePath: string, obj: unknown, spaces = 2): Promise<void> {
    const content = JSON.stringify(obj, null, spaces);
    await this.writeFile(filePath, content);
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async cleanup(): Promise<void> {
    const promises = Array.from(this.tempDirs).map(async (dir) => {
      try {
        await fs.rm(dir, { recursive: true, force: true });
      } catch {
        // Ignore cleanup errors
      }
    });
    
    await Promise.all(promises);
    this.tempDirs.clear();
  }
}

// Mock configuration helpers
export class MockConfigHelper {
  static createBasicConfig(overrides: Partial<Config> = {}): Config {
    return {
      hooks: {
        PostToolUse: [
          {
            matcher: 'tools:Write AND file_paths:**/*.ts',
            hooks: [
              {
                type: 'command',
                command: '.claude/hooks/typecheck.sh',
                enabled: true,
                retries: 0
              }
            ],
            enabled: true
          }
        ],
        Stop: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: '.claude/hooks/auto-checkpoint.sh',
                enabled: true,
                retries: 0
              }
            ],
            enabled: true
          }
        ]
      },
      ...overrides
    };
  }

  static createEmptyConfig(): Config {
    return { hooks: {} };
  }

  static createInvalidConfig(): unknown {
    return {
      hooks: 'this-should-be-an-object'
    };
  }
}

// Command testing utilities
export class CommandTestHelper {
  static mockProcessArgs(args: string[]): () => void {
    const originalArgv = process.argv;
    process.argv = ['node', 'claudekit', ...args];
    
    // Return cleanup function
    return () => {
      process.argv = originalArgv;
    };
  }

  static mockProcessCwd(cwd: string): () => void {
    // const originalCwd = process.cwd; // Removed unused variable
    vi.spyOn(process, 'cwd').mockReturnValue(cwd);
    
    return () => {
      vi.mocked(process.cwd).mockReset();
    };
  }

  static mockProcessExit(): { exit: ReturnType<typeof vi.spyOn>; cleanup: () => void } {
    const exit = vi.spyOn(process, 'exit').mockImplementation((_code?: string | number | null | undefined) => {
      // Mock implementation that doesn't actually exit
      return undefined as never;
    });
    
    return {
      exit: exit as ReturnType<typeof vi.spyOn>,
      cleanup: (): void => {
        exit.mockRestore();
      }
    };
  }
}

// Console testing utilities
export class ConsoleTestHelper {
  private static mocks: Map<string, ReturnType<typeof vi.spyOn>> = new Map();

  static mockConsole(): {
    log: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
  } {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});

    this.mocks.set('log', log);
    this.mocks.set('warn', warn);
    this.mocks.set('error', error);
    this.mocks.set('info', info);

    return { log, warn, error, info };
  }

  static getOutput(type: 'log' | 'warn' | 'error' | 'info'): string[] {
    const mock = this.mocks.get(type);
    if (!mock) {
      throw new Error(`Console ${type} is not mocked`);
    }
    return mock.mock.calls.map(call => call.join(' '));
  }

  static getLastOutput(type: 'log' | 'warn' | 'error' | 'info'): string | undefined {
    const output = this.getOutput(type);
    return output[output.length - 1];
  }

  static restore(): void {
    for (const mock of this.mocks.values()) {
      mock.mockRestore();
    }
    this.mocks.clear();
  }
}

// Assertion helpers
export class TestAssertions {
  static async expectFileToExist(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
    } catch {
      expect.fail(`Expected file to exist: ${filePath}`);
    }
  }

  static async expectFileNotToExist(filePath: string): Promise<void> {
    try {
      await fs.access(filePath);
      expect.fail(`Expected file not to exist: ${filePath}`);
    } catch {
      // File doesn't exist, which is what we want
    }
  }

  static async expectFileContent(filePath: string, expectedContent: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      expect(content).toBe(expectedContent);
    } catch (error) {
      expect.fail(`Failed to read file ${filePath}: ${error}`);
    }
  }

  static async expectJsonFile<T = unknown>(filePath: string, expectedObj: T): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed).toEqual(expectedObj);
    } catch (error) {
      expect.fail(`Failed to read/parse JSON file ${filePath}: ${error}`);
    }
  }

  static expectConsoleOutput(
    mock: ReturnType<typeof vi.spyOn>,
    expectedOutput: string | RegExp
  ): void {
    const calls = mock.mock.calls;
    const output = calls.map(call => call.join(' ')).join('\n');
    
    if (typeof expectedOutput === 'string') {
      expect(output).toContain(expectedOutput);
    } else {
      expect(output).toMatch(expectedOutput);
    }
  }
}

// Test timeout utilities
export class TestTimeouts {
  static short = 1000; // 1 second
  static medium = 5000; // 5 seconds
  static long = 10000; // 10 seconds

  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }
}

// Common test patterns
export class TestPatterns {
  static async testCommandWithOptions<T>(
    commandFn: (options: T) => Promise<void>,
    options: T,
    expectations: {
      shouldSucceed?: boolean;
      shouldCreateFiles?: string[];
      shouldModifyFiles?: string[];
      shouldLogMessages?: (string | RegExp)[];
      shouldExitWith?: number;
    }
  ): Promise<void> {
    const fs = new TestFileSystem();
    const console = ConsoleTestHelper.mockConsole();
    const { exit, cleanup: exitCleanup } = CommandTestHelper.mockProcessExit();

    try {
      if (expectations.shouldSucceed !== false) {
        await expect(commandFn(options)).resolves.not.toThrow();
      } else {
        await expect(commandFn(options)).rejects.toThrow();
      }

      // Check file creation
      if (expectations.shouldCreateFiles) {
        for (const filePath of expectations.shouldCreateFiles) {
          await TestAssertions.expectFileToExist(filePath);
        }
      }

      // Check log messages
      if (expectations.shouldLogMessages) {
        for (const message of expectations.shouldLogMessages) {
          TestAssertions.expectConsoleOutput(console.log, message);
        }
      }

      // Check process exit
      if (expectations.shouldExitWith !== undefined) {
        expect(exit).toHaveBeenCalledWith(expectations.shouldExitWith);
      }
    } finally {
      await fs.cleanup();
      ConsoleTestHelper.restore();
      exitCleanup();
    }
  }
}