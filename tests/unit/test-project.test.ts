import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TestProjectHook } from '../../cli/hooks/test-project.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as utils from '../../cli/hooks/utils.js';
import * as configUtils from '../../cli/utils/claudekit-config.js';

describe('TestProjectHook', () => {
  let hook: TestProjectHook;
  let mockExecCommand: ReturnType<typeof vi.fn>;
  let mockGetHookConfig: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hook = new TestProjectHook();
    mockExecCommand = vi.fn();
    mockGetHookConfig = vi.fn().mockReturnValue({});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock the utils functions
    vi.spyOn(utils, 'formatTestErrors').mockReturnValue('Formatted test errors');
    vi.spyOn(configUtils, 'getHookConfig').mockImplementation(mockGetHookConfig);

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
    it('should skip when no test script exists', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"build": "tsc"}}',
            stderr: '',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      expect(mockExecCommand).toHaveBeenCalledWith('cat', ['package.json'], {
        cwd: '/test/project',
      });
      // Should not call the test command
      expect(mockExecCommand).not.toHaveBeenCalledWith('npm test', [], expect.any(Object));
    });

    it('should run test script when it exists with npm', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        if (command === 'npm test') {
          return Promise.resolve({ exitCode: 0, stdout: 'All tests passed', stderr: '' });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('npm test', [], {
        cwd: '/test/project',
        timeout: 55000,
      });
      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project test suite...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ All tests passed!');
    });

    it('should run test script with pnpm', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "vitest"}}',
            stderr: '',
          });
        }
        if (command === 'pnpm test') {
          return Promise.resolve({ exitCode: 0, stdout: 'All tests passed', stderr: '' });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext({
        packageManager: {
          name: 'pnpm',
          exec: 'pnpm dlx',
          run: 'pnpm run',
          test: 'pnpm test',
        },
      });

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('pnpm test', [], {
        cwd: '/test/project',
        timeout: 55000,
      });
    });

    it('should run test script with yarn', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        if (command === 'yarn test') {
          return Promise.resolve({ exitCode: 0, stdout: 'All tests passed', stderr: '' });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext({
        packageManager: {
          name: 'yarn',
          exec: 'yarn dlx',
          run: 'yarn',
          test: 'yarn test',
        },
      });

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('yarn test', [], {
        cwd: '/test/project',
        timeout: 55000,
      });
    });

    it('should respect custom testCommand', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        if (command === 'custom test command') {
          return Promise.resolve({ exitCode: 0, stdout: 'All tests passed', stderr: '' });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      mockGetHookConfig.mockReturnValue({
        command: 'custom test command',
      });
      const context = createMockContext();

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('custom test command', [], {
        cwd: '/test/project',
        timeout: 55000,
      });
    });

    it('should format errors on test failure', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        if (command === 'npm test') {
          return Promise.resolve({
            exitCode: 1,
            stdout: 'FAIL test/example.test.js',
            stderr: 'Test suite failed',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(2);
      expect(utils.formatTestErrors).toHaveBeenCalledWith({
        exitCode: 1,
        stdout: 'FAIL test/example.test.js',
        stderr: 'Test suite failed',
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith('Formatted test errors');
    });

    it('should display progress message', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project test suite...');
    });

    it('should display success message on success', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ All tests passed!');
    });

    it('should handle context with different project root', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: '{"name": "test-project", "scripts": {"test": "jest"}}',
            stderr: '',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext({
        projectRoot: '/different/project/path',
      });

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith('cat', ['package.json'], {
        cwd: '/different/project/path',
      });
      expect(mockExecCommand).toHaveBeenCalledWith('npm test', [], {
        cwd: '/different/project/path',
        timeout: 55000,
      });
    });

    it('should handle malformed package.json', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 0,
            stdout: 'invalid json',
            stderr: '',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      // Should not call test command when package.json doesn't contain "test"
      expect(mockExecCommand).not.toHaveBeenCalledWith('npm test', [], expect.any(Object));
    });

    it('should handle case where package.json file does not exist', async () => {
      mockExecCommand.mockImplementation((command, args) => {
        if (command === 'cat' && args?.[0] === 'package.json') {
          return Promise.resolve({
            exitCode: 1,
            stdout: '',
            stderr: 'No such file or directory',
          });
        }
        return Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
      });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      // Should not call test command when package.json can't be read
      expect(mockExecCommand).not.toHaveBeenCalledWith('npm test', [], expect.any(Object));
    });
  });

  describe('hook name', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('test-project');
    });
  });

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const config = { testCommand: 'custom test command', timeout: 60000 };
      const configuredHook = new TestProjectHook(config);

      expect((configuredHook as unknown as { config: unknown }).config).toEqual(config);
    });
  });
});
