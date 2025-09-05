import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { SessionTracker, SessionHookManager, type SessionHookState } from '../../../cli/hooks/session-utils.js';

// Mock fs and os modules
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn(),
  access: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn(),
  unlink: vi.fn(),
  rm: vi.fn(),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn(),
}));

const mockFs = vi.mocked(fs);

describe('SessionTracker', () => {
  let tracker: SessionTracker;
  const mockHomeDir = '/mock/home';
  
  beforeEach(() => {
    // Setup os.homedir mock
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    
    tracker = new SessionTracker('test-hook');
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSessionData', () => {
    it('should return session data when file exists', async () => {
      // Purpose: Verify session state can be retrieved when file exists
      const sessionId = 'test-session';
      const sessionData = { 
        sessionId, 
        timestamp: '2024-01-01T00:00:00.000Z', 
        customData: 'test' 
      };

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(sessionData));

      const result = await tracker.getSessionData(sessionId);
      
      expect(result).toEqual(sessionData);
      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit', 'test-hook-session-test-session.json')
      );
      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit', 'test-hook-session-test-session.json'),
        'utf-8'
      );
    });

    it('should return null when session file does not exist', async () => {
      // Purpose: Ensure graceful handling when session doesn't exist
      const sessionId = 'nonexistent-session';
      
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const result = await tracker.getSessionData(sessionId);
      
      expect(result).toBeNull();
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should return null when file is corrupted', async () => {
      // Purpose: Handle corrupted JSON files gracefully
      const sessionId = 'corrupted-session';
      
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue('invalid json {');

      const result = await tracker.getSessionData(sessionId);
      
      expect(result).toBeNull();
    });
  });

  describe('setSessionData', () => {
    it('should create directory and write session data', async () => {
      // Purpose: Verify session data can be stored with proper file structure
      const sessionId = 'new-session';
      const data = { customField: 'value' };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await tracker.setSessionData(sessionId, data);

      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit'),
        { recursive: true }
      );
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit', 'test-hook-session-new-session.json'),
        expect.stringContaining('"customField": "value"')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit', 'test-hook-session-new-session.json'),
        expect.stringMatching(/"timestamp": "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit', 'test-hook-session-new-session.json'),
        expect.stringContaining('"sessionId": "new-session"')
      );
    });

    it('should preserve existing data when updating', async () => {
      // Purpose: Ensure partial updates don't lose existing session data
      const sessionId = 'existing-session';
      const existingData = { 
        sessionId,
        timestamp: '2024-01-01T00:00:00.000Z',
        existingField: 'keep-this'
      };
      const updateData = { newField: 'add-this' };

      // Mock getting existing data
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingData));
      mockFs.writeFile.mockResolvedValue(undefined);

      await tracker.setSessionData(sessionId, updateData);

      // Should write merged data with updated timestamp
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall?.[1] as string);
      
      expect(writtenData).toMatchObject({
        ...updateData,
        sessionId,
        timestamp: expect.any(String),
      });
      expect(writtenData.timestamp).not.toBe(existingData.timestamp);
    });
  });

  describe('hasSessionFlag and setSessionFlag', () => {
    it('should set and retrieve boolean flags', async () => {
      // Purpose: Verify flag-based session state management works correctly
      const sessionId = 'flag-session';
      
      // Mock empty initial state
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      // Set flag
      await tracker.setSessionFlag(sessionId, 'testFlag', true);
      
      // Mock reading back the flag
      const flagData = {
        sessionId,
        timestamp: '2024-01-01T00:00:00.000Z',
        testFlag: true,
      };
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(flagData));

      const hasFlag = await tracker.hasSessionFlag(sessionId, 'testFlag');
      
      expect(hasFlag).toBe(true);
    });

    it('should return false for unset flags', async () => {
      // Purpose: Ensure undefined flags are handled as false
      const sessionId = 'empty-session';
      
      mockFs.access.mockRejectedValue(new Error('File not found'));

      const hasFlag = await tracker.hasSessionFlag(sessionId, 'undefinedFlag');
      
      expect(hasFlag).toBe(false);
    });

    it('should allow setting flag to false', async () => {
      // Purpose: Verify flags can be explicitly disabled
      const sessionId = 'false-flag-session';
      
      mockFs.access.mockRejectedValue(new Error('File not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);

      await tracker.setSessionFlag(sessionId, 'disabledFlag', false);
      
      // Mock reading back the flag
      const flagData = {
        sessionId,
        timestamp: '2024-01-01T00:00:00.000Z',
        disabledFlag: false,
      };
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(flagData));

      const hasFlag = await tracker.hasSessionFlag(sessionId, 'disabledFlag');
      
      expect(hasFlag).toBe(false);
    });
  });

  describe('cleanOldSessions', () => {
    it('should remove old session files based on age', async () => {
      // Purpose: Verify cleanup of expired session files works correctly
      const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      const recentTime = Date.now() - 2 * 24 * 60 * 60 * 1000; // 2 days ago
      
      const mockFiles = [
        'test-hook-session-old.json',
        'test-hook-session-recent.json',
        'other-file.txt', // Should be ignored
      ];
      
      // Type assertion to bypass TypeScript overload complexity for testing
      // @ts-expect-error - Complex fs.readdir overloads make typing difficult in tests
      mockFs.readdir.mockResolvedValue(mockFiles);
      
      // Create proper Stats objects with all required properties
      interface MockStats {
        isFile(): boolean;
        isDirectory(): boolean;
        isBlockDevice(): boolean;
        isCharacterDevice(): boolean;
        isSymbolicLink(): boolean;
        isFIFO(): boolean;
        isSocket(): boolean;
        dev: number;
        ino: number;
        mode: number;
        nlink: number;
        uid: number;
        gid: number;
        rdev: number;
        size: number;
        blksize: number;
        blocks: number;
        atimeMs: number;
        mtimeMs: number;
        ctimeMs: number;
        birthtimeMs: number;
        atime: Date;
        mtime: Date;
        ctime: Date;
        birthtime: Date;
      }
      
      const createMockStats = (mtimeMs: number): MockStats => ({
        isFile: (): boolean => true,
        isDirectory: (): boolean => false,
        isBlockDevice: (): boolean => false,
        isCharacterDevice: (): boolean => false,
        isSymbolicLink: (): boolean => false,
        isFIFO: (): boolean => false,
        isSocket: (): boolean => false,
        dev: 0,
        ino: 0,
        mode: 0,
        nlink: 0,
        uid: 0,
        gid: 0,
        rdev: 0,
        size: 0,
        blksize: 0,
        blocks: 0,
        atimeMs: mtimeMs,
        mtimeMs,
        ctimeMs: mtimeMs,
        birthtimeMs: mtimeMs,
        atime: new Date(mtimeMs),
        mtime: new Date(mtimeMs),
        ctime: new Date(mtimeMs),
        birthtime: new Date(mtimeMs),
      });
      
      mockFs.stat
        .mockResolvedValueOnce(createMockStats(oldTime))
        .mockResolvedValueOnce(createMockStats(recentTime))
        .mockResolvedValueOnce(createMockStats(oldTime)); // This won't be reached
      mockFs.unlink.mockResolvedValue(undefined);

      await tracker.cleanOldSessions(7 * 24 * 60 * 60 * 1000); // 7 days

      expect(mockFs.readdir).toHaveBeenCalledWith(path.join(mockHomeDir, '.claudekit'));
      expect(mockFs.stat).toHaveBeenCalledTimes(2); // Only for matching files
      expect(mockFs.unlink).toHaveBeenCalledTimes(1);
      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(mockHomeDir, '.claudekit', 'test-hook-session-old.json')
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      // Purpose: Ensure cleanup doesn't fail catastrophically on errors
      mockFs.readdir.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(tracker.cleanOldSessions()).resolves.not.toThrow();
    });
  });
});

