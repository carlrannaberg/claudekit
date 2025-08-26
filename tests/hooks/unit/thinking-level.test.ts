import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThinkingLevelHook } from '../../../cli/hooks/thinking-level.js';
import type { HookContext } from '../../../cli/hooks/base.js';
import * as configUtils from '../../../cli/utils/claudekit-config.js';

vi.mock('../../../cli/utils/claudekit-config.js');

describe('ThinkingLevelHook', () => {
  let hook: ThinkingLevelHook;
  let mockGetHookConfig: ReturnType<typeof vi.fn>;

  // Helper to create a valid HookContext
  const createContext = (): HookContext => ({
    projectRoot: '/test/project',
    payload: {
      hook_event_name: 'UserPromptSubmit',
    },
    packageManager: {
      name: 'npm',
      exec: 'npx',
      run: 'npm run',
      test: 'npm test',
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
    hook = new ThinkingLevelHook({});
    mockGetHookConfig = vi.mocked(configUtils.getHookConfig);
  });

  describe('metadata', () => {
    it('should have correct metadata', () => {
      expect(ThinkingLevelHook.metadata).toMatchObject({
        id: 'thinking-level',
        displayName: 'Thinking Level',
        description: 'Injects thinking level keywords based on configuration',
        category: 'utility',
        triggerEvent: 'UserPromptSubmit',
        matcher: '*',
      });
    });
  });

  describe('default behavior', () => {
    it('should default to level 2 when no configuration exists', async () => {
      mockGetHookConfig.mockReturnValue(undefined);
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      const jsonResponse = result.jsonResponse as { hookSpecificOutput?: { additionalContext?: string; hookEventName?: string } };
      expect(jsonResponse?.hookSpecificOutput?.additionalContext).toBe('megathink');
      expect(jsonResponse?.hookSpecificOutput?.hookEventName).toBe('UserPromptSubmit');
    });

    it('should default to level 2 when config exists but level is not specified', async () => {
      mockGetHookConfig.mockReturnValue({});
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      const jsonResponse = result.jsonResponse as { hookSpecificOutput?: { additionalContext?: string } };
      expect(jsonResponse?.hookSpecificOutput?.additionalContext).toBe('megathink');
    });
  });

  describe('level configuration', () => {
    it('should respect all valid configured levels', async () => {
      const levelMappings = [
        { level: 0, keyword: null },
        { level: 1, keyword: 'think' },
        { level: 2, keyword: 'megathink' },
        { level: 3, keyword: 'ultrathink' },
      ];

      for (const mapping of levelMappings) {
        mockGetHookConfig.mockReturnValue({ level: mapping.level });
        
        const context = createContext();

        const result = await hook.execute(context);
        
        expect(result.exitCode).toBe(0);
        if (mapping.keyword !== null) {
          const jsonResponse = result.jsonResponse as { hookSpecificOutput?: { additionalContext?: string } };
          expect(jsonResponse?.hookSpecificOutput?.additionalContext).toBe(mapping.keyword);
        } else {
          expect(result.jsonResponse).toBeUndefined();
        }
      }
    });

    it('should disable injection when level is 0', async () => {
      mockGetHookConfig.mockReturnValue({ level: 0 });
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      expect(result.jsonResponse).toBeUndefined();
    });
  });

  describe('invalid input handling', () => {
    it('should handle invalid level values gracefully', async () => {
      const invalidLevels = [-1, 4, 5, 2.5, NaN, Infinity, -Infinity];

      for (const level of invalidLevels) {
        mockGetHookConfig.mockReturnValue({ level });
        
        const context = createContext();

        const result = await hook.execute(context);
        
        expect(result.exitCode).toBe(0);
        expect(result.jsonResponse).toBeUndefined();
      }
    });

    it('should handle non-numeric level values by not injecting', async () => {
      // These would be caught by TypeScript/Zod in practice, but test runtime behavior
      // Test invalid type - would be caught by TypeScript/Zod in practice
      mockGetHookConfig.mockReturnValue({ level: 'invalid' as unknown } as { level?: number });
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      // Invalid values should result in no injection
      expect(result.jsonResponse).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty configuration object', async () => {
      mockGetHookConfig.mockReturnValue({});
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      const jsonResponse = result.jsonResponse as { hookSpecificOutput?: { additionalContext?: string } };
      expect(jsonResponse?.hookSpecificOutput?.additionalContext).toBe('megathink');
    });

    it('should handle null configuration', async () => {
      mockGetHookConfig.mockReturnValue(null);
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      const jsonResponse = result.jsonResponse as { hookSpecificOutput?: { additionalContext?: string } };
      expect(jsonResponse?.hookSpecificOutput?.additionalContext).toBe('megathink');
    });

    it('should handle configuration with extra fields', async () => {
      mockGetHookConfig.mockReturnValue({
        level: 3,
        someUnknownField: 'test',
        anotherField: 123,
      });
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result.exitCode).toBe(0);
      const jsonResponse = result.jsonResponse as { hookSpecificOutput?: { additionalContext?: string } };
      expect(jsonResponse?.hookSpecificOutput?.additionalContext).toBe('ultrathink');
    });
  });

  describe('getKeywordForLevel', () => {
    it('should return correct keyword for each valid level', () => {
      const expectations = [
        { level: 0, keyword: '' },
        { level: 1, keyword: 'think' },
        { level: 2, keyword: 'megathink' },
        { level: 3, keyword: 'ultrathink' },
      ];

      for (const { level, keyword } of expectations) {
        // Access private method for testing
        const hookWithMethod = hook as unknown as { getKeywordForLevel: (level: number) => string };
        const result = hookWithMethod.getKeywordForLevel(level);
        expect(result).toBe(keyword);
      }
    });

    it('should return empty string for invalid levels', () => {
      const invalidLevels = [-1, 4, 5, 10, 2.5, NaN];
      
      for (const level of invalidLevels) {
        const hookWithMethod = hook as unknown as { getKeywordForLevel: (level: number) => string };
        const result = hookWithMethod.getKeywordForLevel(level);
        expect(result).toBe('');
      }
    });
  });

  describe('JSON response structure', () => {
    it('should return properly structured JSON response', async () => {
      mockGetHookConfig.mockReturnValue({ level: 1 });
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result).toEqual({
        exitCode: 0,
        jsonResponse: {
          hookSpecificOutput: {
            hookEventName: 'UserPromptSubmit',
            additionalContext: 'think',
          },
        },
      });
    });

    it('should not include JSON response when hook is disabled', async () => {
      mockGetHookConfig.mockReturnValue({ level: 0 });
      
      const context = createContext();

      const result = await hook.execute(context);
      
      expect(result).toEqual({ exitCode: 0 });
      expect(result.jsonResponse).toBeUndefined();
    });
  });
});