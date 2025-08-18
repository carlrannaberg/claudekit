import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranscriptParser } from '../../cli/utils/transcript-parser.js';
import * as fs from 'fs';
import * as os from 'os';

vi.mock('fs');
vi.mock('os');

describe('TranscriptParser', () => {
  const mockHomedir = vi.mocked(os.homedir);
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
    mockHomedir.mockReturnValue('/home/user');
  });

  describe('exists', () => {
    it('should return true when transcript file exists', () => {
      mockExistsSync.mockReturnValue(true);
      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.exists()).toBe(true);
    });

    it('should return false when transcript file does not exist', () => {
      mockExistsSync.mockReturnValue(false);
      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.exists()).toBe(false);
    });

    it('should expand tilde in path', () => {
      mockExistsSync.mockReturnValue(true);
      const parser = new TranscriptParser('~/transcript.jsonl');
      parser.exists();
      expect(mockExistsSync).toHaveBeenCalledWith('/home/user/transcript.jsonl');
    });
  });

  describe('getRecentMessages', () => {
    it('should return entries from last N messages', () => {
      const mockTranscript = [
        JSON.stringify({ type: 'user', message: { content: 'First' } }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Second' }],
          },
        }),
        JSON.stringify({ type: 'system', content: 'System msg' }),
        JSON.stringify({ type: 'user', message: { content: 'Third' } }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Fourth' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const recent = parser.getRecentMessages(2);

      // Should get last 2 UI messages (both assistant messages) plus user entries between
      // UI Message 1: 'Second' assistant
      // UI Message 2: 'Fourth' assistant
      // Plus user and system entries between them
      expect(recent).toHaveLength(4); // Second assistant + system + user + Fourth assistant
      expect(recent[0]).toMatchObject({ type: 'assistant' }); // Second
      expect(recent[1]).toMatchObject({ type: 'system' });
      expect(recent[2]).toMatchObject({ type: 'user' }); // Third
      expect(recent[3]).toMatchObject({ type: 'assistant' }); // Fourth
    });

    it('should group assistant messages with text and following tools', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'user',
          uuid: 'user-1',
          message: { content: 'User message' },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'assistant-1',
          parentUuid: 'user-1',
          message: {
            content: [{ type: 'text', text: 'First assistant' }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'assistant-2',
          parentUuid: 'assistant-1',
          message: {
            content: [{ type: 'tool_use', name: 'Bash' }],
          },
        }),
        JSON.stringify({
          type: 'user',
          uuid: 'user-2',
          message: { content: 'Another user' },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'assistant-3',
          parentUuid: 'user-2',
          message: {
            content: [{ type: 'text', text: 'Final assistant' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const recent = parser.getRecentMessages(2);

      // Should get:
      // UI Message 1: assistant-1 (text) + assistant-2 (tool)
      // UI Message 2: assistant-3 (text)
      // Plus user entries between
      expect(recent).toHaveLength(4); // assistant-1 + assistant-2 + user-2 + assistant-3
      expect(recent[0]).toMatchObject({ type: 'assistant', uuid: 'assistant-1' });
      expect(recent[1]).toMatchObject({ type: 'assistant', uuid: 'assistant-2' });
      expect(recent[2]).toMatchObject({ type: 'user', uuid: 'user-2' });
      expect(recent[3]).toMatchObject({ type: 'assistant', uuid: 'assistant-3' });
    });

    it('should treat grouped assistant messages as single UI message', () => {
      const mockTranscript = [
        JSON.stringify({ type: 'user', uuid: 'u1' }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a1',
          parentUuid: 'u1',
          message: { content: [{ type: 'text', text: 'First' }] },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a2',
          parentUuid: 'a1',
          message: { content: [{ type: 'tool_use', name: 'Bash' }] },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a3',
          parentUuid: 'a2',
          message: { content: [{ type: 'tool_use', name: 'Edit' }] },
        }),
        JSON.stringify({ type: 'user', uuid: 'u2' }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'a4',
          parentUuid: 'u2',
          message: { content: [{ type: 'text', text: 'Second' }] },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const recent = parser.getRecentMessages(2);

      // Should get all entries from last 2 UI messages:
      // UI Message 1: a1 (text) + a2 (tool) + a3 (tool) - grouped as one UI message
      // UI Message 2: a4 (text)
      // Plus user entries between
      expect(recent).toHaveLength(5);
      expect(recent.map((e) => e.uuid)).toEqual(['a1', 'a2', 'a3', 'u2', 'a4']);
    });

    it('should handle assistant messages without content', () => {
      const mockTranscript = [
        JSON.stringify({ type: 'user', uuid: 'u1' }),
        JSON.stringify({ type: 'assistant', uuid: 'a1' }), // No content array
        JSON.stringify({ type: 'assistant', uuid: 'a2' }), // No content array
        JSON.stringify({ type: 'user', uuid: 'u2' }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const recent = parser.getRecentMessages(2);

      // Assistant messages without content are treated as tool-only messages (standalone UI messages)
      // So we get the last 2 UI messages: a1 and a2
      // Plus user entries between them
      expect(recent).toHaveLength(3); // a1 + a2 + u2
      expect(recent.map((e) => e.uuid)).toEqual(['a1', 'a2', 'u2']);
    });
  });

  describe('findToolUsesInRecentMessages', () => {
    it('should find tool uses in assistant messages', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          timestamp: '2024-01-01T00:00:00Z',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'test.ts' } }],
          },
        }),
        JSON.stringify({
          type: 'user',
          message: { content: [{ type: 'text', text: 'User message' }] },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const toolUses = parser.findToolUsesInRecentMessages(5);

      expect(toolUses).toHaveLength(1);
      expect(toolUses[0]).toMatchObject({
        name: 'Edit',
        input: { file_path: 'test.ts' },
        timestamp: '2024-01-01T00:00:00Z',
      });
    });

    it('should filter by tool names when specified', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'test.ts' } },
              { type: 'tool_use', name: 'Bash', input: { command: 'ls' } },
            ],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const toolUses = parser.findToolUsesInRecentMessages(5, ['Edit']);

      expect(toolUses).toHaveLength(1);
      expect(toolUses[0]?.name).toBe('Edit');
    });
  });

  describe('findLatestTodoState', () => {
    it('should find the most recent todo state', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'user',
          toolUseResult: {
            newTodos: [{ content: 'Old task', status: 'completed', id: '1' }],
          },
        }),
        JSON.stringify({ type: 'assistant', message: {} }),
        JSON.stringify({
          type: 'user',
          toolUseResult: {
            newTodos: [{ content: 'New task', status: 'pending', id: '2' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const todos = parser.findLatestTodoState();

      expect(todos).toHaveLength(1);
      expect(todos?.[0]).toMatchObject({
        content: 'New task',
        status: 'pending',
        id: '2',
      });
    });

    it('should return null when no todos found', () => {
      const mockTranscript = [
        JSON.stringify({ type: 'assistant', message: {} }),
        JSON.stringify({ type: 'user', message: {} }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      const todos = parser.findLatestTodoState();

      expect(todos).toBeNull();
    });
  });

  describe('findLastMessageWithMarker', () => {
    it('should find the last message with marker', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'text', text: 'Some message' }],
          },
        }),
        JSON.stringify({
          type: 'user',
          toolUseResult: {
            decision: 'block',
            reason: '📋 **Self-Review**\n\nReview message',
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'text', text: 'Response' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.findLastMessageWithMarker('📋 **Self-Review**')).toBe(1);
    });

    it('should return -1 when marker not found', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'text', text: 'Some message' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.findLastMessageWithMarker('📋 **Self-Review**')).toBe(-1);
    });
  });

  describe('hasFileChangesSinceMarker', () => {
    it('should detect code changes after marker', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'text', text: '📋 **Self-Review**' }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.ts' } }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.hasFileChangesSinceMarker('📋 **Self-Review**')).toBe(true);
    });

    it('should return false when no changes since marker', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.ts' } }],
          },
        }),
        JSON.stringify({
          type: 'user',
          message: {
            content: [{ type: 'text', text: '📋 **Self-Review**' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.hasFileChangesSinceMarker('📋 **Self-Review**')).toBe(false);
    });
  });

  describe('hasRecentFileChanges', () => {
    it('should detect code file changes', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.ts' } }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.hasRecentFileChanges(5)).toBe(true);
    });

    it('should ignore documentation files', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'README.md' } }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.hasRecentFileChanges(5)).toBe(false);
    });

    it('should ignore non-code editing tools', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Read', input: { file_path: 'src/index.ts' } }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser.hasRecentFileChanges(5)).toBe(false);
    });

    it('should respect custom glob patterns', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'src/components/Button.tsx' } },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'src/utils/helper.ts' } },
            ],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');

      // Should match only tsx files
      expect(parser.hasRecentFileChanges(5, ['**/*.tsx'])).toBe(true);

      // Should not match when only looking for .md files
      expect(parser.hasRecentFileChanges(5, ['**/*.md'])).toBe(false);

      // Should match with multiple patterns
      expect(parser.hasRecentFileChanges(5, ['**/*.ts', '**/*.tsx'])).toBe(true);
    });

    it('should handle negative glob patterns', () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.test.ts' } },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [{ type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.ts' } }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');

      // Should exclude test files
      const patterns = ['**/*.ts', '!**/*.test.ts'];
      expect(parser.hasRecentFileChanges(5, patterns)).toBe(true); // index.ts matches

      // Should not match if only test file changed
      const testOnlyTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.test.ts' } },
            ],
          },
        }),
      ].join('\n');

      mockReadFileSync.mockReturnValue(testOnlyTranscript);
      // Create a new parser instance since the old one cached the entries
      const parser2 = new TranscriptParser('/tmp/transcript.jsonl');
      expect(parser2.hasRecentFileChanges(5, patterns)).toBe(false);
    });
  });
});
