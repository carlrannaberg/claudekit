import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable } from './utils.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import { generateCodebaseMap, type CodebaseMapConfig } from './codebase-map-utils.js';
import { SessionTracker } from './session-utils.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const execAsync = promisify(exec);

export class CodebaseMapHook extends BaseHook {
  name = 'codebase-map';
  private sessionTracker = new SessionTracker('codebase-map');

  static metadata = {
    id: 'codebase-map',
    displayName: 'Codebase Map Provider',
    description: 'Adds codebase map to context at session start or first user prompt',
    category: 'utility' as const,
    triggerEvent: ['SessionStart', 'UserPromptSubmit'] as const,
    matcher: '*',
    dependencies: [],
  };

  private loadConfig(): CodebaseMapConfig {
    return getHookConfig<CodebaseMapConfig>('codebase-map') ?? {};
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
        include: config.include,
        exclude: config.exclude,
        format: config.format,
        projectRoot,
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

        // Return JSON response with additionalContext
        const eventName = context.payload.hook_event_name ?? 'UserPromptSubmit';
        let contextMessage = `📍 Codebase Map (loaded once per session):\n\n${result.output}`;
        
        // Only apply cutoff for UserPromptSubmit (10,000 char limit)
        // SessionStart has no limit and is visible to users
        if (eventName === 'UserPromptSubmit') {
          const MAX_CONTEXT_LENGTH = 9000; // Leave 1,000 chars for other hooks
          if (contextMessage.length > MAX_CONTEXT_LENGTH) {
            contextMessage = `${contextMessage.substring(0, MAX_CONTEXT_LENGTH)}\n\n[output truncated - exceeded 9000 characters]`;
          }
        }
        
        return {
          exitCode: 0,
          jsonResponse: {
            hookSpecificOutput: {
              hookEventName: eventName,
              additionalContext: contextMessage,
            },
          },
        };
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

// Hook for updating codebase map on file changes
export class CodebaseMapUpdateHook extends BaseHook {
  name = 'codebase-map-update';
  private lastUpdateTime = 0;
  private updateDebounceMs = 5000; // Debounce updates to avoid excessive regeneration

  static metadata = {
    id: 'codebase-map-update',
    displayName: 'Codebase Map Updater',
    description: 'Update codebase map index when files change',
    category: 'utility' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['codebase-map'],
  };

  private shouldUpdateMap(filePath: string | undefined): boolean {
    if (filePath === undefined || filePath.length === 0) {
      return false;
    }

    // Check if enough time has passed since last update (debounce)
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateDebounceMs) {
      return false;
    }

    // Only update for TypeScript/JavaScript files
    const isCodeFile = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].some((ext) =>
      filePath.endsWith(ext)
    );

    return isCodeFile;
  }

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot } = context;

    // Check if we should update the map
    if (!this.shouldUpdateMap(filePath)) {
      return { exitCode: 0 };
    }

    // Check if codebase-map is installed (silently skip if not available)
    if (!(await checkToolAvailable('codebase-map', 'package.json', projectRoot))) {
      return { exitCode: 0 };
    }

    // Check if index file exists (.codebasemap)
    try {
      await fs.access(path.join(projectRoot, '.codebasemap'));
    } catch {
      // No index file, skip update (will be created on next SessionStart)
      return { exitCode: 0 };
    }

    // Update the specific file in the index
    this.lastUpdateTime = Date.now();

    try {
      // Update the specific file in the index (no filtering needed for updates)
      const command = `codebase-map update "${filePath}"`;

      await execAsync(command, {
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024,
      });

      // Silent success - don't interrupt workflow
    } catch (error) {
      // Silently fail on updates to avoid disrupting workflow
      console.error('Failed to update codebase map:', error);
    }

    return { exitCode: 0 };
  }
}
