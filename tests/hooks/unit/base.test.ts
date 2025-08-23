import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'node:path';
import type { HookContext, HookResult, ClaudePayload } from '../../../cli/hooks/base.js';
import { BaseHook } from '../../../cli/hooks/base.js';
import * as utils from '../../../cli/hooks/utils.js';

// Mock fs-extra
vi.mock('fs-extra', () => {
  const pathExistsMock = vi.fn();
  const readFileMock = vi.fn();

  return {
    default: {
      pathExists: pathExistsMock,
      readFile: readFileMock,
    },
    pathExists: pathExistsMock,
    readFile: readFileMock,
  };
});

// Test implementation of BaseHook
class TestHook extends BaseHook {
  name = 'test';
  executeCallCount = 0;
  lastContext?: HookContext;
  mockResult: HookResult = { exitCode: 0 };

  async execute(context: HookContext): Promise<HookResult> {
    this.executeCallCount++;
    this.lastContext = context;
    return this.mockResult;
  }
}

describe('BaseHook', () => {
  let testHook: TestHook;

  beforeEach(() => {
    testHook = new TestHook();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('run', () => {
    it('should handle infinite loop prevention with stop_hook_active', async () => {
      const payload: ClaudePayload = { stop_hook_active: true };
      const result = await testHook.run(payload);

      expect(result.exitCode).toBe(0);
      expect(testHook.executeCallCount).toBe(0); // execute should not be called
    });

    it('should extract file path from tool_input.file_path', async () => {
      const filePath = '/test/path/file.ts';
      const payload: ClaudePayload = {
        tool_input: { file_path: filePath },
      };

      // Mock findProjectRoot and detectPackageManager
      vi.spyOn(utils, 'findProjectRoot').mockResolvedValue('/test/project');
      vi.spyOn(utils, 'detectPackageManager').mockResolvedValue({
        name: 'npm',
        exec: 'npx',
        run: 'npm run',
        test: 'npm test',
      });

      await testHook.run(payload);

      expect(testHook.lastContext?.filePath).toBe(filePath);
      expect(utils.findProjectRoot).toHaveBeenCalledWith(path.dirname(filePath));
    });

    it('should create context with project root and package manager', async () => {
      const payload: ClaudePayload = {};
      const expectedProjectRoot = '/test/project/root';
      const expectedPackageManager = {
        name: 'pnpm' as const,
        exec: 'pnpm dlx',
        run: 'pnpm run',
        test: 'pnpm test',
      };

      vi.spyOn(utils, 'findProjectRoot').mockResolvedValue(expectedProjectRoot);
      vi.spyOn(utils, 'detectPackageManager').mockResolvedValue(expectedPackageManager);

      await testHook.run(payload);

      expect(testHook.lastContext).toEqual({
        filePath: undefined,
        projectRoot: expectedProjectRoot,
        payload,
        packageManager: expectedPackageManager,
      });
    });

    it('should use current directory when no file path provided', async () => {
      const payload: ClaudePayload = {};
      const cwd = process.cwd();

      vi.spyOn(utils, 'findProjectRoot').mockResolvedValue('/test/project');
      vi.spyOn(utils, 'detectPackageManager').mockResolvedValue({
        name: 'npm',
        exec: 'npx',
        run: 'npm run',
        test: 'npm test',
      });

      await testHook.run(payload);

      expect(utils.findProjectRoot).toHaveBeenCalledWith(cwd);
    });

    it('should pass through execute result', async () => {
      const expectedResult: HookResult = {
        exitCode: 2,
        suppressOutput: true,
        jsonResponse: { test: 'data' },
      };
      testHook.mockResult = expectedResult;

      vi.spyOn(utils, 'findProjectRoot').mockResolvedValue('/test/project');
      vi.spyOn(utils, 'detectPackageManager').mockResolvedValue({
        name: 'npm',
        exec: 'npx',
        run: 'npm run',
        test: 'npm test',
      });

      const result = await testHook.run({});
      expect(result).toEqual(expectedResult);
    });
  });

  describe('configuration', () => {
    it('should accept and store configuration', () => {
      const config = { timeout: 60000, customOption: 'test' };
      const hook = new TestHook(config);

      expect((hook as unknown as BaseHook & { config: typeof config }).config).toEqual(config);
    });

    it('should have default empty configuration', () => {
      const hook = new TestHook();
      expect((hook as unknown as BaseHook & { config: object }).config).toEqual({});
    });
  });

  describe('utility methods', () => {
    let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    it('should output progress message to stderr', () => {
      (testHook as unknown as BaseHook & { progress: (message: string) => void }).progress(
        'Processing files...'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('Processing files...');
    });

    it('should output success message with checkmark to stderr', () => {
      (testHook as unknown as BaseHook & { success: (message: string) => void }).success(
        'All tests passed'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ All tests passed');
    });

    it('should output warning message with warning icon to stderr', () => {
      (testHook as unknown as BaseHook & { warning: (message: string) => void }).warning(
        'Some tests skipped'
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith('⚠️  Some tests skipped');
    });

    it('should format error output correctly', () => {
      const title = 'TypeScript Error';
      const details = 'Type error in file.ts';
      const instructions = ['Fix the type error', 'Run typecheck again'];

      vi.spyOn(utils, 'formatError').mockReturnValue('BLOCKED: TypeScript Error\n...');

      (
        testHook as unknown as BaseHook & {
          error: (title: string, details: string, instructions: string[]) => void;
        }
      ).error(title, details, instructions);

      expect(utils.formatError).toHaveBeenCalledWith(title, details, instructions);
      expect(consoleErrorSpy).toHaveBeenCalledWith('BLOCKED: TypeScript Error\n...');
    });

    it('should output JSON to stdout', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const data = { result: 'success', count: 42 };

      (testHook as unknown as BaseHook & { jsonOutput: (data: object) => void }).jsonOutput(data);

      expect(consoleLogSpy).toHaveBeenCalledWith(JSON.stringify(data));
      consoleLogSpy.mockRestore();
    });
  });

  describe('file operations', () => {
    beforeEach(async () => {
      const fsModule = await import('fs-extra');
      const fsMock = fsModule.default as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
      };
      fsMock.pathExists.mockClear();
      fsMock.readFile.mockClear();
    });

    it('should check if file exists', async () => {
      const filePath = '/test/file.ts';
      const fsModule = await import('fs-extra');
      const fsMock = fsModule.default as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
      };

      // Configure the mock
      fsMock.pathExists.mockResolvedValue(true);

      const exists = await (
        testHook as unknown as BaseHook & { fileExists: (path: string) => Promise<boolean> }
      ).fileExists(filePath);

      expect(exists).toBe(true);
      expect(fsMock.pathExists).toHaveBeenCalledWith(filePath);
    });

    it('should read file contents', async () => {
      const filePath = '/test/file.ts';
      const contents = 'console.log("test");';
      const fsModule = await import('fs-extra');
      const fsMock = fsModule.default as unknown as {
        pathExists: ReturnType<typeof vi.fn>;
        readFile: ReturnType<typeof vi.fn>;
      };

      // Configure the mock
      fsMock.readFile.mockResolvedValue(contents);

      const result = await (
        testHook as unknown as BaseHook & { readFile: (path: string) => Promise<string> }
      ).readFile(filePath);

      expect(result).toBe(contents);
      expect(fsMock.readFile).toHaveBeenCalledWith(filePath, 'utf-8');
    });
  });

  describe('shouldSkipFile', () => {
    it('should skip when file path is undefined', () => {
      const result = (
        testHook as unknown as BaseHook & {
          shouldSkipFile: (filePath: string | undefined, extensions: string[]) => boolean;
        }
      ).shouldSkipFile(undefined, ['.ts', '.tsx']);
      expect(result).toBe(true);
    });

    it('should skip when file extension does not match', () => {
      const result = (
        testHook as unknown as BaseHook & {
          shouldSkipFile: (filePath: string | undefined, extensions: string[]) => boolean;
        }
      ).shouldSkipFile('/test/file.js', ['.ts', '.tsx']);
      expect(result).toBe(true);
    });

    it('should not skip when file extension matches', () => {
      const result = (
        testHook as unknown as BaseHook & {
          shouldSkipFile: (filePath: string | undefined, extensions: string[]) => boolean;
        }
      ).shouldSkipFile('/test/file.ts', ['.ts', '.tsx']);
      expect(result).toBe(false);
    });

    it('should match any of the provided extensions', () => {
      expect(
        (
          testHook as unknown as BaseHook & {
            shouldSkipFile: (filePath: string | undefined, extensions: string[]) => boolean;
          }
        ).shouldSkipFile('/test/file.tsx', ['.ts', '.tsx'])
      ).toBe(false);
      expect(
        (
          testHook as unknown as BaseHook & {
            shouldSkipFile: (filePath: string | undefined, extensions: string[]) => boolean;
          }
        ).shouldSkipFile('/test/file.ts', ['.ts', '.tsx'])
      ).toBe(false);
      expect(
        (
          testHook as unknown as BaseHook & {
            shouldSkipFile: (filePath: string | undefined, extensions: string[]) => boolean;
          }
        ).shouldSkipFile('/test/file.jsx', ['.ts', '.tsx'])
      ).toBe(true);
    });
  });

  describe('execCommand', () => {
    it('should execute command with default timeout from config', async () => {
      const hook = new TestHook({ timeout: 45000 });
      const mockResult = { stdout: 'success', stderr: '', exitCode: 0 };
      vi.spyOn(utils, 'execCommand').mockResolvedValue(mockResult);

      const result = await (
        hook as unknown as BaseHook & {
          execCommand: (
            cmd: string,
            args: string[],
            options?: { timeout?: number; cwd?: string }
          ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
        }
      ).execCommand('npm', ['test']);

      expect(utils.execCommand).toHaveBeenCalledWith('npm', ['test'], {
        timeout: 45000,
      });
      expect(result).toEqual(mockResult);
    });

    it('should allow overriding timeout and cwd', async () => {
      const hook = new TestHook({ timeout: 45000 });
      const mockResult = { stdout: 'success', stderr: '', exitCode: 0 };
      vi.spyOn(utils, 'execCommand').mockResolvedValue(mockResult);

      const result = await (
        hook as unknown as BaseHook & {
          execCommand: (
            cmd: string,
            args: string[],
            options?: { timeout?: number; cwd?: string }
          ) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
        }
      ).execCommand('npm', ['test'], {
        timeout: 10000,
        cwd: '/custom/dir',
      });

      expect(utils.execCommand).toHaveBeenCalledWith('npm', ['test'], {
        timeout: 10000,
        cwd: '/custom/dir',
      });
      expect(result).toEqual(mockResult);
    });
  });
});
