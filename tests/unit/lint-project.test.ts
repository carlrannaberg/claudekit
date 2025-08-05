import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LintProjectHook } from '../../cli/hooks/lint-project.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as utils from '../../cli/hooks/utils.js';

describe('LintProjectHook', () => {
  let hook: LintProjectHook;
  let mockCheckToolAvailable: ReturnType<typeof vi.fn>;
  let mockExecCommand: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hook = new LintProjectHook();
    mockCheckToolAvailable = vi.fn();
    mockExecCommand = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock the utils functions
    vi.spyOn(utils, 'checkToolAvailable').mockImplementation(mockCheckToolAvailable);
    vi.spyOn(utils, 'formatESLintErrors').mockReturnValue('Formatted ESLint errors');

    // Mock the execCommand method on the hook instance
    vi.spyOn(
      hook as unknown as { execCommand: typeof mockExecCommand },
      'execCommand'
    ).mockImplementation(mockExecCommand);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockContext = (overrides: Partial<HookContext> = {}): HookContext => ({
    projectRoot: '/test/project',
    packageManager: {
      name: 'npm',
      exec: 'npx',
      run: 'npm run',
      test: 'npm test',
    },
    payload: {},
    filePath: undefined,
    ...overrides,
  });

  describe('execute', () => {
    it('should skip when ESLint not available', async () => {
      mockCheckToolAvailable.mockResolvedValue(false);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      expect(mockCheckToolAvailable).toHaveBeenCalledWith(
        'eslint',
        '.eslintrc.json',
        '/test/project'
      );
      expect(mockExecCommand).not.toHaveBeenCalled();
    });

    it('should run eslint on project with npm', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('npx eslint . --ext .js,.jsx,.ts,.tsx', [], {
        cwd: '/test/project',
      });
      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide ESLint validation...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ ESLint validation passed!');
    });

    it('should run eslint on project with pnpm', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext({
        packageManager: {
          name: 'pnpm',
          exec: 'pnpm dlx',
          run: 'pnpm run',
          test: 'pnpm test',
        },
      });

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith(
        'pnpm dlx eslint . --ext .js,.jsx,.ts,.tsx',
        [],
        { cwd: '/test/project' }
      );
    });

    it('should run eslint on project with yarn', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext({
        packageManager: {
          name: 'yarn',
          exec: 'yarn dlx',
          run: 'yarn',
          test: 'yarn test',
        },
      });

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith(
        'yarn dlx eslint . --ext .js,.jsx,.ts,.tsx',
        [],
        { cwd: '/test/project' }
      );
    });

    it('should respect custom eslintCommand', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      (hook as unknown as { config: { eslintCommand: string } }).config = {
        eslintCommand: 'pnpm eslint . --fix',
      };
      const context = createMockContext();

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('pnpm eslint . --fix', [], {
        cwd: '/test/project',
      });
    });

    it('should format errors on failure with non-zero exit code', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      const mockResult = {
        exitCode: 1,
        stdout: '/test/file.js:1:1 error Missing semicolon',
        stderr: '',
      };
      mockExecCommand.mockResolvedValue(mockResult);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(2);
      expect(utils.formatESLintErrors).toHaveBeenCalledWith(mockResult);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Formatted ESLint errors');
    });

    it('should format errors when stdout contains error even with exit code 0', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      const mockResult = {
        exitCode: 0,
        stdout: '/test/file.js:1:1 error Missing semicolon',
        stderr: '',
      };
      mockExecCommand.mockResolvedValue(mockResult);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(2);
      expect(utils.formatESLintErrors).toHaveBeenCalledWith(mockResult);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Formatted ESLint errors');
    });

    it('should pass when exit code is 0 and no errors in stdout', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      const mockResult = {
        exitCode: 0,
        stdout: 'All files passed linting',
        stderr: '',
      };
      mockExecCommand.mockResolvedValue(mockResult);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      expect(utils.formatESLintErrors).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ ESLint validation passed!');
    });

    it('should display progress message', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide ESLint validation...');
    });

    it('should display success message on success', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ ESLint validation passed!');
    });

    it('should handle context with different project root', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext({
        projectRoot: '/different/project/path',
      });

      await hook.execute(context);

      expect(mockCheckToolAvailable).toHaveBeenCalledWith(
        'eslint',
        '.eslintrc.json',
        '/different/project/path'
      );
      expect(mockExecCommand).toHaveBeenCalledWith('npx eslint . --ext .js,.jsx,.ts,.tsx', [], {
        cwd: '/different/project/path',
      });
    });
  });

  describe('hook name', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('lint-project');
    });
  });

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const config = { eslintCommand: 'custom eslint command', timeout: 60000 };
      const configuredHook = new LintProjectHook(config);

      expect((configuredHook as unknown as { config: unknown }).config).toEqual(config);
    });
  });
});
