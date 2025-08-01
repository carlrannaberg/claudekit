import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class AutoCheckpointHook extends BaseHook {
  name = 'auto-checkpoint';

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot } = context;
    const prefix = (this.config['prefix'] as string) || 'claude';
    const maxCheckpoints = (this.config['maxCheckpoints'] as number) || 10;

    // Check if there are any changes to checkpoint
    const { stdout } = await this.execCommand('git', ['status', '--porcelain'], {
      cwd: projectRoot,
    });

    if (!stdout.trim()) {
      // No changes, suppress output
      return { exitCode: 0, suppressOutput: true };
    }

    // Create checkpoint with timestamp
    const timestamp = new Date().toISOString();
    const message = `${prefix}-checkpoint: Auto-save at ${timestamp}`;

    // Add all files temporarily
    await this.execCommand('git', ['add', '-A'], { cwd: projectRoot });

    // Create stash object without modifying working directory
    const { stdout: stashSha } = await this.execCommand('git', ['stash', 'create', message], {
      cwd: projectRoot,
    });

    if (stashSha.trim()) {
      // Store the stash in the stash list
      await this.execCommand('git', ['stash', 'store', '-m', message, stashSha.trim()], {
        cwd: projectRoot,
      });

      // Reset index to unstage files
      await this.execCommand('git', ['reset'], { cwd: projectRoot });

      // Clean up old checkpoints if needed
      await this.cleanupOldCheckpoints(prefix, maxCheckpoints, projectRoot);
    }

    // Silent success
    return {
      exitCode: 0,
      suppressOutput: true,
      jsonResponse: { suppressOutput: true },
    };
  }

  private async cleanupOldCheckpoints(
    prefix: string,
    maxCount: number,
    projectRoot: string
  ): Promise<void> {
    // Get list of checkpoints
    const { stdout } = await this.execCommand('git', ['stash', 'list'], { cwd: projectRoot });

    const checkpoints = stdout
      .split('\n')
      .filter((line) => line.includes(`${prefix}-checkpoint`))
      .map((line, index) => ({ line, index }));

    // Remove old checkpoints if over limit
    if (checkpoints.length > maxCount) {
      const toRemove = checkpoints.slice(maxCount);
      for (const checkpoint of toRemove.reverse()) {
        await this.execCommand('git', ['stash', 'drop', `stash@{${checkpoint.index}}`], {
          cwd: projectRoot,
        });
      }
    }
  }
}
