import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { setup } from '../../cli/commands/setup.js';
import type { SetupOptions } from '../../cli/commands/setup.js';

// Mock all the external dependencies
vi.mock('@inquirer/prompts', () => ({
  select: vi.fn(),
  checkbox: vi.fn(),
  input: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock('ora', () => ({
  default: () => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}));
vi.mock('../../cli/utils/logger.js');
vi.mock('../../cli/lib/filesystem.js', () => ({
  pathExists: vi.fn().mockResolvedValue(true),
  ensureDirectoryExists: vi.fn().mockResolvedValue(undefined),
  expandHomePath: vi.fn((path: string) => path.replace('~', '/home/user')),
  normalizePath: vi.fn((path: string) => path),
}));
vi.mock('../../cli/lib/index.js', () => ({
  detectProjectContext: vi.fn().mockResolvedValue({
    projectRoot: process.cwd(),
    hasTypeScript: true,
    hasESLint: true,
    hasPrettier: false,
    hasJest: true,
    hasVitest: false,
    isGitRepository: true,
    frameworks: ['react'],
  }),
  discoverComponents: vi.fn().mockResolvedValue({
    components: new Map([
      ['typecheck', {
        type: 'hook',
        path: '/path/to/typecheck.sh',
        metadata: {
          id: 'typecheck',
          name: 'TypeScript Check',
          description: 'Type checking',
          category: 'validation',
          platforms: ['darwin', 'linux'],
          dependencies: [],
          enabled: true,
        },
      }],
      ['eslint', {
        type: 'hook',
        path: '/path/to/eslint.sh',
        metadata: {
          id: 'eslint',
          name: 'ESLint',
          description: 'ESLint validation',
          category: 'validation',
          platforms: ['darwin', 'linux'],
          dependencies: [],
          enabled: true,
        },
      }],
      ['checkpoint-create', {
        type: 'command',
        path: '/path/to/checkpoint-create.md',
        metadata: {
          id: 'checkpoint-create',
          name: 'Create Checkpoint',
          description: 'Create git checkpoint',
          category: 'git',
          platforms: ['darwin', 'linux'],
          dependencies: [],
          enabled: true,
        },
      }],
      ['git-commit', {
        type: 'command',
        path: '/path/to/git-commit.md',
        metadata: {
          id: 'git-commit',
          name: 'Git Commit',
          description: 'Smart git commit',
          category: 'git',
          platforms: ['darwin', 'linux'],
          dependencies: [],
          enabled: true,
        },
      }],
    ]),
  }),
  recommendComponents: vi.fn().mockImplementation((projectInfo, registry) => {
    return {
      essential: [],
      recommended: [
        {
          component: registry.components.get('typecheck'),
          reasons: ['TypeScript detected'],
        },
        {
          component: registry.components.get('eslint'),
          reasons: ['ESLint detected'],
        },
      ],
      optional: [
        {
          component: registry.components.get('checkpoint-create'),
          reasons: ['Git repository'],
        },
      ],
    };
  }),
  installComponents: vi.fn().mockResolvedValue(undefined),
}));

describe('Setup Command - Non-Interactive Flags', () => {
  const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const mockWriteFile = vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined);
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('--yes flag', () => {
    it('should skip all prompts with default options', async () => {
      const options: SetupOptions = {
        yes: true,
        quiet: true,
      };

      await setup(options);

      // Should not call any prompt functions
      const { select, checkbox, input, confirm } = await import('@inquirer/prompts');
      expect(select).not.toHaveBeenCalled();
      expect(checkbox).not.toHaveBeenCalled();
      expect(input).not.toHaveBeenCalled();
      expect(confirm).not.toHaveBeenCalled();

      // Should install components
      const { installComponents } = await import('../../cli/lib/index.js');
      expect(installComponents).toHaveBeenCalled();
    });

    it('should install both user and project by default', async () => {
      const options: SetupOptions = {
        yes: true,
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      expect(installComponents).toHaveBeenCalledTimes(2);
      
      // Check that both user and project installations happened
      const calls = (installComponents as any).mock.calls;
      expect(calls[0][1]).toBe('user');
      expect(calls[1][1]).toBe('project');
    });
  });

  describe('--commands flag', () => {
    it('should install only specified commands', async () => {
      const options: SetupOptions = {
        commands: 'checkpoint-create,git-commit',
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      expect(installComponents).toHaveBeenCalled();
      
      const installedComponents = (installComponents as any).mock.calls[0][0];
      const installedIds = installedComponents.map((c: any) => c.id);
      expect(installedIds).toContain('checkpoint-create');
      expect(installedIds).toContain('git-commit');
      expect(installedIds).not.toContain('typecheck');
      expect(installedIds).not.toContain('eslint');
    });

    it('should throw error for invalid command ID', async () => {
      const options: SetupOptions = {
        commands: 'invalid-command',
        quiet: true,
      };

      await expect(setup(options)).rejects.toThrow('Component not found: invalid-command');
    });
  });

  describe('--hooks flag', () => {
    it('should install only specified hooks', async () => {
      const options: SetupOptions = {
        hooks: 'typecheck,eslint',
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      expect(installComponents).toHaveBeenCalled();
      
      const installedComponents = (installComponents as any).mock.calls[0][0];
      const installedIds = installedComponents.map((c: any) => c.id);
      expect(installedIds).toContain('typecheck');
      expect(installedIds).toContain('eslint');
      expect(installedIds).not.toContain('checkpoint-create');
      expect(installedIds).not.toContain('git-commit');
    });

    it('should handle whitespace in comma-separated list', async () => {
      const options: SetupOptions = {
        hooks: 'typecheck, eslint',
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      const installedComponents = (installComponents as any).mock.calls[0][0];
      const installedIds = installedComponents.map((c: any) => c.id);
      expect(installedIds).toContain('typecheck');
      expect(installedIds).toContain('eslint');
    });
  });

  describe('--project flag', () => {
    it('should use specified project directory', async () => {
      const testDir = '/tmp/test-project';
      const mockPathExists = (await import('../../cli/lib/filesystem.js')).pathExists as any;
      mockPathExists.mockResolvedValue(true);
      vi.spyOn(fs, 'stat').mockResolvedValue({
        isDirectory: () => true,
      } as any);
      vi.spyOn(fs, 'access').mockResolvedValue(undefined);

      const options: SetupOptions = {
        yes: true,
        project: testDir,
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      const projectCall = (installComponents as any).mock.calls.find((call: any) => call[1] === 'project');
      expect(projectCall[2].customPath).toBe(testDir);
    });

    it('should throw error if project directory does not exist', async () => {
      const mockPathExists = (await import('../../cli/lib/filesystem.js')).pathExists as any;
      mockPathExists.mockResolvedValue(false);

      const options: SetupOptions = {
        yes: true,
        project: '/nonexistent/directory',
        quiet: true,
      };

      await expect(setup(options)).rejects.toThrow('Project directory does not exist: /nonexistent/directory');
    });
  });

  describe('--commands-only flag', () => {
    it('should install only to user directory', async () => {
      const options: SetupOptions = {
        commandsOnly: true,
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      expect(installComponents).toHaveBeenCalledTimes(1);
      expect((installComponents as any).mock.calls[0][1]).toBe('user');
    });

    it('should use default components with --commands-only', async () => {
      const options: SetupOptions = {
        commandsOnly: true,
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      const installedComponents = (installComponents as any).mock.calls[0][0];
      expect(installedComponents.length).toBeGreaterThan(0);
    });
  });

  describe('--dry-run flag (global)', () => {
    it('should be passed through to installComponents', async () => {
      const options: SetupOptions = {
        yes: true,
        dryRun: true,
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      const installOptions = (installComponents as any).mock.calls[0][2];
      expect(installOptions.dryRun).toBe(true);
    });
  });

  describe('Combined flags', () => {
    it('should work with --yes --project combination', async () => {
      const testDir = '/tmp/test-project';
      const mockPathExists = (await import('../../cli/lib/filesystem.js')).pathExists as any;
      mockPathExists.mockResolvedValue(true);
      vi.spyOn(fs, 'stat').mockResolvedValue({
        isDirectory: () => true,
      } as any);
      vi.spyOn(fs, 'access').mockResolvedValue(undefined);

      const options: SetupOptions = {
        yes: true,
        project: testDir,
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      expect(installComponents).toHaveBeenCalledTimes(2);
      
      const projectCall = (installComponents as any).mock.calls.find((call: any) => call[1] === 'project');
      expect(projectCall[2].customPath).toBe(testDir);
    });

    it('should work with --commands --hooks combination', async () => {
      const options: SetupOptions = {
        commands: 'checkpoint-create',
        hooks: 'typecheck',
        quiet: true,
      };

      await setup(options);

      const { installComponents } = await import('../../cli/lib/index.js');
      const installedComponents = (installComponents as any).mock.calls[0][0];
      const installedIds = installedComponents.map((c: any) => c.id);
      expect(installedIds).toContain('checkpoint-create');
      expect(installedIds).toContain('typecheck');
    });
  });

  describe('--quiet flag behavior', () => {
    it('should suppress output in non-interactive mode', async () => {
      const options: SetupOptions = {
        yes: true,
        quiet: true,
      };

      await setup(options);

      // Should have minimal console output
      expect(mockConsoleLog).toHaveBeenCalledTimes(0);
    });

    it('should still show errors even with --quiet', async () => {
      const options: SetupOptions = {
        commands: 'invalid-component',
        quiet: true,
      };

      await expect(setup(options)).rejects.toThrow();
      // Error should still be thrown, not suppressed
    });
  });
});