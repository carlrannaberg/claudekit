import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import { generateCodebaseMap, type CodebaseContextConfig } from './codebase-map-utils.js';
import { SessionTracker } from './session-utils.js';

export class CodebaseContextHook extends BaseHook {
  name = 'codebase-context';
  private sessionTracker = new SessionTracker('codebase-context');

  static metadata = {
    id: 'codebase-context',
    displayName: 'Codebase Context Provider',
    description: 'Adds codebase map to context on first user prompt of each session',
    category: 'utility' as const,
    triggerEvent: 'UserPromptSubmit' as const,
    matcher: '*',
    dependencies: [],
  };

  private loadConfig(): CodebaseContextConfig {
    return getHookConfig<CodebaseContextConfig>('codebase-context') ?? {};
  }

  private async hasProvidedContext(context: HookContext): Promise<boolean> {
    const sessionId = String(context.payload['session_id'] ?? 'unknown');
    return await this.sessionTracker.hasSessionFlag(sessionId, 'contextProvided');
  }

  private async markContextProvided(context: HookContext): Promise<void> {
    const sessionId = String(context.payload['session_id'] ?? 'unknown');
    await this.sessionTracker.setSessionFlag(sessionId, 'contextProvided', true);
  }

  private cleanOldSessions(): void {
    // Fire and forget cleanup
    this.sessionTracker.cleanOldSessions().catch(() => {
      // Ignore cleanup errors
    });
  }

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot } = context;
    
    // Skip if we've already provided context for this session
    if (await this.hasProvidedContext(context)) {
      return { exitCode: 0 };
    }

    const config = this.loadConfig();

    try {
      // Generate the codebase map using shared utility
      const result = await generateCodebaseMap({
        command: config.command,
        format: config.format,
        projectRoot
      });

      if (!result.success) {
        // Log error in debug mode only
        if (process.env['DEBUG'] === 'true') {
          console.error('Failed to generate codebase map:', result.error);
        }
        // Don't block user prompt on failure
        return { exitCode: 0 };
      }

      // Only provide context if we have output
      if (result.output !== undefined && result.output !== '') {
        // Mark that we've provided context for this session
        await this.markContextProvided(context);
        
        // Clean up old session files (async, non-blocking)
        this.cleanOldSessions();
        
        // Output the codebase map to stdout (which adds it to context for UserPromptSubmit)
        const contextMessage = `📍 Codebase Map (loaded once per session):\n\n${result.output}`;
        console.log(contextMessage);
      }

      return { exitCode: 0 };
    } catch (error) {
      // Log error in debug mode only
      if (process.env['DEBUG'] === 'true') {
        console.error('Failed to generate codebase map:', error);
      }
      // Don't block user prompt on failure
      return { exitCode: 0 };
    }
  }
}