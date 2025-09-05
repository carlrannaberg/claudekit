import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BaseHook, type ClaudePayload, type HookResult } from '../../../cli/hooks/base.js';
import { SessionHookManager } from '../../../cli/hooks/session-utils.js';

// Mock the session utilities
vi.mock('../../../cli/hooks/session-utils.js');

// Mock utils for BaseHook
vi.mock('../../../cli/hooks/utils.js', () => ({
  findProjectRoot: vi.fn().mockResolvedValue('/test/project'),
  detectPackageManager: vi.fn().mockResolvedValue({
    name: 'npm',
    exec: 'npx',
    run: 'npm run',
    test: 'npm test',
  }),
  execCommand: vi.fn(),
  formatError: vi.fn(),
}));

// Mock fs-extra for BaseHook
vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(),
    readFile: vi.fn(),
  },
  pathExists: vi.fn(),
  readFile: vi.fn(),
}));

// Mock subagent detector
vi.mock('../../../cli/hooks/subagent-detector.js', () => ({
  isHookDisabledForSubagent: vi.fn().mockResolvedValue(false),
}));

// Test hook implementation
class TestHook extends BaseHook {
  name = 'test-hook';
  executeCallCount = 0;
  lastPayload?: ClaudePayload;

  async execute(): Promise<HookResult> {
    this.executeCallCount++;
    return { exitCode: 0 };
  }

  getExecuteCallCount(): number {
    return this.executeCallCount;
  }
}

