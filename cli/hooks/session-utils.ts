/**
 * Session tracking utilities for hooks
 * Provides reusable session state management
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

export interface SessionData {
  [key: string]: unknown;
  timestamp: string;
  sessionId: string;
}

export interface SessionHookState {
  transcriptId: string;
  disabledHooks: string[];
  timestamp: string;
  workingDirectory: string;
}

/**
 * Manages per-session state for hooks
 */
export class SessionTracker {
  private claudekitDir: string;
  private hookName: string;

  constructor(hookName: string) {
    this.hookName = hookName;
    this.claudekitDir = path.join(os.homedir(), '.claudekit');
  }

  private async ensureDirectory(): Promise<void> {
    await fs.mkdir(this.claudekitDir, { recursive: true });
  }

  private getSessionFile(sessionId: string): string {
    return path.join(this.claudekitDir, `${this.hookName}-session-${sessionId}.json`);
  }

  /**
   * Get session data for a specific session
   */
  async getSessionData<T extends SessionData>(sessionId: string): Promise<T | null> {
    const sessionFile = this.getSessionFile(sessionId);
    try {
      await fs.access(sessionFile);
      const data = await fs.readFile(sessionFile, 'utf-8');
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  /**
   * Set session data for a specific session
   */
  async setSessionData<T extends Partial<SessionData>>(sessionId: string, data: T): Promise<void> {
    await this.ensureDirectory();
    const sessionFile = this.getSessionFile(sessionId);
    const sessionData = {
      ...data,
      timestamp: new Date().toISOString(),
      sessionId,
    };
    await fs.writeFile(sessionFile, JSON.stringify(sessionData, null, 2));
  }

  /**
   * Check if session has specific flag set
   */
  async hasSessionFlag(sessionId: string, flag: string): Promise<boolean> {
    const data = await this.getSessionData(sessionId);
    return data?.[flag] === true;
  }

  /**
   * Set a flag for the session
   */
  async setSessionFlag(sessionId: string, flag: string, value: boolean = true): Promise<void> {
    const existingData = (await this.getSessionData(sessionId)) ?? {};
    await this.setSessionData(sessionId, {
      ...existingData,
      [flag]: value,
    });
  }

  /**
   * Clean up old session files
   */
  async cleanOldSessions(maxAgeMs: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAgeMs;

    try {
      const files = await fs.readdir(this.claudekitDir);
      for (const file of files) {
        if (file.startsWith(`${this.hookName}-session-`) && file.endsWith('.json')) {
          const filePath = path.join(this.claudekitDir, file);
          try {
            const stats = await fs.stat(filePath);
            if (stats.mtimeMs < cutoff) {
              await fs.unlink(filePath);
            }
          } catch {
            // Ignore individual file errors
          }
        }
      }
    } catch {
      // Ignore cleanup errors - not critical
    }
  }
}

/**
 * Manages session-based hook disable/enable functionality
 * Extends SessionTracker to provide transcript-based hook state management
 */
export class SessionHookManager extends SessionTracker {
  private sessionsDir: string;

  constructor() {
    super('session-hooks');
    this.sessionsDir = path.join(os.homedir(), '.claudekit', 'sessions');
  }

  private async ensureSessionsDirectory(): Promise<void> {
    await fs.mkdir(this.sessionsDir, { recursive: true });
  }

  private getTranscriptSessionFile(transcriptId: string): string {
    // Validate transcript UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(transcriptId)) {
      throw new Error(`Invalid transcript UUID format: ${transcriptId}`);
    }
    return path.join(this.sessionsDir, `${transcriptId}.json`);
  }

  /**
   * Disable a hook for a specific session transcript
   */
  async disableHook(transcriptId: string, hookName: string): Promise<void> {
    await this.ensureSessionsDirectory();
    
    const sessionFile = this.getTranscriptSessionFile(transcriptId);
    let state: SessionHookState;

    try {
      // Try to read existing session state
      const data = await fs.readFile(sessionFile, 'utf-8');
      state = JSON.parse(data) as SessionHookState;
    } catch {
      // Create new session state
      state = {
        transcriptId,
        disabledHooks: [],
        timestamp: new Date().toISOString(),
        workingDirectory: process.cwd()
      };
    }

    // Add hook to disabled list if not already present
    if (!state.disabledHooks.includes(hookName)) {
      state.disabledHooks.push(hookName);
      state.timestamp = new Date().toISOString();

      // Atomic write operation
      const tempFile = `${sessionFile}.tmp`;
      await fs.writeFile(tempFile, JSON.stringify(state, null, 2));
      await fs.rename(tempFile, sessionFile);
    }
  }

  /**
   * Enable a hook for a specific session transcript
   */
  async enableHook(transcriptId: string, hookName: string): Promise<void> {
    const sessionFile = this.getTranscriptSessionFile(transcriptId);

    try {
      const data = await fs.readFile(sessionFile, 'utf-8');
      const state = JSON.parse(data) as SessionHookState;

      // Remove hook from disabled list
      const index = state.disabledHooks.indexOf(hookName);
      if (index > -1) {
        state.disabledHooks.splice(index, 1);
        state.timestamp = new Date().toISOString();

        // Atomic write operation
        const tempFile = `${sessionFile}.tmp`;
        await fs.writeFile(tempFile, JSON.stringify(state, null, 2));
        await fs.rename(tempFile, sessionFile);
      }
    } catch {
      // Session file doesn't exist or hook isn't disabled - no action needed
    }
  }

  /**
   * Check if a hook is disabled for a specific session transcript
   */
  async isHookDisabled(transcriptId: string, hookName: string): Promise<boolean> {
    try {
      const sessionFile = this.getTranscriptSessionFile(transcriptId);
      const data = await fs.readFile(sessionFile, 'utf-8');
      const state = JSON.parse(data) as SessionHookState;
      return state.disabledHooks.includes(hookName);
    } catch {
      // Session file doesn't exist or is invalid - hook is not disabled
      return false;
    }
  }

  /**
   * Get the complete session state for a transcript
   */
  async getSessionState(transcriptId: string): Promise<SessionHookState | null> {
    try {
      const sessionFile = this.getTranscriptSessionFile(transcriptId);
      const data = await fs.readFile(sessionFile, 'utf-8');
      return JSON.parse(data) as SessionHookState;
    } catch {
      // Session file doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Extract transcript UUID from transcript path
   * Used by hooks to get session identifier from Claude payload
   */
  extractTranscriptUuid(transcriptPath: string): string | null {
    // Extract UUID from path like: /path/to/.claude/transcripts/77850d98-4378-4282-9d8f-d2b7113deb20.jsonl
    const match = transcriptPath.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl?$/i);
    return match?.[1] ?? null;
  }
}
