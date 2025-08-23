/**
 * Performance optimization utilities for hooks
 */

import type { ClaudePayload } from '../base.js';
import { isHookDisabledForSubagent } from '../subagent-detector.js';

/**
 * Check if a hook should be skipped for subagent context.
 * Only performs expensive subagent detection on SubagentStop events.
 * 
 * @param hookName - Name of the hook for logging and detection
 * @param payload - Hook payload from Claude Code
 * @returns Promise<boolean> - true if hook should be skipped
 */
export async function shouldSkipForSubagent(
  hookName: string, 
  payload: ClaudePayload
): Promise<boolean> {
  // Only check for subagent context on SubagentStop events
  if (payload.hook_event_name === 'SubagentStop') {
    const transcriptPath = payload.transcript_path as string | undefined;
    const isDisabled = await isHookDisabledForSubagent(hookName, transcriptPath);
    if (isDisabled) {
      if (process.env['DEBUG'] === 'true') {
        console.error(`${hookName}: Skipping - disabled for subagent`);
      }
      return true;
    }
  }
  return false;
}