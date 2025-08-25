import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';

// Mock child_process execSync
const mockExecSync = vi.fn();
vi.mock('node:child_process', () => ({
  execSync: mockExecSync,
}));

// Mock the dynamic import of child_process
vi.doMock('node:child_process', async () => ({
  execSync: mockExecSync,
}));

// Mock fs module
vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock Date.now for time measurement tests
const mockDateNow = vi.fn();

// Import after mocks
import { profileHooks } from '../../cli/hooks/profile.js';

describe('Profile Module', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalDateNow: () => number;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    originalDateNow = Date.now;
    // Properly mock Date.now without breaking Date constructor
    Date.now = mockDateNow;
    mockDateNow.mockReturnValue(1000); // Default value
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Date.now = originalDateNow;
  });

  describe('profileHooks', () => {
    describe('single iteration execution (default behavior)', () => {
      it('should profile a specific hook and display accurate measurements', async () => {
        const mockOutput = 'TypeScript compilation completed successfully';
        const startTime = 1000;
        const endTime = 1150; // 150ms execution time
        
        mockDateNow.mockReturnValueOnce(startTime).mockReturnValueOnce(endTime);
        mockExecSync.mockReturnValue(mockOutput);

        await profileHooks('typecheck-changed');

        expect(mockExecSync).toHaveBeenCalledTimes(1);
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run typecheck-changed'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        );
        
        // Verify actual measurements in output
        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        expect(outputString).toContain('typecheck-changed');
        expect(outputString).toContain('150ms'); // Actual time measurement
        expect(outputString).toContain('45'); // Character count (mockOutput.length = 45)
        expect(outputString).toContain('12'); // Token estimate (Math.ceil(45/4) = 12)
      });

      it('should calculate character counts precisely', async () => {
        const testCases = [
          { output: 'A'.repeat(100), expectedChars: 100, expectedTokens: 25 },
          { output: 'A'.repeat(500), expectedChars: 500, expectedTokens: 125 },
          { output: 'Hello, World!', expectedChars: 13, expectedTokens: 4 },
          { output: '', expectedChars: 0, expectedTokens: 0 }
        ];

        for (const testCase of testCases) {
          vi.clearAllMocks();
          mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
          mockExecSync.mockReturnValue(testCase.output);

          await profileHooks('test-hook');

          const allLogCalls = consoleLogSpy.mock.calls.flat();
          const outputString = allLogCalls.join(' ');
          
          expect(outputString).toContain(testCase.expectedChars.toLocaleString());
          expect(outputString).toContain(testCase.expectedTokens.toLocaleString());
        }
      });

      it('should measure execution time accurately', async () => {
        const timingTests = [
          { start: 1000, end: 1050, expectedTime: 50 },
          { start: 2000, end: 2500, expectedTime: 500 },
          { start: 3000, end: 8200, expectedTime: 5200 }
        ];

        for (const timing of timingTests) {
          vi.clearAllMocks();
          mockDateNow.mockReturnValueOnce(timing.start).mockReturnValueOnce(timing.end);
          mockExecSync.mockReturnValue('test output');

          await profileHooks('timing-test');

          const allLogCalls = consoleLogSpy.mock.calls.flat();
          const outputString = allLogCalls.join(' ');
          
          expect(outputString).toContain(`${timing.expectedTime}ms`);
        }
      });
    });

    describe('multiple iteration execution with averaging', () => {
      it('should run multiple iterations and calculate accurate averages', async () => {
        const outputs = ['Short', 'Medium length text', 'Very long output with many characters here'];
        const times = [[1000, 1100], [2000, 2200], [3000, 3050]]; // 100ms, 200ms, 50ms
        let callCount = 0;
        let timeCallCount = 0;
        
        // Set up Date.now mock to return proper timing pairs
        mockDateNow.mockImplementation(() => {
          const timeIndex = Math.floor(timeCallCount / 2);
          const isStart = timeCallCount % 2 === 0;
          timeCallCount++;
          
          if (timeIndex < times.length) {
            const timePair = times[timeIndex];
            if (timePair) {
              return isStart ? timePair[0] : timePair[1];
            }
          }
          return 1000; // fallback time
        });
        
        mockExecSync.mockImplementation(() => {
          const output = outputs[callCount] ?? 'Default';
          callCount++;
          return output;
        });

        await profileHooks('test-hook', { iterations: 3 });

        expect(mockExecSync).toHaveBeenCalledTimes(3);
        
        // Calculate expected averages
        const expectedAvgTime = (100 + 200 + 50) / 3; // 116.67ms
        const expectedAvgChars = (5 + 18 + 42) / 3; // 21.67 chars
        const expectedAvgTokens = (Math.ceil(5/4) + Math.ceil(18/4) + Math.ceil(42/4)) / 3; // (2 + 5 + 11) / 3 = 6 tokens
        
        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        // Verify averages are displayed (formatted with locale-specific separators)
        expect(outputString).toContain(`${Math.round(expectedAvgTime)}ms`);
        expect(outputString).toContain(Math.round(expectedAvgChars).toLocaleString());
        expect(outputString).toContain(Math.round(expectedAvgTokens).toString());
      });

      it('should handle partial failures and only average successful runs', async () => {
        let callCount = 0;
        
        mockExecSync.mockImplementation(() => {
          callCount++;
          if (callCount === 2) {
            // Throw error for second iteration
            throw new Error('Hook failed');
          }
          return 'Success output'; // 14 chars
        });

        // Mock timing separately for each call
        mockDateNow
          .mockReturnValueOnce(1000).mockReturnValueOnce(1100) // First successful run
          .mockReturnValueOnce(2000).mockReturnValueOnce(2100) // Second run (fails, but time still called)
          .mockReturnValueOnce(3000).mockReturnValueOnce(3100); // Third successful run

        // Should not throw, but handle error gracefully
        await profileHooks('test-hook', { iterations: 3 });

        expect(mockExecSync).toHaveBeenCalledTimes(3); // Should continue after failure
        
        // Should still display results from successful runs (2 out of 3)
        // The averages should be based only on successful runs
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test-hook'));
      });
    });

    describe('hook discovery from settings.json', () => {
      it('should correctly parse and execute hooks from .claude/settings.json', async () => {
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

        const hookOutputs = ['TypeScript check passed', 'Linting completed', 'TODOs found: 5'];
        let callCount = 0;
        
        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));
        mockExecSync.mockImplementation(() => {
          // Mock timing for each hook
          mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1200); // 200ms
          const output = hookOutputs[callCount] ?? 'Default output';
          callCount++;
          return output;
        });

        await profileHooks();

        expect(fs.readFile).toHaveBeenCalledWith('.claude/settings.json', 'utf-8');
        
        // Verify hook extraction and execution
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run typecheck-changed'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        );
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run lint-changed'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        );
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run check-todos'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        );
        expect(mockExecSync).toHaveBeenCalledTimes(3);
        
        // Verify results are displayed for each hook
        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        expect(outputString).toContain('typecheck-changed');
        expect(outputString).toContain('lint-changed');
        expect(outputString).toContain('check-todos');
        
        // Verify character counts for each output
        expect(outputString).toContain('23'); // 'TypeScript check passed'.length
        expect(outputString).toContain('17'); // 'Linting completed'.length
        expect(outputString).toContain('14'); // 'TODOs found: 5'.length
      });

      it('should handle command parsing edge cases correctly', async () => {
        const mockSettings = {
          hooks: {
            PostToolUse: [
              {
                hooks: [
                  { command: 'claudekit-hooks run hook-with-spaces' },
                  { command: 'custom-command' }, // Non-standard format
                  { command: '  claudekit-hooks  run  padded-hook  ' } // Extra spaces
                ]
              }
            ]
          }
        };

        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));
        mockExecSync.mockImplementation(() => {
          mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
          return 'test output';
        });

        await profileHooks();

        // Verify hook name extraction handles different formats
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run hook-with-spaces'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        );
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run custom-command'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        ); // Should use full command
        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run padded-hook'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        ); // Should trim spaces
        expect(mockExecSync).toHaveBeenCalledTimes(3);
      });

      it('should display appropriate message when no hooks are configured', async () => {
        const mockSettings = { hooks: {} };

        vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockSettings));

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(mockExecSync).not.toHaveBeenCalled();
      });

      it('should handle missing settings.json file gracefully', async () => {
        const mockError = new Error('ENOENT: no such file or directory') as Error & { code: string };
        mockError.code = 'ENOENT';
        vi.mocked(fs.readFile).mockRejectedValue(mockError);

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(mockExecSync).not.toHaveBeenCalled();
      });

      it('should handle malformed JSON gracefully', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('{ invalid json content }');

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(mockExecSync).not.toHaveBeenCalled();
      });
    });

    describe('warning thresholds', () => {
      it('should warn about hooks with 9000+ characters (near limit)', async () => {
        const mockOutput = 'A'.repeat(9500); // 9500 characters
        mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
        mockExecSync.mockReturnValue(mockOutput);

        // Use a hook name that actually triggers UserPromptSubmit limits
        await profileHooks('codebase-map');

        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        expect(outputString).toContain('Performance Issues');
        expect(outputString).toContain('Near UserPromptSubmit limit');
        expect(outputString).toContain('9500'); // Character count (no comma formatting)
      });

      it('should warn about hooks with 10000+ characters (over limit)', async () => {
        const mockOutput = 'A'.repeat(12000); // 12000 characters
        mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
        mockExecSync.mockReturnValue(mockOutput);

        // Use a hook name that actually triggers UserPromptSubmit limits
        await profileHooks('codebase-map');

        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        expect(outputString).toContain('Performance Issues');
        expect(outputString).toContain('Exceeds UserPromptSubmit limit');
        expect(outputString).toContain('12000'); // Character count without formatting
        expect(outputString).toContain('WILL BE TRUNCATED');
      });

      it('should not show warnings for hooks within normal limits', async () => {
        const mockOutput = 'A'.repeat(5000); // 5000 characters (normal)
        mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
        mockExecSync.mockReturnValue(mockOutput);

        await profileHooks('normal-hook');

        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        expect(outputString).not.toContain('Performance Issues');
        expect(outputString).toContain('5000'); // But still shows the count (no comma)
      });

      it('should test exact boundary conditions', async () => {
        const boundaryTests = [
          { chars: 8999, shouldWarn: false, description: 'just under near limit' },
          { chars: 9000, shouldWarn: false, description: 'at near limit threshold' },
          { chars: 9001, shouldWarn: true, description: 'just over near limit' },
          { chars: 9999, shouldWarn: true, description: 'just under over limit' },
          { chars: 10000, shouldWarn: true, description: 'at over limit threshold' },
          { chars: 10001, shouldWarn: true, description: 'just over limit' }
        ];

        for (const test of boundaryTests) {
          vi.clearAllMocks();
          mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(1100);
          
          const mockOutput = 'A'.repeat(test.chars);
          mockExecSync.mockReturnValue(mockOutput);

          // Use a hook name that actually triggers UserPromptSubmit limits
          await profileHooks('codebase-map');

          const allLogCalls = consoleLogSpy.mock.calls.flat();
          const outputString = allLogCalls.join(' ');
          
          if (test.shouldWarn) {
            expect(outputString, `${test.description} should show warning`).toContain('Performance Issues');
          } else {
            expect(outputString, `${test.description} should not show warning`).not.toContain('Performance Issues');
          }
        }
      });

      it('should warn about slow hooks (>5 seconds)', async () => {
        const mockOutput = 'Normal output';
        // Mock a 6-second execution time
        mockDateNow.mockReturnValueOnce(1000).mockReturnValueOnce(7000);
        mockExecSync.mockReturnValue(mockOutput);

        await profileHooks('slow-hook');

        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        
        expect(outputString).toContain('Performance Issues');
        expect(outputString).toContain('Slow commands (>5s)');
        expect(outputString).toContain('6.0s'); // Should show execution time in seconds
      });
    });

    describe('graceful error handling', () => {
      it('should handle hook execution errors gracefully', async () => {
        mockExecSync.mockImplementation(() => {
          throw new Error('Hook execution failed');
        });

        // Should not throw, but handle error gracefully  
        await profileHooks('failing-hook');

        expect(mockExecSync).toHaveBeenCalledWith(
          expect.stringContaining('claudekit-hooks run failing-hook'),
          expect.objectContaining({
            encoding: 'utf8',
            maxBuffer: 10 * 1024 * 1024,
            stdio: 'pipe'
          })
        );
        
        // Should show profile results even if hook fails (with 0 output)
        // The error is gracefully handled and converted to empty output
        expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('failing-hook'));
        
        // Should show 0 characters and 0 tokens since the hook failed but was handled gracefully
        const allLogCalls = consoleLogSpy.mock.calls.flat();
        const outputString = allLogCalls.join(' ');
        expect(outputString).toContain('0ms');
        expect(outputString).toContain('0            0'); // 0 chars, 0 tokens
      });

      it('should handle malformed settings.json gracefully', async () => {
        vi.mocked(fs.readFile).mockResolvedValue('invalid json content');

        await profileHooks();

        expect(consoleLogSpy).toHaveBeenCalledWith('No hooks configured in .claude/settings.json');
        expect(mockExecSync).not.toHaveBeenCalled();
      });
    });
  });
});