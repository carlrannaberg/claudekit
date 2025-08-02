import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import {
  readStdin,
  findProjectRoot,
  detectPackageManager,
  execCommand,
  formatError,
  checkToolAvailable,
  fileExists,
  readJsonFile,
  writeJsonFile,
  findFiles,
  getFileModTime,
  ensureDirectory,
  parseStdinPayload,
  extractFilePaths,
  formatDuration,
} from '../../../cli/hooks/utils.js';

// Mock child_process exec
vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

// Mock fs-extra
vi.mock('fs-extra', () => {
  const pathExistsMock = vi.fn();
  const readJsonMock = vi.fn();
  const readFileMock = vi.fn();
  const writeJsonMock = vi.fn();
  const statMock = vi.fn();
  const ensureDirMock = vi.fn();

  return {
    default: {
      pathExists: pathExistsMock,
      readJson: readJsonMock,
      readFile: readFileMock,
      writeJson: writeJsonMock,
      stat: statMock,
      ensureDir: ensureDirMock,
    },
    pathExists: pathExistsMock,
    readJson: readJsonMock,
    readFile: readFileMock,
    writeJson: writeJsonMock,
    stat: statMock,
    ensureDir: ensureDirMock,
  };
});

// Get mocked fs module
const fs = (await import('fs-extra')) as unknown as {
  default: {
    pathExists: ReturnType<typeof vi.fn>;
    readJson: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    writeJson: ReturnType<typeof vi.fn>;
    stat: ReturnType<typeof vi.fn>;
    ensureDir: ReturnType<typeof vi.fn>;
  };
  pathExists: ReturnType<typeof vi.fn>;
  readJson: ReturnType<typeof vi.fn>;
  readFile: ReturnType<typeof vi.fn>;
  writeJson: ReturnType<typeof vi.fn>;
  stat: ReturnType<typeof vi.fn>;
  ensureDir: ReturnType<typeof vi.fn>;
};

