import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { TranscriptParser } from '../utils/transcript-parser.js';

export class CheckTodosHook extends BaseHook {
  name = 'check-todos';

  static metadata = {
    id: 'check-todos',
    displayName: 'Check Todo Completion',
    description: 'Validate todo completions',
    category: 'project-management' as const,
    triggerEvent: 'Stop' as const,
    matcher: '*',
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { payload } = context;

    // Get transcript path
    const transcriptPath = payload.transcript_path as string | undefined;
    if (transcriptPath === undefined || transcriptPath === '') {
      // Allow stop - no transcript to check
      return { exitCode: 0 };
    }

    const parser = new TranscriptParser(transcriptPath);
    if (!parser.exists()) {
      // Allow stop - transcript not found
      return { exitCode: 0 };
    }

    // Find the most recent todo state
    const todoState = parser.findLatestTodoState();

    if (!todoState) {
      // No todos found, allow stop
      return { exitCode: 0 };
    }

    // Check for incomplete todos
    const incompleteTodos = todoState.filter((todo) => todo.status !== 'completed');

    if (incompleteTodos.length > 0) {
      // Block stop and return JSON response
      const reason = `You have ${
        incompleteTodos.length
      } incomplete todo items. You must complete all tasks before stopping:\n\n${incompleteTodos
        .map((todo) => `  - [${todo.status}] ${todo.content}`)
        .join(
          '\n'
        )}\n\nUse TodoRead to see the current status, then complete all remaining tasks. Mark each task as completed using TodoWrite as you finish them.`;

      this.jsonOutput({
        decision: 'block',
        reason,
      });

      return { exitCode: 0 }; // Note: exit 0 for Stop hooks, JSON controls decision
    }

    // All todos complete, allow stop
    return { exitCode: 0 };
  }
}
