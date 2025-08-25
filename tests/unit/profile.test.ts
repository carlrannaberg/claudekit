import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';

// Mock the runner module
vi.mock('../../cli/hooks/runner.js', () => ({
  runHook: vi.fn(),
}));

// Mock fs module
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

// Import after mocks
import { profileHooks } from '../../cli/hooks/profile.js';
import { runHook } from '../../cli/hooks/runner.js';

describe('Profile Module', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('profileHooks', () => {
    describe('single iteration execution (default behavior)', () => {
      it('should profile a specific hook with single iteration', async () => {
        const mockOutput = 'TypeScript compilation completed successfully';
        vi.mocked(runHook).mockResolvedValue({ stdout: mockOutput });

        await profileHooks('typecheck-changed');

        expect(runHook).toHaveBeenCalledTimes(1);
        expect(runHook).toHaveBeenCalledWith('typecheck-changed');
        
        // Check that console output includes the hook name
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('typecheck-changed')
        );
      });

      it('should count characters accurately', async () => {
        const mockOutput = 'A'.repeat(500); // 500 characters
        vi.mocked(runHook).mockResolvedValue({ stdout: mockOutput });

        await profileHooks('test-hook');

        // Should display character count
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('500')
        );
      });

      it('should estimate tokens correctly (4 chars H 1 token)', async () => {
        const mockOutput = 'A'.repeat(400); // 400 characters = 100 tokens
        vi.mocked(runHook).mockResolvedValue({ stdout: mockOutput });

        await profileHooks('test-hook');

        // Should display token estimate (400/4 = 100)
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('100')
        );
      });
    });

    describe('multiple iteration execution with averaging', () => {
      it('should run multiple iterations and average results', async () => {
        const outputs = ['Output 1', 'Output 2 longer', 'Output 3'];
        let callCount = 0;
        
        vi.mocked(runHook).mockImplementation(async (): Promise<{ stdout: string }> => {
          const output = outputs[callCount % outputs.length] ?? 'Default output';
          callCount++;
          return { stdout: output };
        });

        await profileHooks('test-hook', { iterations: 3 });

        expect(runHook).toHaveBeenCalledTimes(3);
        expect(runHook).toHaveBeenCalledWith('test-hook');
        
        // Should show results
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('test-hook')
        );
      });

      it('should fail when hook execution throws error', async () => {
        let callCount = 0;
        vi.mocked(runHook).mockImplementation(async (): Promise<{ stdout: string }> => {
          callCount++;
          if (callCount === 2) {
            throw new Error('Hook failed');
          }
          return { stdout: 'Success output' };
        });

        // Current implementation doesn't handle errors, so it should throw
        await expect(profileHooks('test-hook', { iterations: 3 })).rejects.toThrow('Hook failed');

        expect(runHook).toHaveBeenCalledTimes(2); // Should stop at the failing call
      });
    });

    describe('hook discovery from settings.json', () => {
      it('should load hooks from .claude/settings.json when no hook specified', async () => {
        const mockSettings = {
          hooks: {
            PostToolUse: [
              {
                hooks: [
                  { command: 'claudekit-hooks run typecheck-changed' },
                  { command: 'claudekit-hooks run lint-changed' }
                ]
              }
            ],
            Stop: [
              {
                hooks: [
                  { command: 'claudekit-hooks run check-todos' }
                ]
              }
            ]
          }
        };

        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));
        vi.mocked(runHook).mockResolvedValue({ stdout: 'Hook output' });

        await profileHooks();

        expect(fs.readFile).toHaveBeenCalledWith('.claude/settings.json', 'utf-8');
        
        // Should run all configured hooks
        expect(runHook).toHaveBeenCalledWith('typecheck-changed');
        expect(runHook).toHaveBeenCalledWith('lint-changed');
        expect(runHook).toHaveBeenCalledWith('check-todos');
        expect(runHook).toHaveBeenCalledTimes(3);
      });

      it('should display message when no hooks are configured', async () => {
        const mockSettings = { hooks: {} };

        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(runHook).not.toHaveBeenCalled();
      });

      it('should handle missing settings.json file gracefully', async () => {
        vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: no such file'));

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(runHook).not.toHaveBeenCalled();
      });
    });

    describe('warning thresholds', () => {
      it('should warn about hooks with 9000+ characters (near limit)', async () => {
        const mockOutput = 'A'.repeat(9500); // 9500 characters
        vi.mocked(runHook).mockResolvedValue({ stdout: mockOutput });

        await profileHooks('large-output-hook');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Performance Issues')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Near UserPromptSubmit limit')
        );
      });

      it('should warn about hooks with 10000+ characters (over limit)', async () => {
        const mockOutput = 'A'.repeat(12000); // 12000 characters
        vi.mocked(runHook).mockResolvedValue({ stdout: mockOutput });

        await profileHooks('oversized-hook');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Performance Issues')
        );
        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('Exceeds UserPromptSubmit limit')
        );
      });

      it('should not show warnings for hooks within normal limits', async () => {
        const mockOutput = 'A'.repeat(5000); // 5000 characters (normal)
        vi.mocked(runHook).mockResolvedValue({ stdout: mockOutput });

        await profileHooks('normal-hook');

        expect(consoleLogSpy).not.toHaveBeenCalledWith(
          expect.stringContaining('Performance Issues')
        );
      });
    });

    describe('graceful error handling', () => {
      it('should propagate hook execution errors', async () => {
        vi.mocked(runHook).mockRejectedValue(new Error('Hook execution failed'));

        // Current implementation doesn't catch errors, so it should throw
        await expect(profileHooks('failing-hook')).rejects.toThrow('Hook execution failed');

        expect(runHook).toHaveBeenCalledWith('failing-hook');
      });

      it('should handle malformed settings.json gracefully', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('invalid json content');

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(runHook).not.toHaveBeenCalled();
      });
    });
  });
});