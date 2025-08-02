/**
 * Tests for the init command
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Ora } from 'ora';
import { init } from '../../cli/commands/init';
import {
  TestFileSystem,
  TestAssertions,
  CommandTestHelper,
  ConsoleTestHelper,
} from '../utils/test-helpers';

// Mock external dependencies inline
vi.mock('ora', () => {
  const mockSpinner = {
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
    text: '',
    color: 'cyan',
    spinner: 'dots',
  };

  return {
    default: vi.fn(() => mockSpinner),
  };
});

vi.mock('chalk', () => ({
  default: {
    red: vi.fn((text: string) => text),
    green: vi.fn((text: string) => text),
    blue: vi.fn((text: string) => text),
    yellow: vi.fn((text: string) => text),
    cyan: vi.fn((text: string) => text),
    magenta: vi.fn((text: string) => text),
    white: vi.fn((text: string) => text),
    gray: vi.fn((text: string) => text),
    bold: vi.fn((text: string) => text),
    dim: vi.fn((text: string) => text),
    underline: vi.fn((text: string) => text),
    strikethrough: vi.fn((text: string) => text),
    inverse: vi.fn((text: string) => text),
    bgRed: vi.fn((text: string) => text),
    bgGreen: vi.fn((text: string) => text),
    bgBlue: vi.fn((text: string) => text),
    bgYellow: vi.fn((text: string) => text),
    bgCyan: vi.fn((text: string) => text),
    bgMagenta: vi.fn((text: string) => text),
    bgWhite: vi.fn((text: string) => text),
    enabled: true,
    level: 3,
  },
}));

// Mock project detection
vi.mock('../../cli/lib/project-detection', () => ({
  detectProjectContext: vi.fn().mockResolvedValue({
    hasTypeScript: true,
    hasESLint: true,
    hasPrettier: false,
    hasJest: false,
    hasVitest: true,
    packageManager: 'npm',
    projectPath: '/test/project',
    isGitRepository: true,
    hasClaudeConfig: false,
  }),
}));

// Mock components
vi.mock('../../cli/lib/components', () => ({
  discoverComponents: vi.fn().mockResolvedValue({
    components: new Map(),
    dependencies: new Map(),
    dependents: new Map(),
    categories: new Map(),
    lastScan: new Date(),
    cacheValid: true,
  }),
  recommendComponents: vi.fn().mockResolvedValue({
    essential: [
      {
        component: {
          type: 'hook',
          path: '/path/to/typecheck.sh',
          metadata: { id: 'typecheck-changed' },
        },
      },
      {
        component: {
          type: 'hook',
          path: '/path/to/eslint.sh',
          metadata: { id: 'lint-changed' },
        },
      },
      {
        component: {
          type: 'hook',
          path: '/path/to/auto-checkpoint.sh',
          metadata: { id: 'create-checkpoint' },
        },
      },
    ],
    recommended: [
      {
        component: {
          type: 'hook',
          path: '/path/to/validate-todo-completion.sh',
          metadata: { id: 'check-todos', category: 'validation' },
        },
      },
    ],
    optional: [],
  }),
  formatRecommendationSummary: vi.fn().mockReturnValue('Mock recommendations summary'),
}));

describe('init command', () => {
  let testFs: TestFileSystem;
  let tempDir: string;
  let restoreCwd: () => void;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    tempDir = await testFs.createTempDir();
    restoreCwd = CommandTestHelper.mockProcessCwd(tempDir);
  });

  afterEach(async () => {
    await testFs.cleanup();
    restoreCwd();
    vi.clearAllMocks();
  });

  describe('successful initialization', () => {
    it('should create .claude directory structure', async () => {
      await init({});

      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude'));
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'settings.json'));
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'hooks'));
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'commands'));
    });

    it('should create valid default settings.json', async () => {
      await init({});

      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      const settings = (await testFs.readJson(settingsPath)) as Record<string, unknown>;

      expect(settings).toHaveProperty('hooks');
      expect(settings['hooks']).toHaveProperty('PostToolUse');
      expect(settings['hooks']).toHaveProperty('Stop');
      expect(Array.isArray((settings['hooks'] as Record<string, unknown>)['PostToolUse'])).toBe(
        true
      );
      expect(Array.isArray((settings['hooks'] as Record<string, unknown>)['Stop'])).toBe(true);
    });

    it('should create settings with TypeScript and ESLint hooks', async () => {
      await init({});

      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      const settings = (await testFs.readJson(settingsPath)) as Record<string, unknown>;

      const postToolUseHooks = (settings['hooks'] as Record<string, unknown>)[
        'PostToolUse'
      ] as unknown[];

      // Check for TypeScript hook
      const tsHook = postToolUseHooks.find((hook: unknown) =>
        (hook as { matcher: string }).matcher.includes('**/*.ts')
      );
      expect(tsHook).toBeDefined();
      if (tsHook !== undefined) {
        const typedTsHook = tsHook as { hooks: Array<{ command: string }> };
        expect(typedTsHook.hooks[0]?.command).toBe('claudekit-hooks run typecheck-changed');
      }

      // Check for ESLint hook
      const eslintHook = postToolUseHooks.find((hook: unknown) =>
        (hook as { matcher: string }).matcher.includes('**/*.{js,ts,tsx,jsx}')
      );
      expect(eslintHook).toBeDefined();
      if (eslintHook !== undefined) {
        const typedEslintHook = eslintHook as { hooks: Array<{ command: string }> };
        expect(typedEslintHook.hooks[0]?.command).toBe('claudekit-hooks run lint-changed');
      }
    });

    it('should create settings with Stop hooks', async () => {
      await init({});

      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      const settings = (await testFs.readJson(settingsPath)) as Record<string, unknown>;

      const stopHooks = (settings['hooks'] as Record<string, unknown>)['Stop'] as unknown[];
      expect(stopHooks).toHaveLength(1);

      const stopHook = stopHooks[0] as { matcher: string; hooks: Array<{ command: string }> };
      expect(stopHook.matcher).toBe('*');
      expect(stopHook.hooks).toHaveLength(2);

      const commands = stopHook.hooks.map((h) => h.command);
      expect(commands).toContain('claudekit-hooks run create-checkpoint');
      expect(commands).toContain('claudekit-hooks run check-todos');
    });

    it('should format settings.json with proper indentation', async () => {
      await init({});

      const settingsPath = path.join(tempDir, '.claude', 'settings.json');
      const content = await testFs.readFile(settingsPath);

      // Check that JSON is properly formatted with 2-space indentation
      expect(content).toContain('  "hooks": {');
      expect(content).toContain('    "PostToolUse": [');
    });
  });

  describe('force option', () => {
    it('should fail when .claude directory exists without force', async () => {
      // Create existing .claude directory
      await fs.mkdir(path.join(tempDir, '.claude'), { recursive: true });

      ConsoleTestHelper.mockConsole();

      await init({});

      // Should not overwrite existing directory
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude'));

      // Should not create settings.json
      await TestAssertions.expectFileNotToExist(path.join(tempDir, '.claude', 'settings.json'));

      ConsoleTestHelper.restore();
    });

    it('should overwrite existing directory with force option', async () => {
      // Create existing .claude directory with some content
      const claudeDir = path.join(tempDir, '.claude');
      await fs.mkdir(claudeDir, { recursive: true });
      await fs.writeFile(path.join(claudeDir, 'existing.txt'), 'existing content');

      await init({ force: true });

      // Should create new structure
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'settings.json'));
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'hooks'));
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'commands'));

      // Old file should still exist (init doesn't clean up)
      await TestAssertions.expectFileToExist(path.join(tempDir, '.claude', 'existing.txt'));
    });
  });

  describe('error handling', () => {
    it('should handle permission errors gracefully', async () => {
      // Mock fs.mkdir to throw permission error
      const mkdirSpy = vi
        .spyOn(fs, 'mkdir')
        .mockRejectedValueOnce(
          Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' })
        );

      await expect(init({})).rejects.toThrow('permission denied');

      mkdirSpy.mockRestore();
    });

    it('should handle write errors gracefully', async () => {
      // Mock fs.writeFile to throw error
      const writeFileSpy = vi
        .spyOn(fs, 'writeFile')
        .mockRejectedValueOnce(new Error('ENOSPC: no space left on device'));

      await expect(init({})).rejects.toThrow('no space left on device');

      writeFileSpy.mockRestore();
    });
  });

  describe('ora spinner integration', () => {
    it('should start and succeed spinner on successful init', async () => {
      const ora = await import('ora');
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
      };
      vi.mocked(ora.default).mockReturnValue(mockSpinner as unknown as Ora);

      await init({});

      expect(ora.default).toHaveBeenCalledWith('Initializing claudekit...');
      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.succeed).toHaveBeenCalled();
      expect(mockSpinner.fail).not.toHaveBeenCalled();
    });

    it('should fail spinner on error', async () => {
      const ora = await import('ora');
      const mockSpinner = {
        start: vi.fn().mockReturnThis(),
        succeed: vi.fn().mockReturnThis(),
        fail: vi.fn().mockReturnThis(),
      };
      vi.mocked(ora.default).mockReturnValue(mockSpinner as unknown as Ora);

      // Mock mkdir to throw error
      const mkdirSpy = vi.spyOn(fs, 'mkdir').mockRejectedValueOnce(new Error('Mock error'));

      await expect(init({})).rejects.toThrow();

      expect(mockSpinner.start).toHaveBeenCalled();
      expect(mockSpinner.fail).toHaveBeenCalledWith('Failed to initialize claudekit');
      expect(mockSpinner.succeed).not.toHaveBeenCalled();

      mkdirSpy.mockRestore();
    });
  });
});
