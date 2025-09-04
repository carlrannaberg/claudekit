import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LintProjectHook } from '../../cli/hooks/lint-project.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as utils from '../../cli/hooks/utils.js';
import * as configUtils from '../../cli/utils/claudekit-config.js';
import * as projectDetection from '../../cli/lib/project-detection.js';

describe('LintProjectHook', () => {
  let hook: LintProjectHook;
  let mockCheckToolAvailable: ReturnType<typeof vi.fn>;
  let mockExecCommand: ReturnType<typeof vi.fn>;
  let mockGetHookConfig: ReturnType<typeof vi.fn>;
  let mockDetectBiome: ReturnType<typeof vi.fn>;
  let mockDetectESLint: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hook = new LintProjectHook();
    mockCheckToolAvailable = vi.fn();
    mockExecCommand = vi.fn();
    mockGetHookConfig = vi.fn().mockReturnValue({});
    mockDetectBiome = vi.fn();
    mockDetectESLint = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock the utils functions
    vi.spyOn(utils, 'checkToolAvailable').mockImplementation(mockCheckToolAvailable);
    vi.spyOn(utils, 'formatESLintErrors').mockReturnValue('Formatted ESLint errors');
    vi.spyOn(utils, 'formatBiomeErrors').mockReturnValue('Formatted Biome errors');
    vi.spyOn(configUtils, 'getHookConfig').mockImplementation(mockGetHookConfig);
    vi.spyOn(projectDetection, 'detectBiome').mockImplementation(mockDetectBiome);
    vi.spyOn(projectDetection, 'detectESLint').mockImplementation(mockDetectESLint);

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
    it('should skip when no linters are available', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(false);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('No linters configured, skipping lint validation');
      expect(mockExecCommand).not.toHaveBeenCalled();
    });

    it('should run eslint on project with npm', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('npx eslint . --ext .js,.jsx,.ts,.tsx', [], {
        cwd: '/test/project',
        timeout: 60000,
      });
      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide ESLint validation...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ ESLint validation passed!');
    });

    it('should run eslint on project with pnpm', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
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
        { cwd: '/test/project', timeout: 60000 }
      );
    });

    it('should run eslint on project with yarn', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
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
        { cwd: '/test/project', timeout: 60000 }
      );
    });

    it('should respect custom eslintCommand', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      mockGetHookConfig.mockReturnValue({
        command: 'pnpm eslint . --fix',
      });
      const context = createMockContext();

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('pnpm eslint . --fix', [], {
        cwd: '/test/project',
        timeout: 60000,
      });
    });

    it('should format errors on failure with non-zero exit code', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('ESLint validation failed:\nFormatted ESLint errors');
    });

    it('should format errors when stdout contains error even with exit code 0', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
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
      expect(consoleErrorSpy).toHaveBeenCalledWith('ESLint validation failed:\nFormatted ESLint errors');
    });

    it('should pass when exit code is 0 and no errors in stdout', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
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
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide ESLint validation...');
    });

    it('should display success message on success', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ ESLint validation passed!');
    });

    it('should handle context with different project root', async () => {
      mockDetectBiome.mockResolvedValue(false);
      mockDetectESLint.mockResolvedValue(true);
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext({
        projectRoot: '/different/project/path',
      });

      await hook.execute(context);

      expect(mockDetectESLint).toHaveBeenCalledWith('/different/project/path');
      expect(mockCheckToolAvailable).toHaveBeenCalledWith(
        'eslint',
        '.eslintrc.json',
        '/different/project/path'
      );
      expect(mockExecCommand).toHaveBeenCalledWith('npx eslint . --ext .js,.jsx,.ts,.tsx', [], {
        cwd: '/different/project/path',
        timeout: 60000,
      });
    });

    it('should run both Biome and ESLint when both are configured', async () => {
      mockDetectBiome.mockResolvedValue(true);
      mockDetectESLint.mockResolvedValue(true);
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      expect(mockExecCommand).toHaveBeenCalledWith('npx biome', ['check', '.'], {
        cwd: '/test/project',
        timeout: 60000,
      });
      expect(mockExecCommand).toHaveBeenCalledWith('npx eslint . --ext .js,.jsx,.ts,.tsx', [], {
        cwd: '/test/project',
        timeout: 60000,
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide Biome validation...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide ESLint validation...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ Biome validation passed!');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ ESLint validation passed!');
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
