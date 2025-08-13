import { describe, it, expect, beforeEach, vi, type MockInstance } from 'vitest';
import { SelfReviewHook } from '../../cli/hooks/self-review.js';
import type { HookContext } from '../../cli/hooks/base.js';
import * as configUtils from '../../cli/utils/claudekit-config.js';
import * as fs from 'fs';
import * as os from 'os';

vi.mock('../../cli/utils/claudekit-config.js');
vi.mock('fs');
vi.mock('os');

describe('SelfReviewHook', () => {
  let hook: SelfReviewHook;
  let mockGetHookConfig: MockInstance;
  let consoleErrorSpy: MockInstance;
  let jsonOutputSpy: MockInstance;
  let mockReadFileSync: MockInstance;
  let mockExistsSync: MockInstance;
  let mockHomedir: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    hook = new SelfReviewHook();
    mockGetHookConfig = vi.mocked(configUtils.getHookConfig);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    const hookWithPrivateMethods = hook as unknown as {
      jsonOutput: (data: unknown) => void;
    };
    
    jsonOutputSpy = vi.spyOn(hookWithPrivateMethods, 'jsonOutput').mockImplementation(() => {});
    
    // Mock filesystem operations
    mockReadFileSync = vi.mocked(fs.readFileSync);
    mockExistsSync = vi.mocked(fs.existsSync);
    mockHomedir = vi.mocked(os.homedir);
    
    // Default mock implementations
    mockHomedir.mockReturnValue('/home/user');
    mockExistsSync.mockReturnValue(true);
    
    // Mock transcript with recent code changes
    const mockTranscript = [
      JSON.stringify({ 
        type: 'assistant', 
        message: { 
          content: [
            { type: 'tool_use', name: 'Edit', input: { file_path: 'src/test.ts' } }
          ] 
        } 
      }),
      JSON.stringify({ 
        type: 'assistant', 
        message: { 
          content: [
            { type: 'tool_use', name: 'Write', input: { file_path: 'README.md' } }
          ] 
        } 
      }),
    ].join('\n');
    mockReadFileSync.mockReturnValue(mockTranscript);
    
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

    it('should detect changes and trigger review', async () => {
      // Create a transcript with recent code changes
      const entries = [];
      
      // Add a recent code change
      entries.push(JSON.stringify({ 
        type: 'assistant', 
        message: { 
          content: [
            { type: 'tool_use', name: 'Edit', input: { file_path: 'src/recent.ts' } }
          ] 
        } 
      }));
      
      mockReadFileSync.mockReturnValue(entries.join('\n'));
      mockGetHookConfig.mockReturnValue({});
      
      const context = createMockContext();
      await hook.execute(context);
      
      // Should trigger because there are recent code changes
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(jsonOutputSpy).toHaveBeenCalledWith({
        decision: 'block',
        reason: expect.any(String)
      });
    });

    it('should limit lookback to 200 entries when no previous marker', async () => {
      // Create a transcript with >200 entries
      const entries = [];
      
      // Add an old code change (beyond 200 entries)
      entries.push(JSON.stringify({ 
        type: 'assistant', 
        message: { 
          content: [
            { type: 'tool_use', name: 'Edit', input: { file_path: 'src/old.ts' } }
          ] 
        } 
      }));
      
      // Add 250 non-code entries
      for (let i = 0; i < 250; i++) {
        entries.push(JSON.stringify({ 
          type: 'assistant', 
          message: { 
            content: [{ type: 'text', text: `Message ${i}` }]
          } 
        }));
      }
      
      mockReadFileSync.mockReturnValue(entries.join('\n'));
      mockGetHookConfig.mockReturnValue({});
      
      const context = createMockContext();
      const result = await hook.execute(context);
      
      // Should not trigger because the only code change is beyond the 200-entry lookback
      expect(result.suppressOutput).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('message variation', () => {
    it('should select random questions from each focus area', async () => {
      const customConfig = {
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
      mockGetHookConfig.mockReturnValue({});
      
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
      mockGetHookConfig.mockReturnValue({});
      
      const context: HookContext = {
        ...createMockContext(),
        payload: {} // No transcript_path
      };
      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should not trigger if transcript contains only documentation changes', async () => {
      mockGetHookConfig.mockReturnValue({});
      
      // Mock transcript with only documentation changes
      const mockTranscript = [
        JSON.stringify({ 
          type: 'assistant', 
          message: { 
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'README.md' } }
            ] 
          } 
        }),
        JSON.stringify({ 
          type: 'assistant', 
          message: { 
            content: [
              { type: 'tool_use', name: 'Write', input: { file_path: 'docs/guide.md' } }
            ] 
          } 
        }),
      ].join('\n');
      mockReadFileSync.mockReturnValue(mockTranscript);
      
      const context = createMockContext();
      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      expect(result.suppressOutput).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should trigger if transcript contains code file changes', async () => {
      mockGetHookConfig.mockReturnValue({});
      
      // Mock transcript with code changes
      const mockTranscript = [
        JSON.stringify({ 
          type: 'assistant', 
          message: { 
            content: [
              { type: 'tool_use', name: 'Edit', input: { file_path: 'src/index.ts' } }
            ] 
          } 
        }),
        JSON.stringify({ 
          type: 'assistant', 
          message: { 
            content: [
              { type: 'tool_use', name: 'Write', input: { file_path: 'test/unit.test.js' } }
            ] 
          } 
        }),
      ].join('\n');
      mockReadFileSync.mockReturnValue(mockTranscript);
      
      // Set random to trigger
      vi.mocked(Math.random).mockReturnValue(0.5);
      
      const context = createMockContext();
      await hook.execute(context);
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(jsonOutputSpy).toHaveBeenCalledWith({
        decision: 'block',
        reason: expect.any(String)
      });
    });
  });
});