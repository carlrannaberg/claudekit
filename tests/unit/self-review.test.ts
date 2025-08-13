import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { SelfReviewHook } from '../../cli/hooks/self-review.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as configUtils from '../../cli/utils/claudekit-config.js';

vi.mock('../../cli/utils/claudekit-config.js');
vi.mock('fs');
vi.mock('os');

describe('SelfReviewHook', () => {
  let hook: SelfReviewHook;
  let mockGetHookConfig: MockInstance;
  let consoleErrorSpy: MockInstance;
  let jsonOutputSpy: MockInstance;
  let hookWithPrivateMethods: {
    jsonOutput: (data: unknown) => void;
    hasRecentCodeChanges: () => boolean;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    hook = new SelfReviewHook();
    mockGetHookConfig = vi.mocked(configUtils.getHookConfig);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    hookWithPrivateMethods = hook as unknown as {
      jsonOutput: (data: unknown) => void;
      hasRecentCodeChanges: (transcriptPath?: string) => boolean;
    };
    
    jsonOutputSpy = vi.spyOn(hookWithPrivateMethods, 'jsonOutput').mockImplementation(() => {});
    
    // Mock Math.random to control probability
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  const createMockContext = (): HookContext => ({
    projectRoot: '/test/project',
    payload: {
      transcript_path: '/tmp/test-transcript.jsonl'
    },
    packageManager: {
      name: 'npm',
      exec: 'npx',
      run: 'npm run',
      test: 'npm test'
    }
  });

  describe('configuration', () => {
    it('should use default focus areas when no config provided', async () => {
      mockGetHookConfig.mockReturnValue(undefined);
      
      const context = createMockContext();
      await hook.execute(context);
      
      // Check that review message was generated
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0]?.[0] ?? '';
      
      // Should contain default focus areas
      expect(message).toMatch(/Refactoring & Integration/);
      expect(message).toMatch(/Code Quality/);
      expect(message).toMatch(/Consistency & Completeness/);
    });

    it('should use custom focus areas when configured', async () => {
      const customConfig = {
        triggerProbability: 1.0,
        focusAreas: [
          {
            name: 'Performance',
            questions: ['Is this performant?', 'Any optimization needed?']
          },
          {
            name: 'Security',
            questions: ['Is this secure?', 'Any vulnerabilities?']
          }
        ]
      };
      
      mockGetHookConfig.mockReturnValue(customConfig);
      
      const context = createMockContext();
      await hook.execute(context);
      
      // Check that review message was generated with custom areas
      expect(consoleErrorSpy).toHaveBeenCalled();
      const message = consoleErrorSpy.mock.calls[0]?.[0] ?? '';
      
      // Should contain custom focus areas
      expect(message).toMatch(/Performance/);
      expect(message).toMatch(/Security/);
      
      // Should NOT contain default focus areas (check for actual focus area headers)
      expect(message).not.toMatch(/\*\*Refactoring & Integration/);
      expect(message).not.toMatch(/\*\*Code Quality:/);
      expect(message).not.toMatch(/\*\*Consistency & Completeness/);
    });

    it('should respect trigger probability configuration', async () => {
      mockGetHookConfig.mockReturnValue({ triggerProbability: 0.3 });
      
      // Mock random to be above threshold
      vi.mocked(Math.random).mockReturnValue(0.5);
      
      const context = createMockContext();
      const result = await hook.execute(context);
      
      // Should not trigger (0.5 > 0.3)
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should trigger when probability is met', async () => {
      mockGetHookConfig.mockReturnValue({ triggerProbability: 0.7 });
      
      // Mock random to be below threshold
      vi.mocked(Math.random).mockReturnValue(0.5);
      
      const context = createMockContext();
      await hook.execute(context);
      
      // Should trigger (0.5 <= 0.7)
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(jsonOutputSpy).toHaveBeenCalledWith({
        decision: 'block',
        reason: expect.any(String)
      });
    });
  });

  describe('message variation', () => {
    it('should select random questions from each focus area', async () => {
      const customConfig = {
        triggerProbability: 1.0,
        focusAreas: [
          {
            name: 'Area1',
            questions: ['Q1', 'Q2', 'Q3']
          }
        ]
      };
      
      mockGetHookConfig.mockReturnValue(customConfig);
      
      // Run multiple times to check randomization
      const messages: string[] = [];
      for (let i = 0; i < 3; i++) {
        vi.clearAllMocks();
        await hook.execute(createMockContext());
        const message = consoleErrorSpy.mock.calls[0]?.[0];
        if (message !== undefined && message !== null) {
          messages.push(String(message));
        }
      }
      
      // All should contain Area1
      messages.forEach(msg => {
        expect(msg).toMatch(/Area1/);
      });
    });
  });

  describe('stop hook behavior', () => {
    it('should not trigger if already in stop hook loop', async () => {
      mockGetHookConfig.mockReturnValue({ triggerProbability: 1.0 });
      
      const context: HookContext = {
        ...createMockContext(),
        payload: { stop_hook_active: true }
      };
      
      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not trigger if no transcript path provided', async () => {
      mockGetHookConfig.mockReturnValue({ triggerProbability: 1.0 });
      
      const context: HookContext = {
        ...createMockContext(),
        payload: {} // No transcript_path
      };
      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });
});