describe('utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readStdin', () => {
    it.skip('should wait indefinitely for input (no timeout)', async () => {
      // This test is skipped because readStdin now waits indefinitely
      // for input to match Claude Code's expectations
    });

    it('should read data from stdin', async () => {
      const testData = '{"test": "data"}';
      const originalStdin = process.stdin;
      const mockStdin = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(testData), 10);
          } else if (event === 'end') {
            setTimeout(() => callback(), 20);
          }
        }),
      };
      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await readStdin();
      expect(result).toBe(testData);

      process.stdin = originalStdin;
    });
  });

  describe('findProjectRoot', () => {
    it('should use git rev-parse to find project root', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: '/test/project/root\n', stderr: '' });
        }
      );

      const result = await findProjectRoot('/test/some/dir');

      expect(result).toBe('/test/project/root');
      expect(mockExec).toHaveBeenCalledWith(
        'git rev-parse --show-toplevel',
        { cwd: '/test/some/dir' },
        expect.any(Function)
      );
    });

    it('should return current directory when git command fails', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(new Error('Not a git repository'), null);
        }
      );

      const cwd = process.cwd();
      const result = await findProjectRoot('/test/some/dir');

      expect(result).toBe(cwd);
    });

    it('should use current directory when no startDir provided', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: '/test/project\n', stderr: '' });
        }
      );

      await findProjectRoot();

      expect(mockExec).toHaveBeenCalledWith(
        'git rev-parse --show-toplevel',
        { cwd: process.cwd() },
        expect.any(Function)
      );
    });
  });

  describe('detectPackageManager', () => {
    it('should detect pnpm when pnpm-lock.yaml exists', async () => {
      fs.pathExists.mockImplementation(async (filePath: string) => {
        return filePath.includes('pnpm-lock.yaml');
      });

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'pnpm',
        exec: 'pnpm dlx',
        run: 'pnpm run',
        test: 'pnpm test',
      });
    });

    it('should detect yarn when yarn.lock exists', async () => {
      fs.pathExists.mockImplementation(async (filePath: string) => {
        return filePath.includes('yarn.lock');
      });

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'yarn',
        exec: 'yarn dlx',
        run: 'yarn',
        test: 'yarn test',
      });
    });

    it('should detect pnpm from packageManager field in package.json', async () => {
      fs.pathExists.mockImplementation(async (filePath: string) => {
        return filePath.includes('package.json');
      });
      fs.readJson.mockResolvedValue({
        packageManager: 'pnpm@8.0.0',
      });

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'pnpm',
        exec: 'pnpm dlx',
        run: 'pnpm run',
        test: 'pnpm test',
      });
    });

    it('should detect yarn from packageManager field in package.json', async () => {
      fs.pathExists.mockImplementation(async (filePath: string) => {
        return filePath.includes('package.json');
      });
      fs.readJson.mockResolvedValue({
        packageManager: 'yarn@3.0.0',
      });

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'yarn',
        exec: 'yarn dlx',
        run: 'yarn',
        test: 'yarn test',
      });
    });

    it('should default to npm when no lock files or packageManager field', async () => {
      fs.pathExists.mockImplementation(async (filePath: string) => {
        return filePath.includes('package.json');
      });
      fs.readJson.mockResolvedValue({});

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'npm',
        exec: 'npx',
        run: 'npm run',
        test: 'npm test',
      });
    });

    it('should default to npm when no package.json exists', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'npm',
        exec: 'npx',
        run: 'npm run',
        test: 'npm test',
      });
    });

    it('should handle package.json read errors gracefully', async () => {
      fs.pathExists.mockImplementation(async (filePath: string) => {
        return filePath.includes('package.json');
      });
      fs.readJson.mockRejectedValue(new Error('Invalid JSON'));

      const result = await detectPackageManager('/test/dir');

      expect(result).toEqual({
        name: 'npm',
        exec: 'npx',
        run: 'npm run',
        test: 'npm test',
      });
    });
  });

  describe('execCommand', () => {
    it('should execute command successfully', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: 'Success output', stderr: 'Some warnings' });
        }
      );

      const result = await execCommand('npm', ['test'], { cwd: '/test/dir' });

      expect(result).toEqual({
        stdout: 'Success output',
        stderr: 'Some warnings',
        exitCode: 0,
      });
      expect(mockExec).toHaveBeenCalledWith(
        'npm test',
        {
          cwd: '/test/dir',
          timeout: 30000,
          maxBuffer: 10485760,
        },
        expect.any(Function)
      );
    });

    it('should handle command failure', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      const error = Object.assign(new Error('Command failed'), {
        code: 1,
        stdout: 'Partial output',
        stderr: 'Error output',
      });

      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(error, null);
        }
      );

      const result = await execCommand('npm', ['test']);

      expect(result).toEqual({
        stdout: 'Partial output',
        stderr: 'Error output',
        exitCode: 1,
      });
    });

    it('should use default options when not provided', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: 'output', stderr: '' });
        }
      );

      await execCommand('ls');

      expect(mockExec).toHaveBeenCalledWith(
        'ls ',
        {
          cwd: process.cwd(),
          timeout: 30000,
          maxBuffer: 10485760,
        },
        expect.any(Function)
      );
    });

    it('should respect custom timeout', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: 'output', stderr: '' });
        }
      );

      await execCommand('npm', ['test'], { timeout: 60000 });

      expect(mockExec).toHaveBeenCalledWith(
        'npm test',
        expect.objectContaining({ timeout: 60000 }),
        expect.any(Function)
      );
    });
  });

  describe('formatError', () => {
    it('should format error with title, details, and instructions', () => {
      const result = formatError('TypeScript Error', 'Type mismatch in file.ts', [
        'Fix the type annotation',
        'Run typecheck again',
        'Commit the fix',
      ]);

      expect(result).toBe(
        'BLOCKED: TypeScript Error\n\n' +
          'Type mismatch in file.ts\n\n' +
          'MANDATORY INSTRUCTIONS:\n' +
          '1. Fix the type annotation\n' +
          '2. Run typecheck again\n' +
          '3. Commit the fix'
      );
    });

    it('should handle empty instructions array', () => {
      const result = formatError('Error', 'Details', []);

      expect(result).toBe('BLOCKED: Error\n\n' + 'Details\n\n' + 'MANDATORY INSTRUCTIONS:\n');
    });
  });

  describe('checkToolAvailable', () => {
    it('should return false when config file does not exist', async () => {
      fs.pathExists.mockResolvedValue(false);

      const result = await checkToolAvailable('eslint', '.eslintrc.json', '/test/project');

      expect(result).toBe(false);
      expect(fs.pathExists).toHaveBeenCalledWith('/test/project/.eslintrc.json');
    });

    it('should check tool execution when config exists', async () => {
      fs.pathExists.mockResolvedValue(true);
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: 'v8.0.0', stderr: '' });
        }
      );

      const result = await checkToolAvailable('eslint', '.eslintrc.json', '/test/project');

      expect(result).toBe(true);
      // The command will use the detected package manager, which in this test is pnpm
      expect(mockExec).toHaveBeenCalledWith(
        'pnpm dlx eslint --version',
        expect.objectContaining({ timeout: 10000 }),
        expect.any(Function)
      );
    });

    it('should return false when tool execution fails', async () => {
      fs.pathExists.mockResolvedValue(true);
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(new Error('Command not found'), null);
        }
      );

      const result = await checkToolAvailable('eslint', '.eslintrc.json', '/test/project');

      expect(result).toBe(false);
    });
  });

  describe('file operations', () => {
    describe('fileExists', () => {
      it('should return true when file exists', async () => {
        fs.pathExists.mockResolvedValue(true);

        const result = await fileExists('/test/file.ts');

        expect(result).toBe(true);
        expect(fs.pathExists).toHaveBeenCalledWith('/test/file.ts');
      });

      it('should return false when file does not exist', async () => {
        fs.pathExists.mockResolvedValue(false);

        const result = await fileExists('/test/missing.ts');

        expect(result).toBe(false);
      });

      it('should handle errors gracefully', async () => {
        fs.pathExists.mockRejectedValue(new Error('Permission denied'));

        const result = await fileExists('/test/file.ts');

        expect(result).toBe(false);
      });
    });

    describe('readJsonFile', () => {
      it('should read and parse JSON file', async () => {
        const testData = { test: 'data', count: 42 };
        fs.readJson.mockResolvedValue(testData);

        const result = await readJsonFile('/test/config.json');

        expect(result).toEqual(testData);
        expect(fs.readJson).toHaveBeenCalledWith('/test/config.json');
      });
    });

    describe('writeJsonFile', () => {
      it('should write JSON file with proper formatting', async () => {
        const testData = { test: 'data', count: 42 };
        fs.writeJson.mockResolvedValue(undefined);

        await writeJsonFile('/test/output.json', testData);

        expect(fs.writeJson).toHaveBeenCalledWith('/test/output.json', testData, { spaces: 2 });
      });
    });

    describe('getFileModTime', () => {
      it('should return file modification time', async () => {
        const modTime = new Date('2025-01-01T00:00:00Z');
        fs.stat.mockResolvedValue({
          mtime: modTime,
        } as { mtime: Date });

        const result = await getFileModTime('/test/file.ts');

        expect(result).toEqual(modTime);
        expect(fs.stat).toHaveBeenCalledWith('/test/file.ts');
      });
    });

    describe('ensureDirectory', () => {
      it('should create directory if it does not exist', async () => {
        fs.ensureDir.mockResolvedValue(undefined);

        await ensureDirectory('/test/new/dir');

        expect(fs.ensureDir).toHaveBeenCalledWith('/test/new/dir');
      });
    });
  });

  describe('findFiles', () => {
    it('should find files matching pattern', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, {
            stdout: './src/file1.ts\n./src/file2.ts\n./test/file3.ts\n',
            stderr: '',
          });
        }
      );

      const result = await findFiles('*.ts', '/test/project');

      // The implementation joins paths without the extra './'
      expect(result).toEqual([
        '/test/project/src/file1.ts',
        '/test/project/src/file2.ts',
        '/test/project/test/file3.ts',
      ]);
      expect(mockExec).toHaveBeenCalledWith(
        'find . -name "*.ts"',
        { cwd: '/test/project' },
        expect.any(Function)
      );
    });

    it('should handle empty results', async () => {
      const mockExec = exec as unknown as ReturnType<typeof vi.fn>;
      mockExec.mockImplementation(
        (
          _cmd: string,
          _opts: unknown,
          callback: (error: Error | null, result: { stdout: string; stderr: string } | null) => void
        ) => {
          callback(null, { stdout: '', stderr: '' });
        }
      );

      const result = await findFiles('*.xyz', '/test/project');

      expect(result).toEqual([]);
    });
  });

  describe('parseStdinPayload', () => {
    it('should parse valid JSON from stdin', async () => {
      const testPayload = { tool: 'Write', file_path: '/test/file.ts' };
      const originalStdin = process.stdin;

      const mockStdin = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback(JSON.stringify(testPayload)), 10);
          } else if (event === 'end') {
            setTimeout(() => callback(), 20);
          }
        }),
      };
      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      const result = await parseStdinPayload();

      expect(result).toEqual(testPayload);
      process.stdin = originalStdin;
    });

    it('should reject on invalid JSON', async () => {
      const originalStdin = process.stdin;

      const mockStdin = {
        on: vi.fn((event, callback) => {
          if (event === 'data') {
            setTimeout(() => callback('invalid json'), 10);
          } else if (event === 'end') {
            setTimeout(() => callback(), 20);
          }
        }),
      };
      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      await expect(parseStdinPayload()).rejects.toThrow('Invalid JSON payload');

      process.stdin = originalStdin;
    });

    it('should handle stdin errors', async () => {
      const originalStdin = process.stdin;
      const testError = new Error('stdin error');

      const mockStdin = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(testError), 10);
          }
        }),
      };
      Object.defineProperty(process, 'stdin', {
        value: mockStdin,
        writable: true,
        configurable: true,
      });

      await expect(parseStdinPayload()).rejects.toThrow('stdin error');

      process.stdin = originalStdin;
    });
  });

  describe('extractFilePaths', () => {
    it('should extract file_path from top level', () => {
      const payload = { file_path: '/test/file.ts' };
      const result = extractFilePaths(payload);

      expect(result).toEqual(['/test/file.ts']);
    });

    it('should extract file_path from tool_input', () => {
      const payload = { tool_input: { file_path: '/test/file.ts' } };
      const result = extractFilePaths(payload);

      expect(result).toEqual(['/test/file.ts']);
    });

    it('should extract file paths from edits array', () => {
      const payload = {
        edits: [
          { file_path: '/test/file1.ts', old_string: 'old', new_string: 'new' },
          { file_path: '/test/file2.ts', old_string: 'old', new_string: 'new' },
        ],
      };
      const result = extractFilePaths(payload);

      expect(result).toEqual(['/test/file1.ts', '/test/file2.ts']);
    });

    it('should remove duplicate paths', () => {
      const payload = {
        file_path: '/test/file.ts',
        tool_input: { file_path: '/test/file.ts' },
        edits: [{ file_path: '/test/file.ts' }, { file_path: '/test/other.ts' }],
      };
      const result = extractFilePaths(payload);

      expect(result).toEqual(['/test/file.ts', '/test/other.ts']);
    });

    it('should return empty array when no paths found', () => {
      const payload = { other_field: 'value' };
      const result = extractFilePaths(payload);

      expect(result).toEqual([]);
    });

    it('should handle missing fields gracefully', () => {
      const payload = {
        tool_input: {},
        edits: null,
      };
      const result = extractFilePaths(payload);

      expect(result).toEqual([]);
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(5500)).toBe('5s');
      expect(formatDuration(59999)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(65000)).toBe('1m 5s');
      expect(formatDuration(125000)).toBe('2m 5s');
      expect(formatDuration(3665000)).toBe('61m 5s');
    });
  });
});
