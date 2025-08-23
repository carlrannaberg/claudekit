import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'node:path';
import { list } from '../../cli/commands/list.js';
import * as paths from '../../cli/lib/paths.js';
import type { HooksConfig } from '../../cli/types/config.js';

interface HookInfo {
  name: string;
  type: string;
  path: string;
  executable: boolean;
  size: number;
  modified: Date;
  source: string;
  events: string[];
}

interface ListResult {
  hooks?: HookInfo[];
}

describe('list hooks command', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalCwd: string;
  const createdDirs: string[] = [];

  // Clean up any stale test directories from previous runs
  beforeAll(async () => {
    const cwd = process.cwd();
    const entries = await fs.readdir(cwd);
    const staleTestDirs = entries.filter(entry => 
      entry.startsWith('test-temp-list-hooks-') || 
      entry.startsWith('test-temp-list-')
    );
    
    for (const dir of staleTestDirs) {
      try {
        await fs.remove(path.join(cwd, dir));
        console.log(`Cleaned up stale test directory: ${dir}`);
      } catch (error) {
        console.warn(`Failed to clean up stale directory ${dir}:`, error);
      }
    }
  });

  beforeEach(async () => {
    // Store original cwd
    originalCwd = process.cwd();

    // Create temp directory with unique name
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    tempDir = path.join(process.cwd(), `test-temp-list-hooks-${timestamp}-${random}`);
    createdDirs.push(tempDir);
    
    await fs.ensureDir(tempDir);
    await fs.ensureDir(path.join(tempDir, '.claude'));
    await fs.ensureDir(path.join(tempDir, 'user-claude'));

    // Change to temp directory
    process.chdir(tempDir);

    // Mock the path functions to use our test directories
    vi.spyOn(paths, 'getProjectClaudeDirectory').mockReturnValue(path.join(tempDir, '.claude'));
    vi.spyOn(paths, 'getUserClaudeDirectory').mockReturnValue(path.join(tempDir, 'user-claude'));
    vi.spyOn(paths, 'findComponentsDirectory').mockResolvedValue(path.join(tempDir, 'src'));

    // Spy on console.log to capture output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Always restore original cwd first
    try {
      process.chdir(originalCwd);
    } catch (error) {
      console.warn('Failed to restore working directory:', error);
    }

    // Clean up temp directory with retries
    if (tempDir) {
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.remove(tempDir);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(`Failed to remove temp directory ${tempDir} after 3 attempts:`, error);
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }

    // Restore console.log
    consoleLogSpy?.mockRestore();

    // Clear all mocks
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // Final cleanup to ensure all directories are removed
  afterAll(async () => {
    for (const dir of createdDirs) {
      try {
        if (await fs.pathExists(dir)) {
          await fs.remove(dir);
        }
      } catch (error) {
        console.warn(`Failed to clean up directory in afterAll: ${dir}`, error);
      }
    }
    createdDirs.length = 0;
  });

  describe('hooks with no configuration', () => {
    it('should show all embedded hooks as [not installed] when no configuration exists', async () => {
      // Purpose: Verify that when no hook configuration is present, all embedded hooks
      // are listed with source as 'not installed' and no events configured.

      // Run list command (no configuration files exist)
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      expect(jsonOutput).toBeDefined();

      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Verify hooks array exists and contains embedded hooks
      expect(result.hooks).toBeDefined();
      expect(Array.isArray(result.hooks)).toBe(true);
      expect(result.hooks?.length ?? 0).toBeGreaterThan(0);

      // All hooks should be not installed (not configured)
      for (const hook of result.hooks ?? []) {
        expect(hook.source).toBe('not installed');
        expect(hook.events).toEqual([]);
        expect(hook.type).toBe('embedded-hook');
        expect(hook.executable).toBe(true);
        expect(hook.path).toMatch(/^embedded:/);
      }
    });
  });

  describe('hooks with project configuration', () => {
    it('should show configured hooks with project source and correct events', async () => {
      // Purpose: Verify that hooks configured in project settings show correct source
      // and events, while unconfigured hooks remain as not installed.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write|Edit|MultiEdit',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
                {
                  type: 'command',
                  command: 'claudekit-hooks run lint-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
          Stop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find configured hooks
      const hooks = result.hooks ?? [];
      const typecheckHook = hooks.find((h) => h.name === 'typecheck-changed');
      const lintHook = hooks.find((h) => h.name === 'lint-changed');
      const checkpointHook = hooks.find((h) => h.name === 'create-checkpoint');

      // Verify configured hooks
      expect(typecheckHook).toBeDefined();
      expect(typecheckHook?.source).toBe('project');
      expect(typecheckHook?.events).toEqual(['PostToolUse']);

      expect(lintHook).toBeDefined();
      expect(lintHook?.source).toBe('project');
      expect(lintHook?.events).toEqual(['PostToolUse']);

      expect(checkpointHook).toBeDefined();
      expect(checkpointHook?.source).toBe('project');
      expect(checkpointHook?.events).toEqual(['Stop']);

      // Verify there are still some not installed hooks
      const notInstalledHooks = hooks.filter((h) => h.source === 'not installed');
      expect(notInstalledHooks.length).toBeGreaterThan(0);
    });

    it('should aggregate events when same hook is configured for multiple events', async () => {
      // Purpose: Ensure that when the same hook is configured for different events,
      // the events are properly aggregated into a single entry.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
          Stop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find the typecheck hook
      const hooks = result.hooks ?? [];
      const typecheckHooks = hooks.filter((h) => h.name === 'typecheck-changed');

      // Should only have one entry with both events
      expect(typecheckHooks).toHaveLength(1);
      expect(typecheckHooks[0]?.source).toBe('project');
      expect(typecheckHooks[0]?.events).toEqual(expect.arrayContaining(['PostToolUse', 'Stop']));
      expect(typecheckHooks[0]?.events).toHaveLength(2);
    });

    it('should show SubagentStop events correctly', async () => {
      // Purpose: Verify that hooks configured for SubagentStop events are displayed
      // correctly with SubagentStop in the events list.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          SubagentStop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
                {
                  type: 'command',
                  command: 'claudekit-hooks run check-todos',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find configured hooks
      const hooks = result.hooks ?? [];
      const checkpointHook = hooks.find((h) => h.name === 'create-checkpoint');
      const todosHook = hooks.find((h) => h.name === 'check-todos');

      // Verify SubagentStop hooks
      expect(checkpointHook).toBeDefined();
      expect(checkpointHook?.source).toBe('project');
      expect(checkpointHook?.events).toEqual(['SubagentStop']);

      expect(todosHook).toBeDefined();
      expect(todosHook?.source).toBe('project');
      expect(todosHook?.events).toEqual(['SubagentStop']);
    });

    it('should aggregate events including SubagentStop when same hook is configured for multiple events', async () => {
      // Purpose: Verify that when a hook is configured for both Stop and SubagentStop,
      // both events are properly aggregated.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
          SubagentStop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find the checkpoint hook
      const hooks = result.hooks ?? [];
      const checkpointHooks = hooks.filter((h) => h.name === 'create-checkpoint');

      // Should only have one entry with both events
      expect(checkpointHooks).toHaveLength(1);
      expect(checkpointHooks[0]?.source).toBe('project');
      expect(checkpointHooks[0]?.events).toEqual(expect.arrayContaining(['Stop', 'SubagentStop']));
      expect(checkpointHooks[0]?.events).toHaveLength(2);
    });
  });

  describe('hooks with user configuration', () => {
    it('should show configured hooks with user source when no project config exists', async () => {
      // Purpose: Verify that hooks configured in user settings show correct source
      // when no project configuration is present.

      const userConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run lint-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write user configuration
      await fs.writeFile(
        path.join(tempDir, 'user-claude', 'settings.json'),
        JSON.stringify(userConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find configured hook
      const hooks = result.hooks ?? [];
      const lintHook = hooks.find((h) => h.name === 'lint-changed');

      // Verify user configuration
      expect(lintHook).toBeDefined();
      expect(lintHook?.source).toBe('user');
      expect(lintHook?.events).toEqual(['PostToolUse']);
    });

    it('should show SubagentStop-only hooks with user source', async () => {
      // Purpose: Verify that hooks configured only for SubagentStop in user settings
      // are displayed correctly with SubagentStop event and user source.

      const userConfig: { hooks: HooksConfig } = {
        hooks: {
          SubagentStop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write user configuration
      await fs.writeFile(
        path.join(tempDir, 'user-claude', 'settings.json'),
        JSON.stringify(userConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find configured hook
      const hooks = result.hooks ?? [];
      const checkpointHook = hooks.find((h) => h.name === 'create-checkpoint');

      // Verify SubagentStop user configuration
      expect(checkpointHook).toBeDefined();
      expect(checkpointHook?.source).toBe('user');
      expect(checkpointHook?.events).toEqual(['SubagentStop']);
    });
  });

  describe('hooks with both project and user configuration', () => {
    it('should prioritize project configuration over user configuration', async () => {
      // Purpose: Verify that when both project and user configurations exist,
      // project configuration takes precedence (project source is maintained).

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      const userConfig: { hooks: HooksConfig } = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
                {
                  type: 'command',
                  command: 'claudekit-hooks run lint-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write both configurations
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );
      await fs.writeFile(
        path.join(tempDir, 'user-claude', 'settings.json'),
        JSON.stringify(userConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find hooks
      const hooks = result.hooks ?? [];
      const typecheckHook = hooks.find((h) => h.name === 'typecheck-changed');
      const lintHook = hooks.find((h) => h.name === 'lint-changed');

      // typecheck-changed should have project source (configured in both)
      expect(typecheckHook).toBeDefined();
      expect(typecheckHook?.source).toBe('project'); // Project takes precedence
      expect(typecheckHook?.events).toEqual(expect.arrayContaining(['PostToolUse', 'Stop']));
      expect(typecheckHook?.events).toHaveLength(2);

      // lint-changed should have user source (only in user config)
      expect(lintHook).toBeDefined();
      expect(lintHook?.source).toBe('user');
      expect(lintHook?.events).toEqual(['Stop']);
    });

    it('should aggregate events correctly when project has Stop and user has SubagentStop', async () => {
      // Purpose: Verify that when project configuration has Stop and user configuration
      // has SubagentStop for the same hook, both events are aggregated correctly.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      const userConfig: { hooks: HooksConfig } = {
        hooks: {
          SubagentStop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write both configurations
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );
      await fs.writeFile(
        path.join(tempDir, 'user-claude', 'settings.json'),
        JSON.stringify(userConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Find the checkpoint hook
      const hooks = result.hooks ?? [];
      const checkpointHooks = hooks.filter((h) => h.name === 'create-checkpoint');

      // Should only have one entry with both events
      expect(checkpointHooks).toHaveLength(1);
      expect(checkpointHooks[0]?.source).toBe('project'); // Project takes precedence for source
      expect(checkpointHooks[0]?.events).toEqual(expect.arrayContaining(['Stop', 'SubagentStop']));
      expect(checkpointHooks[0]?.events).toHaveLength(2);
    });
  });

  describe('filter functionality', () => {
    it('should filter hooks by name using regex pattern', async () => {
      // Purpose: Verify that the filter option works correctly to show only hooks
      // matching the specified regex pattern.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
                {
                  type: 'command',
                  command: 'claudekit-hooks run lint-changed',
                  enabled: true,
                  retries: 0,
                },
                {
                  type: 'command',
                  command: 'claudekit-hooks run test-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command with filter
      await list('hooks', { format: 'json', filter: 'check' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Should only show hooks matching 'check' pattern
      const hooks = result.hooks ?? [];
      const configuredHooks = hooks.filter((h) => h.source !== 'not installed');

      expect(configuredHooks).toHaveLength(1);
      expect(configuredHooks[0]?.name).toBe('typecheck-changed');
      expect(configuredHooks[0]?.source).toBe('project');
    });

    it('should show no results when filter matches nothing', async () => {
      // Purpose: Verify that when filter pattern matches no hooks, an empty
      // result is returned (not an error).

      // Run list command with filter that won't match any hooks
      await list('hooks', { format: 'json', filter: 'xyz123nonexistent' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Should have empty hooks array
      expect(result.hooks).toBeDefined();
      expect(result.hooks).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle malformed project configuration gracefully', async () => {
      // Purpose: Verify that malformed configuration files don't crash the command
      // and fallback to showing hooks as not installed.

      // Write malformed JSON
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        '{ "hooks": { "invalid": malformed json } }'
      );

      // Run list command (should not throw)
      await expect(list('hooks', { format: 'json' })).resolves.not.toThrow();

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Should still show hooks as not installed
      expect(result.hooks).toBeDefined();
      expect(result.hooks?.length ?? 0).toBeGreaterThan(0);
      expect(result.hooks?.every((h) => h.source === 'not installed') ?? false).toBe(true);
    });

    it('should handle missing configuration files gracefully', async () => {
      // Purpose: Verify that missing configuration files are handled gracefully
      // without errors, showing all hooks as not installed.

      // Ensure no configuration files exist (they don't by default)

      // Run list command (should not throw)
      await expect(list('hooks', { format: 'json' })).resolves.not.toThrow();

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Should show hooks as not installed
      expect(result.hooks).toBeDefined();
      expect(result.hooks?.length ?? 0).toBeGreaterThan(0);
      expect(result.hooks?.every((h) => h.source === 'not installed') ?? false).toBe(true);
    });

    it('should handle empty hook configurations', async () => {
      // Purpose: Verify that empty hook configurations are handled correctly,
      // showing all hooks as not installed.

      const emptyConfig = { hooks: {} };

      // Write empty configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(emptyConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Should show hooks as not installed
      expect(result.hooks).toBeDefined();
      expect(result.hooks?.length ?? 0).toBeGreaterThan(0);
      expect(result.hooks?.every((h) => h.source === 'not installed') ?? false).toBe(true);
    });

    it('should handle hooks with invalid command format', async () => {
      // Purpose: Verify that hooks with invalid command formats are ignored
      // and don't cause errors.

      const invalidConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
                { type: 'command', command: 'invalid-command-format', enabled: true, retries: 0 },
                {
                  type: 'command',
                  command: 'claudekit-hooks invalid another-hook',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write configuration with invalid commands
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(invalidConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Should only show the valid hook as configured
      const hooks = result.hooks ?? [];
      const configuredHooks = hooks.filter((h) => h.source === 'project');

      expect(configuredHooks).toHaveLength(1);
      expect(configuredHooks[0]?.name).toBe('typecheck-changed');
    });
  });

  describe('JSON output format', () => {
    it('should produce valid JSON output with correct structure', async () => {
      // Purpose: Verify that the JSON output format is valid and contains
      // all expected fields with correct types.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command
      await list('hooks', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];

      // Should be valid JSON
      expect(() => JSON.parse(jsonOutput as string)).not.toThrow();

      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Verify structure
      expect(result).toHaveProperty('hooks');
      expect(Array.isArray(result.hooks)).toBe(true);

      // Verify each hook has expected properties
      for (const hook of result.hooks ?? []) {
        expect(hook).toHaveProperty('name');
        expect(hook).toHaveProperty('type');
        expect(hook).toHaveProperty('path');
        expect(hook).toHaveProperty('executable');
        expect(hook).toHaveProperty('size');
        expect(hook).toHaveProperty('modified');
        expect(hook).toHaveProperty('source');
        expect(hook).toHaveProperty('events');

        // Verify types
        expect(typeof hook.name).toBe('string');
        expect(typeof hook.type).toBe('string');
        expect(typeof hook.path).toBe('string');
        expect(typeof hook.executable).toBe('boolean');
        expect(typeof hook.size).toBe('number');
        // Note: Date objects become strings when JSON.stringify is called
        expect(typeof hook.modified).toBe('string');
        expect(typeof hook.source).toBe('string');
        expect(Array.isArray(hook.events)).toBe(true);
      }
    });

    it('should produce valid table output including SubagentStop events', async () => {
      // Purpose: Verify that table output format correctly displays SubagentStop events
      // along with other events in a readable format.

      const projectConfig: { hooks: HooksConfig } = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run typecheck-changed',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
          SubagentStop: [
            {
              matcher: '*',
              enabled: true,
              hooks: [
                {
                  type: 'command',
                  command: 'claudekit-hooks run create-checkpoint',
                  enabled: true,
                  retries: 0,
                },
              ],
            },
          ],
        },
      };

      // Write project configuration
      await fs.writeFile(
        path.join(tempDir, '.claude', 'settings.json'),
        JSON.stringify(projectConfig, null, 2)
      );

      // Run list command with table format (default)
      await list('hooks', {});

      // Verify table output was generated
      expect(consoleLogSpy).toHaveBeenCalled();

      // Get all console.log calls and find table-like output
      const calls = consoleLogSpy.mock.calls.map((call) => call[0]).join('\n');

      // Should contain hook names
      expect(calls).toContain('typecheck-changed');
      expect(calls).toContain('create-checkpoint');

      // Should indicate project source
      expect(calls).toContain('project');

      // Should show events (may be abbreviated in table format)
      expect(calls).toMatch(/PostToolUse|SubagentStop/);
    });
  });
});
