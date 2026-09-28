import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { getHookConfig } from '../utils/claudekit-config.js';

interface CreateCheckpointConfig {
  prefix?: string;
  maxCheckpoints?: number;
}

interface StashEntry {
  ref: string; // e.g. stash@{2}
  sha: string;
  subject: string;
}

export class CreateCheckpointHook extends BaseHook {
  name = 'create-checkpoint';

  static metadata = {
    id: 'create-checkpoint',
    displayName: 'Create Checkpoint',
    description: 'Git auto-checkpoint on stop',
    category: 'git' as const,
    triggerEvent: ['Stop', 'SubagentStop'] as const,
    matcher: '*',
    dependencies: ['git'],
  };

  private loadConfig(projectRoot: string): CreateCheckpointConfig {
    return getHookConfig<CreateCheckpointConfig>('create-checkpoint', projectRoot) || {};
  }

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot } = context;
    const config = this.loadConfig(projectRoot);
    const prefix = config.prefix ?? 'claude';
    const maxCheckpoints = config.maxCheckpoints ?? 10;

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
    // Entries are listed newest first. Only entries written by this hook count;
    // the user's own stashes are never touched.
    const checkpoints = (await this.listStash(projectRoot)).filter((entry) =>
      this.isAutoCheckpoint(entry.subject, prefix)
    );

    if (checkpoints.length <= maxCount) {
      return;
    }

    // Drop the oldest first. Positions in the stash list shift whenever an entry is
    // added or dropped, so look each entry up again by its commit SHA before
    // dropping it rather than trusting a position computed earlier.
    const toRemove = checkpoints.slice(maxCount).reverse();
    for (const target of toRemove) {
      const entries = await this.listStash(projectRoot);
      const current =
        entries.find((entry) => entry.ref === target.ref && entry.sha === target.sha) ??
        entries.find((entry) => entry.sha === target.sha);
      if (current === undefined) {
        continue;
      }
      await this.execCommand('git', ['stash', 'drop', current.ref], { cwd: projectRoot });
    }
  }

  private isAutoCheckpoint(subject: string, prefix: string): boolean {
    return subject.startsWith(`${prefix}-checkpoint: Auto-save at `);
  }

  private async listStash(projectRoot: string): Promise<StashEntry[]> {
    const { stdout, exitCode } = await this.execCommand(
      'git',
      ['stash', 'list', '--format=%gd%x09%H%x09%gs'],
      { cwd: projectRoot }
    );
    if (exitCode !== 0) {
      return [];
    }

    const entries: StashEntry[] = [];
    for (const line of stdout.split('\n')) {
      const [ref, sha, ...subject] = line.split('\t');
      if (ref !== undefined && ref !== '' && sha !== undefined && sha !== '') {
        entries.push({ ref, sha, subject: subject.join('\t') });
      }
    }
    return entries;
  }
}
