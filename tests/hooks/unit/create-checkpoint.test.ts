import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { CreateCheckpointHook } from '../../../cli/hooks/create-checkpoint.js';
import type { HookContext } from '../../../cli/hooks/base.js';
import * as configUtils from '../../../cli/utils/claudekit-config.js';

vi.mock('../../../cli/utils/claudekit-config.js');

// These tests run the hook against real temporary git repositories, because the
// bugs they cover are about how git's stash list is read and modified.

function git(cwd: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

function initRepo(dir: string): void {
  git(dir, 'init', '-q');
  git(dir, 'config', 'user.email', 'test@example.com');
  git(dir, 'config', 'user.name', 'Test');
  git(dir, 'config', 'commit.gpgsign', 'false');
  writeFileSync(path.join(dir, 'f.txt'), 'base\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-qm', 'init');
}

function stashSubjects(cwd: string): string[] {
  const out = git(cwd, 'stash', 'list', '--format=%gs');
  return out === '' ? [] : out.split('\n');
}

/** Content of f.txt in each stash entry, newest first. */
function stashContents(cwd: string): string[] {
  const refs = git(cwd, 'stash', 'list', '--format=%gd');
  return refs === '' ? [] : refs.split('\n').map((ref) => git(cwd, 'show', `${ref}:f.txt`));
}

function manualStash(cwd: string, content: string, message: string): void {
  writeFileSync(path.join(cwd, 'f.txt'), `${content}\n`);
  git(cwd, 'stash', 'push', '-q', '-m', message);
}

describe('CreateCheckpointHook', () => {
  let tmp: string;
  let repo: string;
  let hook: CreateCheckpointHook;

  const context = (projectRoot: string): HookContext => ({
    projectRoot,
    payload: { hook_event_name: 'Stop' },
    packageManager: { name: 'npm', exec: 'npx', run: 'npm run', test: 'npm test' },
  });

  /** Edit f.txt, run the hook, then discard the edit (like the end of a session). */
  const checkpoint = async (cwd: string, content: string): Promise<void> => {
    writeFileSync(path.join(cwd, 'f.txt'), `${content}\n`);
    const result = await hook.execute(context(cwd));
    expect(result.exitCode).toBe(0);
    git(cwd, 'checkout', '-q', '--', 'f.txt');
  };

  beforeEach(() => {
    tmp = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'claudekit-checkpoint-test-')));
    repo = path.join(tmp, 'repo');
    execFileSync('mkdir', ['-p', repo]);
    initRepo(repo);
    vi.mocked(configUtils.getHookConfig).mockReturnValue({ maxCheckpoints: 2 });
    hook = new CreateCheckpointHook({});
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  describe('cleanup of old checkpoints', () => {
    it('never drops a manual stash that sits between checkpoints', async () => {
      manualStash(repo, 'userA', 'USER-A');
      await checkpoint(repo, 'c1');
      await checkpoint(repo, 'c2');
      manualStash(repo, 'userB', 'USER-B');
      await checkpoint(repo, 'c3');
      await checkpoint(repo, 'c4');

      const subjects = stashSubjects(repo);
      expect(subjects.some((s) => s.includes('USER-A'))).toBe(true);
      expect(subjects.some((s) => s.includes('USER-B'))).toBe(true);
      expect(stashContents(repo)).toEqual(['c4', 'c3', 'userB', 'userA']);
    });

    it('drops the oldest checkpoint first', async () => {
      await checkpoint(repo, 'c1');
      manualStash(repo, 'user', 'USER');
      await checkpoint(repo, 'c2');
      await checkpoint(repo, 'c3');

      expect(stashContents(repo)).toEqual(['c3', 'c2', 'user']);
    });

    it('does not count or drop checkpoints created with /checkpoint:create', async () => {
      writeFileSync(path.join(repo, 'f.txt'), 'manual\n');
      const sha = git(repo, 'stash', 'create');
      git(repo, 'stash', 'store', '-m', 'claude-checkpoint: before refactor', sha);
      git(repo, 'checkout', '-q', '--', 'f.txt');

      await checkpoint(repo, 'c1');
      await checkpoint(repo, 'c2');
      await checkpoint(repo, 'c3');

      expect(stashContents(repo)).toEqual(['c3', 'c2', 'manual']);
    });
  });
});
