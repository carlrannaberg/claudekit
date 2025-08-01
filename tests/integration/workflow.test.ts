/**
 * Integration tests for complete ClaudeKit CLI workflows
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { init } from '../../cli/commands/init';
import { validate } from '../../cli/commands/validate';
import { loadConfig, saveConfig, configExists } from '../../cli/utils/config';
import { TestFileSystem, CommandTestHelper, ConsoleTestHelper } from '../utils/test-helpers';
import type { Config } from '../../cli/types/config';

// Mock external dependencies
vi.mock('ora', () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  })),
}));

vi.mock('chalk', () => {
  const createChainableInstance = (): Record<string, unknown> => {
    const chainable = ((text: string) => text) as unknown as Record<string, unknown>;
    const props = [
      'bold',
      'dim',
      'italic',
      'underline',
      'green',
      'red',
      'yellow',
      'blue',
      'gray',
      'cyan',
    ];

    props.forEach((prop) => {
      chainable[prop] = chainable;
    });

    return chainable;
  };

  const chalkInstance = createChainableInstance();

  return {
    default: chalkInstance,
  };
});

describe('CLI workflow integration', () => {
  let testFs: TestFileSystem;
  let tempDir: string;
  let restoreCwd: () => void;
  // let console: ReturnType<typeof ConsoleTestHelper.mockConsole>; // Removed unused variable
  let processExit: ReturnType<typeof CommandTestHelper.mockProcessExit>;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    tempDir = await testFs.createTempDir();
    restoreCwd = CommandTestHelper.mockProcessCwd(tempDir);
    ConsoleTestHelper.mockConsole();
    processExit = CommandTestHelper.mockProcessExit();
  });

  afterEach(async () => {
    await testFs.cleanup();
    restoreCwd();
    ConsoleTestHelper.restore();
    processExit.cleanup();
    vi.clearAllMocks();
  });

  describe('complete initialization workflow', () => {
    it('should complete full init -> validate -> config modification cycle', async () => {
      // Step 1: Fresh directory should fail validation
      await validate({});
      expect(processExit.exit).toHaveBeenCalledWith(1);

      // Reset mocks for next steps
      processExit.exit.mockClear();

      // Step 2: Initialize ClaudeKit
      await init({});
      expect(processExit.exit).not.toHaveBeenCalled();

      // Step 3: Validation should now pass
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();

      // Step 4: Verify config exists and is valid
      const exists = await configExists(tempDir);
      expect(exists).toBe(true);

      const config = await loadConfig(tempDir);
      expect(config).toHaveProperty('hooks');
      expect(config.hooks).toHaveProperty('PostToolUse');
      expect(config.hooks).toHaveProperty('Stop');
    });

    it('should handle config modification workflow', async () => {
      // Initialize
      await init({});

      // Load initial config
      const initialConfig = await loadConfig(tempDir);
      expect(initialConfig.hooks).toBeDefined();
      expect(Array.isArray(initialConfig.hooks.PostToolUse)).toBe(true);

      // Modify config
      const modifiedConfig: Config = {
        ...initialConfig,
        hooks: {
          ...initialConfig.hooks,
          PostToolUse: [
            ...(initialConfig.hooks.PostToolUse ?? []),
            {
              matcher: 'tools:Write AND file_paths:**/*.py',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/python-check.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      // Save modified config
      await saveConfig(tempDir, modifiedConfig);

      // Reload and verify
      const reloadedConfig = await loadConfig(tempDir);
      expect(reloadedConfig.hooks.PostToolUse).toBeDefined();
      expect(Array.isArray(reloadedConfig.hooks.PostToolUse)).toBe(true);
      expect((reloadedConfig.hooks.PostToolUse?.length ?? 0) > 0).toBe(true);

      // The python hook should be added if it exists
      const pythonHook = reloadedConfig.hooks.PostToolUse?.find((hook) =>
        hook.matcher.includes('**/*.py')
      );
      if (pythonHook !== undefined) {
        expect(pythonHook.hooks[0]?.command).toBe('.claude/hooks/python-check.sh');
      }

      // Validation should still pass
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();
    });

    it('should handle force reinitialize workflow', async () => {
      // Initial setup
      await init({});
      const originalConfig = await loadConfig(tempDir);

      // Add a custom hook file
      await testFs.createFileStructure(tempDir, {
        '.claude': {
          hooks: {
            'custom.sh': '#!/bin/bash\necho "Custom hook"',
          },
        },
      });

      // Verify custom hook exists
      await expect(
        fs.access(path.join(tempDir, '.claude', 'hooks', 'custom.sh'))
      ).resolves.not.toThrow();

      // Force reinitialize
      await init({ force: true });

      // Original structure should be recreated
      const newConfig = await loadConfig(tempDir);
      expect(newConfig).toEqual(originalConfig);

      // Custom hook should still exist (init doesn't clean up)
      await expect(
        fs.access(path.join(tempDir, '.claude', 'hooks', 'custom.sh'))
      ).resolves.not.toThrow();

      // Validation should pass
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();
    });
  });

  describe('error recovery workflows', () => {
    it('should handle corrupted config recovery', async () => {
      // Initialize normally
      await init({});

      // Corrupt the config file
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        '{ invalid json content }'
      );

      // Validation should fail
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).toHaveBeenCalledWith(1);

      // Should not be able to load config
      await expect(loadConfig(tempDir)).rejects.toThrow();

      // Force reinitialize to recover
      await init({ force: true });

      // Should be recovered
      const config = await loadConfig(tempDir);
      expect(config).toHaveProperty('hooks');

      // Validation should pass again
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();
    });

    it('should handle missing settings.json recovery', async () => {
      // Initialize normally
      await init({});

      // Remove settings.json to cause validation failure
      await fs.rm(path.join(tempDir, '.claude', 'settings.json'));

      // Validation should fail (missing settings.json)
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).toHaveBeenCalledWith(1);

      // Force reinitialize to recover
      await init({ force: true });

      // Settings file should be recreated
      await expect(
        fs.access(path.join(tempDir, '.claude', 'settings.json'))
      ).resolves.not.toThrow();

      // Validation should pass
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();
    });
  });

  describe('config validation edge cases', () => {
    it('should handle config with valid JSON but invalid structure', async () => {
      // Initialize normally
      await init({});

      // Create config with valid JSON but wrong structure
      const invalidStructureConfig = {
        hooks: 'this should be an object',
      };

      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(invalidStructureConfig, null, 2)
      );

      // Validation should still pass (it only checks JSON validity)
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();

      // But config loading should fail with schema validation
      await expect(loadConfig(tempDir)).rejects.toThrow('Invalid configuration');
    });

    it('should handle empty hooks in config', async () => {
      // Initialize normally
      await init({});

      // Create config with empty hooks
      const emptyHooksConfig: Config = {
        hooks: {},
      };

      await saveConfig(tempDir, emptyHooksConfig);

      // Should be able to load empty config
      const loadedConfig = await loadConfig(tempDir);
      expect(loadedConfig.hooks).toEqual({});

      // Validation should pass
      processExit.exit.mockClear();
      await validate({});
      expect(processExit.exit).not.toHaveBeenCalled();
    });
  });

  describe('file system edge cases', () => {
    it('should handle deeply nested directory structures', async () => {
      // Create deep directory structure
      await testFs.createFileStructure(tempDir, {
        very: {
          deeply: {
            nested: {
              project: {
                structure: {},
              },
            },
          },
        },
      });

      const deepDir = path.join(tempDir, 'very', 'deeply', 'nested', 'project', 'structure');
      const restoreDeepCwd = CommandTestHelper.mockProcessCwd(deepDir);

      try {
        // Initialize in deep directory
        await init({});

        // Verify structure was created
        await expect(
          fs.access(path.join(deepDir, '.claude', 'settings.json'))
        ).resolves.not.toThrow();
        await expect(fs.access(path.join(deepDir, '.claude', 'hooks'))).resolves.not.toThrow();

        // Validation should work
        processExit.exit.mockClear();
        await validate({});
        expect(processExit.exit).not.toHaveBeenCalled();
      } finally {
        restoreDeepCwd();
      }
    });

    it('should handle directories with special characters', async () => {
      // Create directory with special characters (that are filesystem-safe)
      const specialDir = await testFs.createTempDir('claudekit-test-special_chars-');
      const restoreSpecialCwd = CommandTestHelper.mockProcessCwd(specialDir);

      try {
        await init({});

        // Should work normally
        const exists = await configExists(specialDir);
        expect(exists).toBe(true);

        processExit.exit.mockClear();
        await validate({});
        expect(processExit.exit).not.toHaveBeenCalled();
      } finally {
        restoreSpecialCwd();
        await fs.rm(specialDir, { recursive: true, force: true });
      }
    });
  });
});
