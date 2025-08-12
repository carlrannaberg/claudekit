import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

interface Todo {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
}

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
    let transcriptPath = payload.transcript_path;
    if (transcriptPath === undefined || transcriptPath === '') {
      // Allow stop - no transcript to check
      return { exitCode: 0 };
    }

    // Expand ~ to home directory
    transcriptPath = transcriptPath.replace(/^~/, process.env['HOME'] ?? '');

    if (!(await this.fileExists(transcriptPath))) {
      // Allow stop - transcript not found
      return { exitCode: 0 };
    }

    // Find the most recent todo state
    const todoState = await this.findLatestTodoState(transcriptPath);

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

  private async findLatestTodoState(transcriptPath: string): Promise<Todo[] | null> {
    const content = await this.readFile(transcriptPath);
    const lines = content.split('\n').filter((line) => line.trim());

    // Read from end to find most recent todo state
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (line === undefined || line === '') {
        continue;
      } // Handle undefined from noUncheckedIndexedAccess

      try {
        const entry = JSON.parse(line);
        if (
          entry.toolUseResult?.newTodos !== null &&
          entry.toolUseResult?.newTodos !== undefined &&
          Array.isArray(entry.toolUseResult.newTodos)
        ) {
          return entry.toolUseResult.newTodos;
        }
      } catch {
        // Not valid JSON, continue
      }
    }

    return null;
  }
}
