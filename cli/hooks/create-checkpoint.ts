import { createHash } from 'node:crypto';
import { realpathSync } from 'node:fs';
import { copyFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
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

    // Create checkpoint with timestamp. The stash is shared by all worktrees of a
    // repository, so tag the message with this worktree's id; cleanup then only
    // counts and drops this worktree's checkpoints.
    const timestamp = new Date().toISOString();
    const worktreeId = await this.getWorktreeId(projectRoot);
    const message = `${prefix}-checkpoint: Auto-save at ${timestamp}${worktreeSuffix(worktreeId)}`;

    // Create the stash commit without touching the working tree or the index
    const stashSha = await this.createSnapshot(message, projectRoot);

    if (stashSha !== undefined) {
      // Store the stash in the stash list
      await this.execCommand('git', ['stash', 'store', '-m', message, stashSha], {
        cwd: projectRoot,
      });

      // Clean up old checkpoints if needed
      await this.cleanupOldCheckpoints(prefix, maxCheckpoints, worktreeId, projectRoot);
    }

    // Silent success
    return {
      exitCode: 0,
      suppressOutput: true,
      jsonResponse: { suppressOutput: true },
    };
  }

  /**
   * Build a commit shaped like the one `git stash create` makes after `git add -A`
   * (parents: HEAD and an index commit; tree: the working tree including untracked,
   * non-ignored files), so `git stash apply` restores it the same way.
   *
   * The snapshot is staged in a temporary copy of the index, so the user's own
   * index, including partially staged files, is left as it was.
   */
  private async createSnapshot(message: string, projectRoot: string): Promise<string | undefined> {
    const head = await this.gitOutput(['rev-parse', '--verify', '--quiet', 'HEAD'], projectRoot);
    const indexPath = await this.gitOutput(['rev-parse', '--git-path', 'index'], projectRoot);
    if (head === undefined || indexPath === undefined) {
      return undefined;
    }

    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'claudekit-checkpoint-'));
    const env = { GIT_INDEX_FILE: path.join(tempDir, 'index') };
    try {
      try {
        await copyFile(path.resolve(projectRoot, indexPath), env.GIT_INDEX_FILE);
      } catch {
        await this.gitOutput(['read-tree', 'HEAD'], projectRoot, env);
      }

      // The index as the user left it. This fails when there are unmerged paths;
      // the working tree is used for the index commit then.
      const indexTree = await this.gitOutput(['write-tree'], projectRoot, env);

      if ((await this.gitOutput(['add', '-A'], projectRoot, env)) === undefined) {
        return undefined;
      }
      const worktreeTree = await this.gitOutput(['write-tree'], projectRoot, env);
      if (worktreeTree === undefined) {
        return undefined;
      }

      const indexCommit = await this.gitOutput(
        [
          'commit-tree',
          '--no-gpg-sign',
          indexTree ?? worktreeTree,
          '-p',
          head,
          '-m',
          `index on ${message}`,
        ],
        projectRoot
      );
      if (indexCommit === undefined) {
        return undefined;
      }
      return await this.gitOutput(
        [
          'commit-tree',
          '--no-gpg-sign',
          worktreeTree,
          '-p',
          head,
          '-p',
          indexCommit,
          '-m',
          message,
        ],
        projectRoot
      );
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  }

  /** Run git and return its trimmed stdout, or undefined if it failed. */
  private async gitOutput(
    args: string[],
    projectRoot: string,
    env?: Record<string, string>
  ): Promise<string | undefined> {
    const { stdout, exitCode } = await this.execCommand('git', args, {
      cwd: projectRoot,
      ...(env !== undefined ? { env } : {}),
    });
    return exitCode === 0 ? stdout.trim() : undefined;
  }

  private async cleanupOldCheckpoints(
    prefix: string,
    maxCount: number,
    worktreeId: string | undefined,
    projectRoot: string
  ): Promise<void> {
    // Entries are listed newest first. Only entries written by this hook for this
    // worktree count; the user's own stashes are never touched.
    const checkpoints = (await this.listStash(projectRoot)).filter((entry) =>
      this.isOwnAutoCheckpoint(entry.subject, prefix, worktreeId)
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

  /**
   * True for checkpoints this hook wrote from the current worktree. Checkpoints in
   * the old format, which has no worktree id, belong to no worktree in particular,
   * so every worktree counts them as its own; being the oldest, they are dropped
   * first.
   */
  private isOwnAutoCheckpoint(
    subject: string,
    prefix: string,
    worktreeId: string | undefined
  ): boolean {
    const head = `${prefix}-checkpoint: Auto-save at `;
    if (!subject.startsWith(head)) {
      return false;
    }
    const rest = subject.slice(head.length);
    const isOldFormat = !rest.includes(' ');
    return isOldFormat || rest.endsWith(worktreeSuffix(worktreeId));
  }

  /** A short id that is stable for a worktree and different for each worktree. */
  private async getWorktreeId(projectRoot: string): Promise<string | undefined> {
    const { stdout, exitCode } = await this.execCommand(
      'git',
      ['rev-parse', '--absolute-git-dir'],
      {
        cwd: projectRoot,
      }
    );
    const gitDir = stdout.trim();
    if (exitCode !== 0 || gitDir === '') {
      return undefined;
    }
    let resolved = gitDir;
    try {
      resolved = realpathSync(gitDir);
    } catch {
      // Keep the path git reported.
    }
    return createHash('sha1').update(resolved).digest('hex').slice(0, 8);
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

function worktreeSuffix(worktreeId: string | undefined): string {
  return worktreeId === undefined ? '' : ` (worktree ${worktreeId})`;
}
