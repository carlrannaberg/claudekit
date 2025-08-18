import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { CodebaseContextHook } from '../../cli/hooks/codebase-context.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as utils from '../../cli/hooks/utils.js';
import * as claudekitConfig from '../../cli/utils/claudekit-config.js';
import * as fs from 'node:fs/promises';

// Mock modules before imports
vi.mock('node:util', () => ({
  promisify: (fn: unknown): unknown => fn,
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('../../cli/hooks/utils.js');
vi.mock('../../cli/utils/claudekit-config.js');
vi.mock('node:fs/promises');
vi.mock('node:os', () => ({
  homedir: (): string => '/test/home',
}));

const TEST_PROJECT_ROOT = '/test/project';

function createMockContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    filePath: undefined,
    projectRoot: TEST_PROJECT_ROOT,
    payload: {
      hook_event_name: 'UserPromptSubmit',
      session_id: 'test-session-123',
      prompt: 'test prompt',
      ...overrides.payload
    },
    packageManager: 'npm' as unknown as HookContext['packageManager'],
    ...overrides
  };
}

describe('CodebaseContextHook', () => {
  let hook: CodebaseContextHook;
  let mockContext: HookContext;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let mockExecAsync: Mock;
  let mockCheckToolAvailable: Mock;
  let mockGetHookConfig: Mock;
  let mockFsAccess: Mock;
  let mockFsReadFile: Mock;
  let mockFsWriteFile: Mock;
  let mockFsMkdir: Mock;

  beforeEach(async () => {
    // Dynamically import to get mocked version
    const cp = await import('node:child_process');
    mockExecAsync = cp.exec as unknown as Mock;
    mockCheckToolAvailable = vi.mocked(utils.checkToolAvailable);
    mockGetHookConfig = vi.mocked(claudekitConfig.getHookConfig);
    mockFsAccess = vi.mocked(fs.access);
    mockFsReadFile = vi.mocked(fs.readFile);
    mockFsWriteFile = vi.mocked(fs.writeFile);
    mockFsMkdir = vi.mocked(fs.mkdir);

    hook = new CodebaseContextHook();
    mockContext = createMockContext();

    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock return values
    mockCheckToolAvailable.mockResolvedValue(true);
    mockGetHookConfig.mockReturnValue({});
    mockFsAccess.mockRejectedValue(new Error('File not found')); // Session file doesn't exist by default
    mockFsMkdir.mockResolvedValue(undefined);
    mockFsWriteFile.mockResolvedValue(undefined);
    mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should skip if codebase-map is not installed', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(false);

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should run scan and format commands on first prompt', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: '# Project Structure\ncli/index.ts > cli/utils', stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledTimes(2);
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map scan', expect.any(Object));
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map format --format auto', expect.any(Object));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('📍 Codebase Map (loaded once per session):'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('# Project Structure'));
    });

    it('should skip if context already provided for session', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      
      // Mock session file exists with context already provided
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockFsReadFile.mockResolvedValueOnce(JSON.stringify({
        contextProvided: true,
        timestamp: '2024-01-01T00:00:00.000Z',
        sessionId: 'test-session-123'
      }));

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should create session tracking file after providing context', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'test output', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockFsWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('session-test-session-123.json'),
        expect.stringContaining('"contextProvided": true')
      );
    });

    it('should use custom format from config', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({ format: 'json' });
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '{"files": []}', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map format --format json', expect.any(Object));
    });

    it('should use custom command from config', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({ 
        command: 'custom-codebase-map scan --verbose'
      });
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'output', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('custom-codebase-map scan --verbose', expect.any(Object));
    });

    it('should handle empty output gracefully', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(mockFsWriteFile).not.toHaveBeenCalled(); // Should not create session file for empty output
    });

    it('should handle whitespace-only output gracefully', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: '   \n  \t  ', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(mockFsWriteFile).not.toHaveBeenCalled();
    });

    it('should handle scan command failure gracefully', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync.mockRejectedValueOnce(new Error('Command failed'));

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0); // Should not block user prompt
      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled(); // Silent failure by default
    });

    it('should log error in debug mode', async () => {
      process.env['DEBUG'] = 'true';
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync.mockRejectedValueOnce(new Error('Command failed'));

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to generate codebase map:', expect.any(Error));
      
      delete process.env['DEBUG'];
    });

    it('should output context message when valid output is provided', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'test codebase output', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockFsWriteFile).toHaveBeenCalled();
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('📍 Codebase Map (loaded once per session):')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('test codebase output')
      );
    });

    it('should handle missing session_id gracefully', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'output', stderr: '' });
      
      const contextWithoutSessionId = createMockContext({
        payload: { hook_event_name: 'UserPromptSubmit', prompt: 'test' }
      });

      const result = await hook.execute(contextWithoutSessionId);

      expect(result.exitCode).toBe(0);
      expect(mockFsWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('session-unknown.json'),
        expect.any(String)
      );
    });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(CodebaseContextHook.metadata).toEqual({
        id: 'codebase-context',
        displayName: 'Codebase Context Provider',
        description: 'Adds codebase map to context on first user prompt of each session',
        category: 'utility',
        triggerEvent: 'UserPromptSubmit',
        matcher: '*',
        dependencies: []
      });
    });
  });
});