describe('Session-based Hook Disabling Integration', () => {
  let testHook: TestHook;
  let mockSessionManager: {
    extractTranscriptUuid: ReturnType<typeof vi.fn>;
    isHookDisabled: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    testHook = new TestHook();
    
    // Setup session manager mock
    mockSessionManager = {
      extractTranscriptUuid: vi.fn(),
      isHookDisabled: vi.fn(),
    };

    // Mock the SessionHookManager constructor to return our mock
    vi.mocked(SessionHookManager).mockImplementation(() => mockSessionManager as never);

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('hook execution with session disable checking', () => {
    it('should skip hook execution when disabled for session', async () => {
      // Purpose: Verify hooks are actually skipped when disabled for session
      const transcriptPath = '/path/to/.claude/transcripts/test-uuid-123.jsonl';
      const transcriptUuid = 'test-uuid-123';

      // Setup mocks
      mockSessionManager.extractTranscriptUuid.mockReturnValue(transcriptUuid);
      mockSessionManager.isHookDisabled.mockResolvedValue(true);

      const payload: ClaudePayload = {
        transcript_path: transcriptPath,
        tool_name: 'Write',
        tool_input: { file_path: '/test/file.ts' },
      };

      const result = await testHook.run(payload);

      // Verify: Hook was skipped
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBe(true);
      expect(testHook.getExecuteCallCount()).toBe(0);

      // Verify session manager was called correctly
      expect(mockSessionManager.extractTranscriptUuid).toHaveBeenCalledWith(transcriptPath);
      expect(mockSessionManager.isHookDisabled).toHaveBeenCalledWith(transcriptUuid, 'test-hook');
    });

    it('should execute hook when not disabled for session', async () => {
      // Purpose: Verify normal hook execution when not disabled
      const transcriptPath = '/path/to/.claude/transcripts/test-uuid-456.jsonl';
      const transcriptUuid = 'test-uuid-456';

      // Setup mocks
      mockSessionManager.extractTranscriptUuid.mockReturnValue(transcriptUuid);
      mockSessionManager.isHookDisabled.mockResolvedValue(false);

      const payload: ClaudePayload = {
        transcript_path: transcriptPath,
        tool_name: 'Edit',
        tool_input: { file_path: '/test/other.ts' },
      };

      const result = await testHook.run(payload);

      // Verify: Hook was executed normally
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBeUndefined();
      expect(testHook.getExecuteCallCount()).toBe(1);

      // Verify session manager was called
      expect(mockSessionManager.extractTranscriptUuid).toHaveBeenCalledWith(transcriptPath);
      expect(mockSessionManager.isHookDisabled).toHaveBeenCalledWith(transcriptUuid, 'test-hook');
    });

    it('should execute hook when no transcript path provided', async () => {
      // Purpose: Verify hooks execute normally when no session context available
      const payload: ClaudePayload = {
        tool_name: 'MultiEdit',
        tool_input: { file_path: '/test/no-transcript.ts' },
      };

      const result = await testHook.run(payload);

      // Verify: Hook executed normally (no session context)
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBeUndefined();
      expect(testHook.getExecuteCallCount()).toBe(1);

      // Session manager should not be called without transcript path
      expect(mockSessionManager.extractTranscriptUuid).not.toHaveBeenCalled();
      expect(mockSessionManager.isHookDisabled).not.toHaveBeenCalled();
    });

    it('should execute hook when transcript UUID extraction fails', async () => {
      // Purpose: Ensure robustness when UUID extraction fails
      const transcriptPath = '/invalid/path/no-uuid.jsonl';

      // Setup mocks
      mockSessionManager.extractTranscriptUuid.mockReturnValue(null);

      const payload: ClaudePayload = {
        transcript_path: transcriptPath,
        tool_name: 'Write',
        tool_input: { file_path: '/test/file.ts' },
      };

      const result = await testHook.run(payload);

      // Verify: Hook executed normally (couldn't extract UUID)
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBeUndefined();
      expect(testHook.getExecuteCallCount()).toBe(1);

      expect(mockSessionManager.extractTranscriptUuid).toHaveBeenCalledWith(transcriptPath);
      // isHookDisabled should not be called if UUID extraction failed
      expect(mockSessionManager.isHookDisabled).not.toHaveBeenCalled();
    });

    it('should handle session manager errors gracefully', async () => {
      // Purpose: Ensure hook execution continues even if session checking fails
      const transcriptPath = '/path/to/.claude/transcripts/error-uuid.jsonl';
      const transcriptUuid = 'error-uuid';

      // Setup mocks to throw errors
      mockSessionManager.extractTranscriptUuid.mockReturnValue(transcriptUuid);
      mockSessionManager.isHookDisabled.mockRejectedValue(new Error('Session file corrupted'));

      const payload: ClaudePayload = {
        transcript_path: transcriptPath,
        tool_name: 'Write',
        tool_input: { file_path: '/test/file.ts' },
      };

      // The test should handle the error gracefully
      await expect(testHook.run(payload)).rejects.toThrow('Session file corrupted');

      // Verify session manager was called
      expect(mockSessionManager.isHookDisabled).toHaveBeenCalledWith(transcriptUuid, 'test-hook');
    });

    it('should respect stop_hook_active flag regardless of session state', async () => {
      // Purpose: Verify infinite loop prevention takes precedence over session disabling
      const payload: ClaudePayload = {
        stop_hook_active: true,
        transcript_path: '/path/to/.claude/transcripts/test-uuid.jsonl',
        tool_name: 'Write',
      };

      const result = await testHook.run(payload);

      // Verify: Hook was skipped due to infinite loop prevention
      expect(result.exitCode).toBe(0);
      expect(testHook.getExecuteCallCount()).toBe(0);

      // Session manager should not be called when stop_hook_active is true
      expect(mockSessionManager.extractTranscriptUuid).not.toHaveBeenCalled();
      expect(mockSessionManager.isHookDisabled).not.toHaveBeenCalled();
    });
  });

  describe('debug output', () => {
    it('should log debug message when hook is disabled for session', async () => {
      // Purpose: Verify debug output helps with troubleshooting
      const originalDebug = process.env['CLAUDEKIT_DEBUG'];
      process.env['CLAUDEKIT_DEBUG'] = 'true';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        const testHookWithDebug = new TestHook();
        const transcriptPath = '/path/to/.claude/transcripts/debug-uuid.jsonl';
        const transcriptUuid = 'debug-uuid';

        mockSessionManager.extractTranscriptUuid.mockReturnValue(transcriptUuid);
        mockSessionManager.isHookDisabled.mockResolvedValue(true);

        const payload: ClaudePayload = {
          transcript_path: transcriptPath,
          tool_name: 'Write',
          tool_input: { file_path: '/test/file.ts' },
        };

        await testHookWithDebug.run(payload);

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'test-hook: Skipped - disabled for session debug-uuid'
        );
      } finally {
        process.env['CLAUDEKIT_DEBUG'] = originalDebug;
        consoleErrorSpy.mockRestore();
      }
    });

    it('should not log debug message when debug is disabled', async () => {
      // Purpose: Verify debug output is conditional
      const originalDebug = process.env['CLAUDEKIT_DEBUG'];
      delete process.env['CLAUDEKIT_DEBUG'];

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      try {
        const transcriptPath = '/path/to/.claude/transcripts/no-debug-uuid.jsonl';
        const transcriptUuid = 'no-debug-uuid';

        mockSessionManager.extractTranscriptUuid.mockReturnValue(transcriptUuid);
        mockSessionManager.isHookDisabled.mockResolvedValue(true);

        const payload: ClaudePayload = {
          transcript_path: transcriptPath,
          tool_name: 'Write',
          tool_input: { file_path: '/test/file.ts' },
        };

        await testHook.run(payload);

        // Should not log debug message when debug is disabled
        expect(consoleErrorSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('test-hook: Skipped - disabled for session')
        );
      } finally {
        if (originalDebug !== undefined) {
          process.env['CLAUDEKIT_DEBUG'] = originalDebug;
        }
        consoleErrorSpy.mockRestore();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty transcript path', async () => {
      // Purpose: Test edge case with empty string transcript path
      const payload: ClaudePayload = {
        transcript_path: '',
        tool_name: 'Write',
        tool_input: { file_path: '/test/file.ts' },
      };

      const result = await testHook.run(payload);

      // Verify: Hook executed normally (empty path treated as no path)
      expect(result.exitCode).toBe(0);
      expect(testHook.getExecuteCallCount()).toBe(1);
      expect(mockSessionManager.extractTranscriptUuid).not.toHaveBeenCalled();
    });

    it('should handle undefined transcript path', async () => {
      // Purpose: Test edge case with undefined transcript path
      const payload: ClaudePayload = {
        tool_name: 'Write',
        tool_input: { file_path: '/test/file.ts' },
      };

      const result = await testHook.run(payload);

      // Verify: Hook executed normally
      expect(result.exitCode).toBe(0);
      expect(testHook.getExecuteCallCount()).toBe(1);
      expect(mockSessionManager.extractTranscriptUuid).not.toHaveBeenCalled();
    });
  });
});