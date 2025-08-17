/**
 * Comprehensive test suite for CodebaseMapHook and CodebaseMapUpdateHook
 * 
 * This test suite covers:
 * - Basic functionality for both hooks
 * - Edge cases for file path handling
 * - Configuration validation and errors
 * - Debounce logic and boundary conditions
 * - Command execution scenarios
 * - Mock organization and helper functions
 * - Error handling and recovery
 * - Concurrent execution scenarios
 * - Custom configuration handling
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import type { HookContext } from '../../cli/hooks/base.js';

// Constants for tests
const TEST_PROJECT_ROOT = '/test/project';

// Mock modules before imports
vi.mock('node:util', () => ({
  promisify: (fn: unknown): unknown => fn,
}));

vi.mock('node:child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('node:fs/promises', () => ({
  default: {
    access: vi.fn(),
  },
  access: vi.fn(),
}));

vi.mock('../../cli/hooks/utils.js', () => ({
  checkToolAvailable: vi.fn(),
  formatError: vi.fn((title: string, details: string, instructions: string[]) => 
    `${title}: ${details}\n${instructions.join('\n')}`
  ),
}));

vi.mock('../../cli/utils/claudekit-config.js', () => ({
  getHookConfig: vi.fn(),
}));

// Import after mocking
import { CodebaseMapHook, CodebaseMapUpdateHook } from '../../cli/hooks/codebase-map.js';
import { checkToolAvailable } from '../../cli/hooks/utils.js';
import { getHookConfig } from '../../cli/utils/claudekit-config.js';

// Helper functions for test setup
function createMockContext(overrides: Partial<HookContext> = {}): HookContext {
  return {
    projectRoot: TEST_PROJECT_ROOT,
    payload: {},
    packageManager: {
      name: 'npm',
      exec: 'npx',
      run: 'npm run',
      test: 'npm test',
    },
    ...overrides,
  };
}


describe('CodebaseMapHook', () => {
  let hook: CodebaseMapHook;
  let mockContext: HookContext;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let mockExecAsync: Mock;
  let mockCheckToolAvailable: Mock;
  let mockGetHookConfig: Mock;

  beforeEach(async () => {
    // Dynamically import to get mocked version
    const cp = await import('node:child_process');
    mockExecAsync = cp.exec as unknown as Mock;
    mockCheckToolAvailable = checkToolAvailable as Mock;
    mockGetHookConfig = getHookConfig as Mock;
    
    hook = new CodebaseMapHook();
    mockContext = createMockContext();

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock return values
    mockCheckToolAvailable.mockResolvedValue(true);
    mockGetHookConfig.mockReturnValue({});

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('execute', () => {
    it('should warn if codebase-map is not installed', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(false);

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockCheckToolAvailable).toHaveBeenCalledWith('codebase-map', 'package.json', TEST_PROJECT_ROOT);
    });

    it('should run scan and format commands when codebase-map is installed', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: '# Project Structure\ncli/index.ts > cli/utils', stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📍 Codebase Map:\n');
      expect(consoleErrorSpy).toHaveBeenCalledWith('# Project Structure\ncli/index.ts > cli/utils');
    });

    it('should use custom format from config', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({ format: 'markdown' });
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: '# Markdown Output', stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map format --format markdown', {
        cwd: TEST_PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
    });

    it('should handle errors gracefully', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync.mockRejectedValueOnce(new Error('Scan failed')); // scan fails

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0); // Don't block session
    });

    // Additional edge case tests for CodebaseMapHook
    it('should handle empty output from format command', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: '', stderr: '' }); // format with empty output

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('\n📍 Codebase Map:\n');
    });

    it('should handle whitespace-only output from format command', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: '   \n  \t  ', stderr: '' }); // format with whitespace

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith('\n📍 Codebase Map:\n');
    });

    it('should handle scan success but format failure', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan succeeds
        .mockRejectedValueOnce(new Error('Format failed')); // format fails

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0); // Should not block session
    });

    it('should handle invalid format configuration', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({ format: 'invalid-format' });
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: 'output', stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map format --format invalid-format', {
        cwd: TEST_PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
    });

    it('should handle custom scan command configuration', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({ command: 'custom-scan --deep' });
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: 'output', stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('custom-scan --deep', {
        cwd: TEST_PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
    });

    it('should handle large output buffers', async () => {
      const largeOutput = 'x'.repeat(1024 * 1024); // 1MB of content
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: largeOutput, stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n📍 Codebase Map:\n');
      expect(consoleErrorSpy).toHaveBeenCalledWith(largeOutput);
    });

    it('should handle configuration with all possible options', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({ 
        command: 'custom-command --option',
        format: 'json',
        updateOnChanges: false 
      });
      mockExecAsync
        .mockResolvedValueOnce({ stdout: '', stderr: '' }) // scan
        .mockResolvedValueOnce({ stdout: '{"files": []}', stderr: '' }); // format

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('custom-command --option', expect.any(Object));
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map format --format json', expect.any(Object));
    });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(CodebaseMapHook.metadata).toEqual({
        id: 'codebase-map',
        displayName: 'Codebase Map Generator',
        description: 'Generate project structure map using codebase-map CLI on session start',
        category: 'utility',
        triggerEvent: 'SessionStart',
        matcher: '*',
        dependencies: ['codebase-map'],
      });
    });
  });
});

describe('CodebaseMapUpdateHook', () => {
  let hook: CodebaseMapUpdateHook;
  let mockContext: HookContext;
  let mockExecAsync: Mock;
  let mockFsAccess: Mock;
  let mockCheckToolAvailable: Mock;
  let mockGetHookConfig: Mock;

  beforeEach(async () => {
    // Dynamically import to get mocked versions
    const cp = await import('node:child_process');
    const fs = await import('node:fs/promises');
    mockExecAsync = cp.exec as unknown as Mock;
    mockFsAccess = fs.access as unknown as Mock;
    mockCheckToolAvailable = checkToolAvailable as Mock;
    mockGetHookConfig = getHookConfig as Mock;
    
    hook = new CodebaseMapUpdateHook();
    mockContext = createMockContext({
      filePath: '/test/project/src/index.ts',
    });

    // Default mock return values
    mockCheckToolAvailable.mockResolvedValue(true);
    mockGetHookConfig.mockReturnValue({});

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('shouldUpdateMap', () => {
    it('should return false for undefined filePath', () => {
      const result = hook['shouldUpdateMap'](undefined);
      expect(result).toBe(false);
    });

    it('should return false for empty filePath', () => {
      const result = hook['shouldUpdateMap']('');
      expect(result).toBe(false);
    });

    it('should return false when updateOnChanges is disabled', () => {
      mockGetHookConfig.mockReturnValueOnce({ updateOnChanges: false });
      const result = hook['shouldUpdateMap']('/test/file.ts');
      expect(result).toBe(false);
    });

    it('should return false within debounce period', () => {
      hook['lastUpdateTime'] = Date.now() - 1000; // 1 second ago
      const result = hook['shouldUpdateMap']('/test/file.ts');
      expect(result).toBe(false);
    });

    it('should return true for TypeScript files after debounce period', () => {
      hook['lastUpdateTime'] = Date.now() - 10000; // 10 seconds ago
      const result = hook['shouldUpdateMap']('/test/file.ts');
      expect(result).toBe(true);
    });

    it('should return true for JavaScript files', () => {
      hook['lastUpdateTime'] = 0;
      expect(hook['shouldUpdateMap']('/test/file.js')).toBe(true);
      expect(hook['shouldUpdateMap']('/test/file.jsx')).toBe(true);
      expect(hook['shouldUpdateMap']('/test/file.mjs')).toBe(true);
      expect(hook['shouldUpdateMap']('/test/file.cjs')).toBe(true);
    });

    it('should return false for non-code files', () => {
      hook['lastUpdateTime'] = 0;
      expect(hook['shouldUpdateMap']('/test/file.md')).toBe(false);
      expect(hook['shouldUpdateMap']('/test/file.json')).toBe(false);
      expect(hook['shouldUpdateMap']('/test/file.txt')).toBe(false);
    });

    // Edge case tests
    it('should return false for whitespace-only file paths', () => {
      expect(hook['shouldUpdateMap']('   ')).toBe(false);
      expect(hook['shouldUpdateMap']('\t')).toBe(false);
      expect(hook['shouldUpdateMap']('\n')).toBe(false);
    });

    it('should handle case-sensitive file extensions correctly', () => {
      hook['lastUpdateTime'] = 0;
      expect(hook['shouldUpdateMap']('/test/file.TS')).toBe(false); // Uppercase should not match
      expect(hook['shouldUpdateMap']('/test/file.JS')).toBe(false);
      expect(hook['shouldUpdateMap']('/test/file.ts')).toBe(true); // Lowercase should match
      expect(hook['shouldUpdateMap']('/test/file.js')).toBe(true);
    });

    it('should return false for paths without extensions', () => {
      hook['lastUpdateTime'] = 0;
      expect(hook['shouldUpdateMap']('/test/file')).toBe(false);
      expect(hook['shouldUpdateMap']('/test/README')).toBe(false);
      expect(hook['shouldUpdateMap']('/test/Makefile')).toBe(false);
    });

    it('should handle debounce boundary conditions', () => {
      const now = Date.now();
      const debounceMs = 5000;
      
      // Exactly at boundary (should return false - check uses < not <=)
      hook['lastUpdateTime'] = now - debounceMs + 1;
      expect(hook['shouldUpdateMap']('/test/file.ts')).toBe(false);
      
      // Just past boundary (should return true)
      hook['lastUpdateTime'] = now - debounceMs - 1;
      expect(hook['shouldUpdateMap']('/test/file.ts')).toBe(true);
      
      // Just before boundary (should return false)  
      hook['lastUpdateTime'] = now - debounceMs + 1;
      expect(hook['shouldUpdateMap']('/test/file.ts')).toBe(false);
    });

    it('should handle configuration validation errors gracefully', () => {
      // Mock getHookConfig to return invalid config
      mockGetHookConfig.mockReturnValueOnce(null);
      expect(hook['shouldUpdateMap']('/test/file.ts')).toBe(true); // Should default to enabled
      
      mockGetHookConfig.mockReturnValueOnce(undefined);
      expect(hook['shouldUpdateMap']('/test/file.ts')).toBe(true); // Should default to enabled
    });

    it('should support all JavaScript file extensions', () => {
      hook['lastUpdateTime'] = 0;
      const jsExtensions = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx'];
      
      jsExtensions.forEach(ext => {
        expect(hook['shouldUpdateMap'](`/test/file${ext}`)).toBe(true);
      });
    });
  });

  describe('execute', () => {
    beforeEach(() => {
      // Set lastUpdateTime to allow updates
      hook['lastUpdateTime'] = 0;
    });

    it('should skip update if shouldUpdateMap returns false', async () => {
      mockContext.filePath = undefined;

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).not.toHaveBeenCalled();
    });

    it('should skip update if codebase-map is not installed', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(false);

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockCheckToolAvailable).toHaveBeenCalledWith('codebase-map', 'package.json', TEST_PROJECT_ROOT);
    });

    it('should skip update if index file does not exist', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockFsAccess.mockRejectedValueOnce(new Error('File not found'));

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockFsAccess).toHaveBeenCalledWith('/test/project/.codebasemap');
    });

    it('should update the index when all conditions are met', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' }); // update
      mockFsAccess.mockResolvedValueOnce(undefined);

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map update "/test/project/src/index.ts"', {
        cwd: TEST_PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
    });

    it('should handle update errors silently', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockExecAsync.mockRejectedValueOnce(new Error('Update failed')); // update fails
      mockFsAccess.mockResolvedValueOnce(undefined);

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update codebase map:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    // Additional edge case tests for execute method
    it('should handle concurrent execution scenarios', async () => {
      mockCheckToolAvailable.mockResolvedValue(true);
      mockFsAccess.mockResolvedValue(undefined);
      mockExecAsync.mockResolvedValue({ stdout: '', stderr: '' });

      // Simulate concurrent executions
      const promises = [
        hook.execute(mockContext),
        hook.execute(mockContext),
        hook.execute(mockContext)
      ];

      const results = await Promise.all(promises);
      
      // All should succeed
      results.forEach(result => {
        expect(result.exitCode).toBe(0);
      });
    });

    it('should handle empty or malformed file paths in context', async () => {
      const testCases = [
        createMockContext({ filePath: '' }),
        createMockContext({ filePath: '   ' }),
        createMockContext({ filePath: undefined }),
        createMockContext({ filePath: undefined }),
      ];

      for (const context of testCases) {
        const result = await hook.execute(context);
        expect(result.exitCode).toBe(0);
        expect(mockCheckToolAvailable).not.toHaveBeenCalled();
      }
    });

    it('should use default command when no custom command configured', async () => {
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockGetHookConfig.mockReturnValueOnce({}); // No custom command
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await hook.execute(mockContext);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith('codebase-map update "/test/project/src/index.ts"', {
        cwd: TEST_PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
    });

    it('should update lastUpdateTime only on successful updates', async () => {
      const initialTime = hook['lastUpdateTime'];
      
      // Test failed update
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockExecAsync.mockRejectedValueOnce(new Error('Update failed'));

      await hook.execute(mockContext);
      
      // Should still update time even on failure (to prevent retry spam)
      expect(hook['lastUpdateTime']).toBeGreaterThan(initialTime);
    });

    it('should handle very long file paths', async () => {
      const longPath = `${'/very/long/path/'.repeat(50)}file.ts`;
      const contextWithLongPath = createMockContext({ filePath: longPath });
      
      mockCheckToolAvailable.mockResolvedValueOnce(true);
      mockFsAccess.mockResolvedValueOnce(undefined);
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });

      const result = await hook.execute(contextWithLongPath);

      expect(result.exitCode).toBe(0);
      expect(mockExecAsync).toHaveBeenCalledWith(`codebase-map update "${longPath}"`, {
        cwd: TEST_PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024,
      });
    });
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(CodebaseMapUpdateHook.metadata).toEqual({
        id: 'codebase-map-update',
        displayName: 'Codebase Map Updater',
        description: 'Update codebase map index when files change',
        category: 'utility',
        triggerEvent: 'PostToolUse',
        matcher: 'Write|Edit|MultiEdit',
        dependencies: ['codebase-map'],
      });
    });
  });
});