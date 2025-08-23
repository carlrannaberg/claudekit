import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TranscriptParser } from '../../cli/utils/transcript-parser.js';
import * as fs from 'node:fs';
import * as os from 'node:os';

vi.mock('fs');
vi.mock('os');

describe('TranscriptParser - Real-world message grouping', () => {
  const mockHomedir = vi.mocked(os.homedir);
  const mockExistsSync = vi.mocked(fs.existsSync);
  const mockReadFileSync = vi.mocked(fs.readFileSync);

  beforeEach(() => {
    vi.clearAllMocks();
    mockHomedir.mockReturnValue('/home/user');
  });

  describe('getRecentMessages with real Claude Code transcript', () => {
    it('should correctly group messages as they appear in Claude Code UI', () => {
      // This is real data from a Claude Code session where the user saw:
      // Message 1: Edit to test file
      // Message 2: "Now let's run the tests again" + Bash
      // Message 3: "Great! Now let's run the full test suite" + Bash
      // Message 4: "Excellent! Let's also verify" + Bash
      // Message 5: TodoWrite
      // Message 6: "Code Review Summary"

      const mockTranscript = [
        // Message 1: Edit to test file
        JSON.stringify({
          type: 'assistant',
          uuid: 'fb978f48-f7b7-4a9c-8c5e-0780fd2bf372',
          parentUuid: 'd3ab750f-b008-460c-af91-929eb599b680',
          message: {
            content: [
              {
                type: 'tool_use',
                name: 'Edit',
                input: { file_path: '/tests/unit/transcript-parser.test.ts' },
              },
            ],
          },
        }),
        JSON.stringify({ type: 'user', uuid: '34b4f482', parentUuid: 'fb978f48' }),

        // Message 2: Text + Bash in following entry
        JSON.stringify({
          type: 'assistant',
          uuid: '675725d7',
          parentUuid: 'ca08ab0d',
          message: {
            content: [{ type: 'text', text: "Now let's run the tests again:" }],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: '0ea44fae',
          parentUuid: '675725d7',
          message: {
            content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }],
          },
        }),
        JSON.stringify({ type: 'user', uuid: '5aa41a32', parentUuid: '0ea44fae' }),

        // Message 3: Text + Bash in following entry
        JSON.stringify({
          type: 'assistant',
          uuid: '0fe1f005',
          parentUuid: '5aa41a32',
          message: {
            content: [
              {
                type: 'text',
                text: "Great! Now let's run the full test suite to ensure everything still works:",
              },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: 'd4a35892',
          parentUuid: '0fe1f005',
          message: {
            content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }],
          },
        }),
        JSON.stringify({ type: 'user', uuid: '1a14fdab', parentUuid: 'd4a35892' }),

        // Message 4: Text + Bash in following entry
        JSON.stringify({
          type: 'assistant',
          uuid: 'b7098d17',
          parentUuid: '1a14fdab',
          message: {
            content: [
              {
                type: 'text',
                text: "Excellent! Let's also verify the self-review tests still pass:",
              },
            ],
          },
        }),
        JSON.stringify({
          type: 'assistant',
          uuid: '1ba5be0e',
          parentUuid: 'b7098d17',
          message: {
            content: [{ type: 'tool_use', name: 'Bash', input: { command: 'npm test' } }],
          },
        }),
        JSON.stringify({ type: 'user', uuid: '1c673790', parentUuid: '1ba5be0e' }),

        // Message 5: TodoWrite
        JSON.stringify({
          type: 'assistant',
          uuid: 'd04b8a22',
          parentUuid: '1c673790',
          message: {
            content: [{ type: 'tool_use', name: 'TodoWrite', input: { todos: [] } }],
          },
        }),
        JSON.stringify({ type: 'user', uuid: '661086fd', parentUuid: 'd04b8a22' }),

        // Message 6: Code Review Summary
        JSON.stringify({
          type: 'assistant',
          uuid: '9f0f484b',
          parentUuid: '661086fd',
          message: {
            content: [{ type: 'text', text: '## Code Review Summary\n\n### ✅ **Tests Added**' }],
          },
        }),
      ].join('\n');

      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(mockTranscript);

      const parser = new TranscriptParser('/tmp/transcript.jsonl');

      // User expects to see 5 messages back from "Code Review Summary"
      // 1. Code Review Summary
      // 2. TodoWrite
      // 3. "Excellent! Let's also verify" + Bash
      // 4. "Great! Now let's run" + Bash
      // 5. "Now let's run the tests" + Bash
      // (The Edit is message 6, not included)

      const recent = parser.getRecentMessages(5);

      // Verify we got the right entries
      // With 5 UI messages, we should get:
      // 1. "Now let's run the tests again" (675725d7) + Bash (0ea44fae)
      // 2. "Great! Now let's run" (0fe1f005) + Bash (d4a35892)
      // 3. "Excellent! Let's also verify" (b7098d17) + Bash (1ba5be0e)
      // 4. TodoWrite (d04b8a22)
      // 5. "Code Review Summary" (9f0f484b)
      // Plus user entries between them

      // Should have 12 total entries (5 assistant groups + intervening users)
      expect(recent.length).toBe(12);

      // The first assistant should be from "Now let's run the tests again"
      const firstAssistant = recent.find((e) => e.type === 'assistant');
      expect(firstAssistant?.uuid).toBe('675725d7');

      // The last assistant should be "Code Review Summary"
      const lastAssistant = recent.filter((e) => e.type === 'assistant').pop();
      expect(lastAssistant?.uuid).toBe('9f0f484b');
    });
  });
});
