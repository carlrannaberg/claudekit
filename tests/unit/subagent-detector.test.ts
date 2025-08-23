import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs-extra';
import { glob } from 'glob';
import {
  detectSubagentFromTranscript,
  loadSubagentMetadata,
  isHookDisabledForSubagent,
} from '../../cli/hooks/subagent-detector.js';

// Mock the modules
vi.mock('fs-extra');
vi.mock('glob');

describe('SubagentDetector', () => {
  // Get the mocked functions
  const mockPathExists = vi.mocked(fs.pathExists);
  const mockReadFile = vi.mocked(fs.readFile);
  const mockGlob = vi.mocked(glob);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('detectSubagentFromTranscript', () => {
    it('should detect subagent from Task tool invocation', async () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Task',
                input: { subagent_type: 'code-search' },
              },
            ],
          },
        }),
      ].join('\n');

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockTranscript);

      const result = await detectSubagentFromTranscript('/tmp/transcript.jsonl');
      expect(result).toBe('code-search');
    });

    it('should return null when no Task invocation found', async () => {
      const mockTranscript = JSON.stringify({
        type: 'user',
        message: { content: 'Hello' },
      });

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockTranscript);

      const result = await detectSubagentFromTranscript('/tmp/transcript.jsonl');
      expect(result).toBe(null);
    });

    it('should handle undefined transcript path', async () => {
      const result = await detectSubagentFromTranscript(undefined);
      expect(result).toBe(null);
    });

    it('should handle empty transcript path', async () => {
      const result = await detectSubagentFromTranscript('');
      expect(result).toBe(null);
    });

    it('should handle non-existent transcript file', async () => {
      mockPathExists.mockResolvedValue(false);

      const result = await detectSubagentFromTranscript('/tmp/nonexistent.jsonl');
      expect(result).toBe(null);
    });

    it('should handle malformed JSON lines', async () => {
      const mockTranscript = [
        'invalid json',
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Task',
                input: { subagent_type: 'code-search' },
              },
            ],
          },
        }),
      ].join('\n');

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockTranscript);

      const result = await detectSubagentFromTranscript('/tmp/transcript.jsonl');
      expect(result).toBe('code-search');
    });

    it('should find the most recent Task invocation', async () => {
      const mockTranscript = [
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Task',
                input: { subagent_type: 'old-agent' },
              },
            ],
          },
        }),
        JSON.stringify({ type: 'user', message: { content: 'Some text' } }),
        JSON.stringify({
          type: 'assistant',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Task',
                input: { subagent_type: 'recent-agent' },
              },
            ],
          },
        }),
      ].join('\n');

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockTranscript);

      const result = await detectSubagentFromTranscript('/tmp/transcript.jsonl');
      expect(result).toBe('recent-agent');
    });
  });

  describe('loadSubagentMetadata', () => {
    it('should parse disableHooks from inline array format', async () => {
      const mockContent = `---
name: test-agent
disableHooks: ['self-review', 'check-todos']
---`;

      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/test-agent.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockContent);

      const result = await loadSubagentMetadata('test-agent');
      expect(result).toBeDefined();
      expect(result?.name).toBe('test-agent');
      expect(result?.disableHooks).toEqual(['self-review', 'check-todos']);
    });

    it('should parse disableHooks from YAML list format', async () => {
      const mockContent = `---
name: test-agent
disableHooks:
  - self-review
  - check-todos
---`;

      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/test-agent.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockContent);

      const result = await loadSubagentMetadata('test-agent');
      expect(result).toBeDefined();
      expect(result?.disableHooks).toEqual(['self-review', 'check-todos']);
    });

    it('should handle agent without disableHooks', async () => {
      const mockContent = `---
name: test-agent
category: tools
---`;

      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/test-agent.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockContent);

      const result = await loadSubagentMetadata('test-agent');
      expect(result).toBeDefined();
      expect(result?.disableHooks).toBeUndefined();
    });

    it('should return null when agent file not found', async () => {
      // @ts-expect-error - Mocking glob with empty array
      mockGlob.mockResolvedValue([]);

      const result = await loadSubagentMetadata('nonexistent-agent');
      expect(result).toBe(null);
    });

    it('should handle file read errors gracefully', async () => {
      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/test-agent.md']);
      mockReadFile.mockRejectedValue(new Error('Read error'));

      const result = await loadSubagentMetadata('test-agent');
      expect(result).toBe(null);
    });

    it('should handle empty disableHooks array', async () => {
      const mockContent = `---
name: test-agent
disableHooks: []
---`;

      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/test-agent.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockContent);

      const result = await loadSubagentMetadata('test-agent');
      expect(result).toBeDefined();
      expect(result?.disableHooks).toEqual([]);
    });
  });

  describe('isHookDisabledForSubagent', () => {
    it('should return true when hook is in disabled list', async () => {
      // Mock transcript detection
      const mockTranscript = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Task',
              input: { subagent_type: 'code-search' },
            },
          ],
        },
      });

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValueOnce(mockTranscript);

      // Mock agent metadata
      const mockAgentContent = `---
disableHooks: ['self-review', 'check-todos']
---`;
      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/code-search.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValueOnce(mockAgentContent);

      const result = await isHookDisabledForSubagent('self-review', '/tmp/transcript.jsonl');
      expect(result).toBe(true);
    });

    it('should return false when hook is not in disabled list', async () => {
      // Mock transcript detection
      const mockTranscript = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Task',
              input: { subagent_type: 'code-search' },
            },
          ],
        },
      });

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValueOnce(mockTranscript);

      // Mock agent metadata
      const mockAgentContent = `---
disableHooks: ['self-review']
---`;
      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/code-search.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValueOnce(mockAgentContent);

      const result = await isHookDisabledForSubagent('check-todos', '/tmp/transcript.jsonl');
      expect(result).toBe(false);
    });

    it('should return false when not in subagent context', async () => {
      const mockTranscript = JSON.stringify({
        type: 'user',
        message: { content: 'Hello' },
      });

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValue(mockTranscript);

      const result = await isHookDisabledForSubagent('self-review', '/tmp/transcript.jsonl');
      expect(result).toBe(false);
    });

    it('should return false when agent has no disabled hooks', async () => {
      // Mock transcript detection
      const mockTranscript = JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            {
              type: 'tool_use',
              name: 'Task',
              input: { subagent_type: 'code-search' },
            },
          ],
        },
      });

      mockPathExists.mockResolvedValue(true);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValueOnce(mockTranscript);

      // Mock agent metadata without disableHooks
      const mockAgentContent = `---
name: code-search
category: tools
---`;
      // @ts-expect-error - Mocking glob with string array return
      mockGlob.mockResolvedValue(['src/agents/code-search.md']);
      // @ts-expect-error - Mocking readFile with string return
      mockReadFile.mockResolvedValueOnce(mockAgentContent);

      const result = await isHookDisabledForSubagent('self-review', '/tmp/transcript.jsonl');
      expect(result).toBe(false);
    });

    it('should handle undefined transcript path', async () => {
      const result = await isHookDisabledForSubagent('self-review', undefined);
      expect(result).toBe(false);
    });
  });
});