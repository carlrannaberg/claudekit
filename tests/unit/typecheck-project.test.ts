import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TypecheckProjectHook } from '../../cli/hooks/typecheck-project.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as utils from '../../cli/hooks/utils.js';

describe('TypecheckProjectHook', () => {
  let hook: TypecheckProjectHook;
  let mockCheckToolAvailable: ReturnType<typeof vi.fn>;
  let mockExecCommand: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    hook = new TypecheckProjectHook();
    mockCheckToolAvailable = vi.fn();
    mockExecCommand = vi.fn();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock the utils functions
    vi.spyOn(utils, 'checkToolAvailable').mockImplementation(mockCheckToolAvailable);
    vi.spyOn(utils, 'formatTypeScriptErrors').mockReturnValue('Formatted TypeScript errors');
    
    // Mock the execCommand method on the hook instance
    vi.spyOn(hook as any, 'execCommand').mockImplementation(mockExecCommand);
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
    it('should skip when TypeScript not available', async () => {
      mockCheckToolAvailable.mockResolvedValue(false);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(0);
      expect(mockCheckToolAvailable).toHaveBeenCalledWith('tsc', 'tsconfig.json', '/test/project');
      expect(mockExecCommand).not.toHaveBeenCalled();
    });

    it('should run tsc --noEmit on project with npm', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith(
        'npx tsc --noEmit',
        [],
        { cwd: '/test/project' }
      );
      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide TypeScript validation...');
      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ TypeScript validation passed!');
    });

    it('should run tsc --noEmit on project with pnpm', async () => {
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
        'pnpm dlx tsc --noEmit',
        [],
        { cwd: '/test/project' }
      );
    });

    it('should run tsc --noEmit on project with yarn', async () => {
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
        'yarn dlx tsc --noEmit',
        [],
        { cwd: '/test/project' }
      );
    });

    it('should respect custom typescriptCommand', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      (hook as any).config = { typescriptCommand: 'pnpm tsc --noEmit --strict' };
      const context = createMockContext();

      await hook.execute(context);

      expect(mockExecCommand).toHaveBeenCalledWith(
        'pnpm tsc --noEmit --strict',
        [],
        { cwd: '/test/project' }
      );
    });

    it('should format errors on failure', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      const mockResult = { 
        exitCode: 1, 
        stdout: 'error TS2322: Type string not assignable to number',
        stderr: '' 
      };
      mockExecCommand.mockResolvedValue(mockResult);
      const context = createMockContext();

      const result = await hook.execute(context);

      expect(result.exitCode).toBe(2);
      expect(utils.formatTypeScriptErrors).toHaveBeenCalledWith(mockResult);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Formatted TypeScript errors');
    });

    it('should display progress message', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('Running project-wide TypeScript validation...');
    });

    it('should display success message on success', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext();

      await hook.execute(context);

      expect(consoleErrorSpy).toHaveBeenCalledWith('✅ TypeScript validation passed!');
    });

    it('should handle context with different project root', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockExecCommand.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
      const context = createMockContext({
        projectRoot: '/different/project/path',
      });

      await hook.execute(context);

      expect(mockCheckToolAvailable).toHaveBeenCalledWith('tsc', 'tsconfig.json', '/different/project/path');
      expect(mockExecCommand).toHaveBeenCalledWith(
        'npx tsc --noEmit',
        [],
        { cwd: '/different/project/path' }
      );
    });
  });

  describe('hook name', () => {
    it('should have correct name', () => {
      expect(hook.name).toBe('typecheck-project');
    });
  });

  describe('configuration', () => {
    it('should accept custom configuration', () => {
      const config = { typescriptCommand: 'custom tsc command', timeout: 60000 };
      const configuredHook = new TypecheckProjectHook(config);

      expect((configuredHook as unknown as { config: unknown }).config).toEqual(config);
    });
  });
});