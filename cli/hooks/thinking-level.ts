import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { getHookConfig } from '../utils/claudekit-config.js';

interface ThinkingLevelConfig {
  level?: number; // 0-4
}

export class ThinkingLevelHook extends BaseHook {
  name = 'thinking-level';

  static metadata = {
    id: 'thinking-level',
    displayName: 'Thinking Level',
    description: 'Injects thinking level keywords based on configuration',
    category: 'utility' as const,
    triggerEvent: 'UserPromptSubmit' as const,
    matcher: '*',
    dependencies: [],
  };

  private readonly levelKeywords: Record<number, string> = {
    0: '',
    1: 'think',
    2: 'think hard',
    3: 'think harder',
    4: 'ultrathink',
  };

  private loadConfig(): ThinkingLevelConfig {
    return getHookConfig<ThinkingLevelConfig>('thinking-level') ?? {};
  }

  private getKeywordForLevel(level: number): string {
    // Ensure level is within valid range
    if (level < 0 || level > 4 || !Number.isInteger(level)) {
      const fallbackKeyword = this.levelKeywords[0];
      return fallbackKeyword !== undefined ? fallbackKeyword : '';
    }
    const keyword = this.levelKeywords[level];
    return keyword !== undefined ? keyword : '';
  }

  async execute(_context: HookContext): Promise<HookResult> {
    const config = this.loadConfig();

    // Get the configured level (default to 2)
    const level = config.level ?? 2;
    const keyword = this.getKeywordForLevel(level);

    // If level 0 or empty keyword, don't inject anything
    if (level === 0 || keyword === '') {
      return { exitCode: 0 };
    }

    // Return JSON response with additionalContext
    return {
      exitCode: 0,
      jsonResponse: {
        hookSpecificOutput: {
          hookEventName: 'UserPromptSubmit',
          additionalContext: keyword,
        },
      },
    };
  }
}