describe('SessionHookManager', () => {
  let manager: SessionHookManager;
  const mockHomeDir = '/mock/home';
  const mockSessionsDir = path.join(mockHomeDir, '.claudekit', 'sessions');
  const validUuid = '12345678-1234-1234-1234-123456789abc';
  
  beforeEach(() => {
    vi.mocked(os.homedir).mockReturnValue(mockHomeDir);
    vi.spyOn(process, 'cwd').mockReturnValue('/mock/cwd');
    
    manager = new SessionHookManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('UUID validation', () => {
    it('should accept valid UUID format', async () => {
      // Purpose: Verify proper UUID validation accepts correct formats
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await expect(manager.disableHook(validUuid, 'test-hook')).resolves.not.toThrow();
      
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(`${validUuid}.json.tmp`),
        expect.any(String)
      );
    });

    it('should reject invalid UUID format', async () => {
      // Purpose: Ensure invalid UUIDs are properly rejected
      const invalidUuid = 'not-a-uuid';

      await expect(manager.disableHook(invalidUuid, 'test-hook')).rejects.toThrow(
        'Invalid transcript UUID format: not-a-uuid'
      );
    });

    it('should reject short UUIDs', async () => {
      // Purpose: Verify UUID length validation
      const shortUuid = '12345678-1234-1234-1234';

      await expect(manager.disableHook(shortUuid, 'test-hook')).rejects.toThrow(
        'Invalid transcript UUID format'
      );
    });
  });

  describe('disableHook', () => {
    it('should create session state for new transcript UUID', async () => {
      // Purpose: Verify session state management works correctly with proper isolation
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('File not found')); // New session
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await manager.disableHook(validUuid, 'test-hook');

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockSessionsDir, { recursive: true });
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockSessionsDir, `${validUuid}.json.tmp`),
        expect.stringContaining(`"transcriptId": "${validUuid}"`)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockSessionsDir, `${validUuid}.json.tmp`),
        expect.stringContaining('"disabledHooks": [\n    "test-hook"\n  ]')
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockSessionsDir, `${validUuid}.json.tmp`),
        expect.stringMatching(/"timestamp": "\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z"/)
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(mockSessionsDir, `${validUuid}.json.tmp`),
        expect.stringContaining('"workingDirectory": "/mock/cwd"')
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        path.join(mockSessionsDir, `${validUuid}.json.tmp`),
        path.join(mockSessionsDir, `${validUuid}.json`)
      );
    });

    it('should handle multiple hooks in same session', async () => {
      // Purpose: Ensure multiple hooks can be disabled/enabled independently
      const existingState: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['hook1'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/mock/cwd',
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingState));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await manager.disableHook(validUuid, 'hook2');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenState = JSON.parse(writeCall?.[1] as string);
      
      expect(writtenState.disabledHooks).toEqual(['hook1', 'hook2']);
      expect(writtenState.timestamp).not.toBe(existingState.timestamp);
    });

    it('should not duplicate hooks in disabled list', async () => {
      // Purpose: Prevent duplicate entries when disabling already-disabled hook
      const existingState: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['test-hook'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/mock/cwd',
      };

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingState));

      await manager.disableHook(validUuid, 'test-hook');

      // Should not call writeFile since hook is already disabled
      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockFs.rename).not.toHaveBeenCalled();
    });

    it('should use atomic write operations', async () => {
      // Purpose: Verify atomic writes prevent corruption during concurrent access
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await manager.disableHook(validUuid, 'test-hook');

      // Verify write to temp file then rename
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.any(String)
      );
      expect(mockFs.rename).toHaveBeenCalledWith(
        expect.stringContaining('.tmp'),
        expect.not.stringContaining('.tmp')
      );
    });
  });

  describe('enableHook', () => {
    it('should remove hook from disabled list', async () => {
      // Purpose: Verify hooks can be re-enabled and removed from disabled list
      const existingState: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['hook1', 'hook2'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/mock/cwd',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingState));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await manager.enableHook(validUuid, 'hook1');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenState = JSON.parse(writeCall?.[1] as string);
      
      expect(writtenState.disabledHooks).toEqual(['hook2']);
      expect(writtenState.timestamp).not.toBe(existingState.timestamp);
    });

    it('should handle enabling non-disabled hook gracefully', async () => {
      // Purpose: Validate edge case where hook is enabled but not currently disabled
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      await expect(manager.enableHook(validUuid, 'hook1')).resolves.not.toThrow();
      
      expect(mockFs.writeFile).not.toHaveBeenCalled();
      expect(mockFs.rename).not.toHaveBeenCalled();
    });

    it('should handle corrupted session file gracefully', async () => {
      // Purpose: Ensure corrupted session files don't crash the enable process
      mockFs.readFile.mockResolvedValue('invalid json {');

      await expect(manager.enableHook(validUuid, 'hook1')).resolves.not.toThrow();
      
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle missing hook from disabled list gracefully', async () => {
      // Purpose: Verify enabling already-enabled hook doesn't cause issues
      const existingState: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['other-hook'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/mock/cwd',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingState));

      await manager.enableHook(validUuid, 'missing-hook');

      // Should not write anything since hook wasn't in disabled list
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('isHookDisabled', () => {
    it('should return true for disabled hook', async () => {
      // Purpose: Verify disabled hook detection works correctly
      const state: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['disabled-hook', 'another-hook'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/mock/cwd',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(state));

      const result = await manager.isHookDisabled(validUuid, 'disabled-hook');
      
      expect(result).toBe(true);
    });

    it('should return false for enabled hook', async () => {
      // Purpose: Verify enabled hook detection works correctly
      const state: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['other-hook'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/mock/cwd',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(state));

      const result = await manager.isHookDisabled(validUuid, 'enabled-hook');
      
      expect(result).toBe(false);
    });

    it('should return false when session file does not exist', async () => {
      // Purpose: Ensure non-existent sessions default to enabled hooks
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await manager.isHookDisabled(validUuid, 'any-hook');
      
      expect(result).toBe(false);
    });

    it('should return false when session file is corrupted', async () => {
      // Purpose: Handle corrupted session files gracefully
      mockFs.readFile.mockResolvedValue('invalid json {');

      const result = await manager.isHookDisabled(validUuid, 'any-hook');
      
      expect(result).toBe(false);
    });
  });

  describe('getSessionState', () => {
    it('should return session state when file exists', async () => {
      // Purpose: Verify complete session state retrieval
      const state: SessionHookState = {
        transcriptId: validUuid,
        disabledHooks: ['hook1', 'hook2'],
        timestamp: '2024-01-01T00:00:00.000Z',
        workingDirectory: '/test/working/dir',
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(state));

      const result = await manager.getSessionState(validUuid);
      
      expect(result).toEqual(state);
    });

    it('should return null when session file does not exist', async () => {
      // Purpose: Handle missing session files gracefully
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const result = await manager.getSessionState(validUuid);
      
      expect(result).toBeNull();
    });

    it('should return null when session file is corrupted', async () => {
      // Purpose: Handle corrupted session files gracefully
      mockFs.readFile.mockResolvedValue('invalid json {');

      const result = await manager.getSessionState(validUuid);
      
      expect(result).toBeNull();
    });
  });

  describe('extractTranscriptUuid', () => {
    it('should extract UUID from .jsonl transcript path', () => {
      // Purpose: Verify UUID extraction from Claude Code transcript paths
      const transcriptPath = `/path/to/.claude/transcripts/${validUuid}.jsonl`;
      
      const result = manager.extractTranscriptUuid(transcriptPath);
      
      expect(result).toBe(validUuid);
    });

    it('should extract UUID from .json transcript path', () => {
      // Purpose: Support alternative file extensions
      const transcriptPath = `/path/to/.claude/transcripts/${validUuid}.json`;
      
      const result = manager.extractTranscriptUuid(transcriptPath);
      
      expect(result).toBe(validUuid);
    });

    it('should handle paths with no extension', () => {
      // Purpose: Handle edge case paths without extensions
      const transcriptPath = `/path/to/.claude/transcripts/${validUuid}`;
      
      const result = manager.extractTranscriptUuid(transcriptPath);
      
      expect(result).toBeNull();
    });

    it('should return null for invalid paths', () => {
      // Purpose: Handle invalid transcript paths gracefully
      const invalidPaths = [
        '/no/uuid/in/path.jsonl',
        'not-a-path',
        '',
        '/path/with/invalid-uuid-format.jsonl',
      ];

      for (const invalidPath of invalidPaths) {
        const result = manager.extractTranscriptUuid(invalidPath);
        expect(result).toBeNull();
      }
    });

    it('should extract UUID case-insensitively', () => {
      // Purpose: Handle case variations in UUID
      const upperCaseUuid = validUuid.toUpperCase();
      const transcriptPath = `/path/to/.claude/transcripts/${upperCaseUuid}.jsonl`;
      
      const result = manager.extractTranscriptUuid(transcriptPath);
      
      expect(result).toBe(upperCaseUuid);
    });
  });
});