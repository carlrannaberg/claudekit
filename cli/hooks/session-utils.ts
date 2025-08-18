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
