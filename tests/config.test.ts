import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadConfig,
  saveConfig,
  configExists,
  mergeConfigs,
  loadMergedConfig,
  saveMergedConfig,
  resolveHookPaths,
} from '../cli/utils/config';
import type { Config } from '../cli/types/config';
import { HooksConfigSchema, HookEventSchema } from '../cli/types/config';

describe('Config utilities', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for tests
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'claudekit-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('configExists', () => {
    it('should return false when config does not exist', async () => {
      const exists = await configExists(tempDir);
      expect(exists).toBe(false);
    });

    it('should return true when config exists', async () => {
      const configDir = path.join(tempDir, '.claude');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'settings.json'), '{}');

      const exists = await configExists(tempDir);
      expect(exists).toBe(true);
    });
  });

  describe('saveConfig', () => {
    it('should save valid config', async () => {
      const config: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      await saveConfig(tempDir, config);

      const savedContent = await fs.readFile(
        path.join(tempDir, '.claude', 'settings.json'),
        'utf-8'
      );
      const savedConfig = JSON.parse(savedContent);

      expect(savedConfig).toEqual(config);
    });

    it('should create directory if it does not exist', async () => {
      const config: Config = { hooks: {} };

      await saveConfig(tempDir, config);

      const exists = await configExists(tempDir);
      expect(exists).toBe(true);
    });
  });

  describe('loadConfig', () => {
    it('should load valid config', async () => {
      const config: Config = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/auto-checkpoint.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      const configDir = path.join(tempDir, '.claude');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'settings.json'), JSON.stringify(config));

      const loadedConfig = await loadConfig(tempDir);
      expect(loadedConfig).toEqual(config);
    });

    it('should throw error for invalid JSON', async () => {
      const configDir = path.join(tempDir, '.claude');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(path.join(configDir, 'settings.json'), 'invalid json');

      await expect(loadConfig(tempDir)).rejects.toThrow('Invalid JSON');
    });

    it('should throw error for invalid config schema', async () => {
      const configDir = path.join(tempDir, '.claude');
      await fs.mkdir(configDir, { recursive: true });
      await fs.writeFile(
        path.join(configDir, 'settings.json'),
        JSON.stringify({ hooks: 'invalid' })
      );

      await expect(loadConfig(tempDir)).rejects.toThrow('Invalid configuration');
    });
  });

  describe('resolveHookPaths', () => {
    it('should convert relative paths to absolute paths', () => {
      const hooksConfig = {
        PostToolUse: [
          {
            matcher: 'tools:Write',
            hooks: [
              {
                type: 'command' as const,
                command: '.claude/hooks/typecheck.sh',
                enabled: true,
                retries: 0,
              },
            ],
            enabled: true,
          },
        ],
      };

      const resolved = resolveHookPaths(hooksConfig, tempDir);
      const expectedPath = path.resolve(tempDir, '.claude/hooks/typecheck.sh');

      expect(resolved.PostToolUse?.[0]?.hooks[0]?.command).toBe(expectedPath);
    });

    it('should preserve absolute paths', () => {
      const absolutePath = '/absolute/path/to/hook.sh';
      const hooksConfig = {
        Stop: [
          {
            matcher: '*',
            hooks: [{ type: 'command' as const, command: absolutePath, enabled: true, retries: 0 }],
            enabled: true,
          },
        ],
      };

      const resolved = resolveHookPaths(hooksConfig, tempDir);

      expect(resolved.Stop?.[0]?.hooks[0]?.command).toBe(absolutePath);
    });
  });

  describe('mergeConfigs', () => {
    it('should merge configurations without duplicates', async () => {
      const existingConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      const newConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*',
              hooks: [
                { type: 'command', command: '.claude/hooks/eslint.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
          Stop: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/auto-checkpoint.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      const merged = await mergeConfigs(newConfig, existingConfig, tempDir);

      expect(merged.hooks.PostToolUse).toHaveLength(2);
      expect(merged.hooks.Stop).toHaveLength(1);
    });

    it('should deduplicate identical hook configurations', async () => {
      const existingConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      const duplicateConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      const merged = await mergeConfigs(duplicateConfig, existingConfig, tempDir);

      expect(merged.hooks.PostToolUse).toHaveLength(1);
    });

    it('should handle complex hook matcher patterns', async () => {
      const existingConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
                { type: 'command', command: '.claude/hooks/format.sh', enabled: true, retries: 1 },
              ],
              description: 'TypeScript validation',
              enabled: true,
            },
          ],
        },
      };

      const newConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.{js,jsx}',
              hooks: [
                { type: 'command', command: '.claude/hooks/eslint.sh', enabled: true, retries: 0 },
              ],
              description: 'JavaScript validation',
              enabled: true,
            },
          ],
        },
      };

      const merged = await mergeConfigs(newConfig, existingConfig, tempDir);

      expect(merged.hooks.PostToolUse).toHaveLength(2);
      expect(merged.hooks.PostToolUse?.[0]?.description).toBe('TypeScript validation');
      expect(merged.hooks.PostToolUse?.[1]?.description).toBe('JavaScript validation');
    });

    it('should preserve existing configuration properties', async () => {
      const existingConfig: Config = {
        hooks: {},
        environment: { NODE_ENV: 'test' },
        version: '1.0.0',
      };

      const newConfig: Config = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              hooks: [
                { type: 'command', command: '.claude/hooks/cleanup.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
        },
      };

      const merged = await mergeConfigs(newConfig, existingConfig, tempDir);

      expect(merged.environment).toEqual({ NODE_ENV: 'test' });
      expect(merged.version).toBe('1.0.0');
      expect(merged.hooks.Stop).toHaveLength(1);
    });
  });

  describe('loadMergedConfig', () => {
    it('should load and merge multiple configurations', async () => {
      // Create initial config
      const initialConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      await saveConfig(tempDir, initialConfig);

      // Additional configs to merge
      const additionalConfigs: Config[] = [
        {
          hooks: {
            Stop: [
              {
                matcher: '*',
                enabled: true,
                hooks: [
                  {
                    type: 'command',
                    command: '.claude/hooks/cleanup.sh',
                    enabled: true,
                    retries: 0,
                  },
                ],
              },
            ],
          },
        },
        {
          hooks: {
            PostToolUse: [
              {
                matcher: 'tools:Edit',
                hooks: [
                  {
                    type: 'command',
                    command: '.claude/hooks/format.sh',
                    enabled: true,
                    retries: 0,
                  },
                ],
                enabled: true,
              },
            ],
          },
        },
      ];

      const merged = await loadMergedConfig(tempDir, additionalConfigs);

      expect(merged.hooks.PostToolUse).toHaveLength(2);
      expect(merged.hooks.Stop).toHaveLength(1);
    });

    it('should work with no existing config file', async () => {
      const additionalConfigs: Config[] = [
        {
          hooks: {
            PostToolUse: [
              {
                matcher: 'tools:Write',
                enabled: true,
                hooks: [
                  {
                    type: 'command',
                    command: '.claude/hooks/validate.sh',
                    enabled: true,
                    retries: 0,
                  },
                ],
              },
            ],
          },
        },
      ];

      const merged = await loadMergedConfig(tempDir, additionalConfigs);

      expect(merged.hooks.PostToolUse).toHaveLength(1);
    });
  });

  describe('saveMergedConfig', () => {
    it('should save merged configuration to file', async () => {
      // Create initial config
      const initialConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      await saveConfig(tempDir, initialConfig);

      // New config to merge
      const newConfig: Config = {
        hooks: {
          Stop: [
            {
              matcher: '*',
              hooks: [
                { type: 'command', command: '.claude/hooks/cleanup.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
        },
      };

      const result = await saveMergedConfig(tempDir, newConfig);

      // Verify the result
      expect(result.hooks.PostToolUse).toHaveLength(1);
      expect(result.hooks.Stop).toHaveLength(1);

      // Verify it was saved to file
      const savedConfig = await loadConfig(tempDir);
      expect(savedConfig).toEqual(result);
    });

    it('should format JSON output with 2-space indentation', async () => {
      const config: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write',
              hooks: [
                { type: 'command', command: '.claude/hooks/test.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
        },
      };

      await saveMergedConfig(tempDir, config);

      const savedContent = await fs.readFile(
        path.join(tempDir, '.claude', 'settings.json'),
        'utf-8'
      );

      // Check for 2-space indentation
      expect(savedContent).toContain('  "hooks"');
      expect(savedContent).toContain('    "PostToolUse"');
      expect(savedContent).toContain('      {');
      // Should end with newline
      expect(savedContent.endsWith('\n')).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complex real-world configuration merging', async () => {
      // Simulate existing project config
      const existingConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/typecheck.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
            {
              matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}',
              hooks: [
                { type: 'command', command: '.claude/hooks/eslint.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
          Stop: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/auto-checkpoint.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
        environment: {
          NODE_ENV: 'development',
          DEBUG: 'true',
        },
      };

      await saveConfig(tempDir, existingConfig);

      // Simulate new config being installed
      const newConfig: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'Write,Edit,MultiEdit',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/run-related-tests.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
          Stop: [
            {
              matcher: '*',
              hooks: [
                {
                  type: 'command',
                  command: '.claude/hooks/validate-todo-completion.sh',
                  enabled: true,
                  retries: 0,
                },
              ],
              enabled: true,
            },
          ],
        },
      };

      const merged = await saveMergedConfig(tempDir, newConfig);

      // Verify all hooks were preserved and new ones added
      expect(merged.hooks.PostToolUse).toHaveLength(3);
      expect(merged.hooks.Stop).toHaveLength(2);

      // Verify environment variables were preserved
      expect(merged.environment).toEqual({
        NODE_ENV: 'development',
        DEBUG: 'true',
      });

      // Verify specific hooks exist
      const postToolUseHooks = merged.hooks.PostToolUse ?? [];
      expect(
        postToolUseHooks.some((h) => h.hooks.some((hook) => hook.command.includes('typecheck.sh')))
      ).toBe(true);
      expect(
        postToolUseHooks.some((h) => h.hooks.some((hook) => hook.command.includes('eslint.sh')))
      ).toBe(true);
      expect(
        postToolUseHooks.some((h) =>
          h.hooks.some((hook) => hook.command.includes('run-related-tests.sh'))
        )
      ).toBe(true);

      const stopHooks = merged.hooks.Stop ?? [];
      expect(
        stopHooks.some((h) => h.hooks.some((hook) => hook.command.includes('auto-checkpoint.sh')))
      ).toBe(true);
      expect(
        stopHooks.some((h) =>
          h.hooks.some((hook) => hook.command.includes('validate-todo-completion.sh'))
        )
      ).toBe(true);
    });

    it('should handle path resolution correctly in merged configs', async () => {
      const config1: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write',
              hooks: [
                { type: 'command', command: 'relative/path/hook1.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
        },
      };

      const config2: Config = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Edit',
              hooks: [
                { type: 'command', command: '/absolute/path/hook2.sh', enabled: true, retries: 0 },
              ],
              enabled: true,
            },
          ],
        },
      };

      const merged = await mergeConfigs(config2, config1, tempDir);

      const hooks = merged.hooks.PostToolUse ?? [];
      expect(hooks).toHaveLength(2);

      // Check that relative path was resolved
      const relativeHook = hooks.find((h) =>
        h.hooks.some((hook) => hook.command.includes('hook1.sh'))
      );
      expect(relativeHook?.hooks[0]?.command).toBe(path.resolve(tempDir, 'relative/path/hook1.sh'));

      // Check that absolute path was preserved
      const absoluteHook = hooks.find((h) =>
        h.hooks.some((hook) => hook.command.includes('hook2.sh'))
      );
      expect(absoluteHook?.hooks[0]?.command).toBe('/absolute/path/hook2.sh');
    });
  });

  describe('HooksConfigSchema validation', () => {
    it('should accept all valid hook event types', () => {
      
      const validConfig = {
        PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'test' }] }],
        PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'test' }] }],
        Stop: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
        SubagentStop: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
        PreAction: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
        PostAction: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
        SessionStart: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
        UserPromptSubmit: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
      };
      
      expect(() => HooksConfigSchema.parse(validConfig)).not.toThrow();
    });

    it('should accept partial hook configurations', () => {
      
      const partialConfig = {
        PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'test' }] }],
        PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: 'test' }] }],
      };
      
      expect(() => HooksConfigSchema.parse(partialConfig)).not.toThrow();
    });

    it('should accept empty hook configuration', () => {
      
      const emptyConfig = {};
      
      expect(() => HooksConfigSchema.parse(emptyConfig)).not.toThrow();
    });

    it('should allow additional properties (Zod default behavior)', () => {
      // Note: Zod by default allows additional properties. This is actually
      // beneficial as it allows forward compatibility with new hook types.
      const configWithExtra = {
        InvalidEvent: [{ matcher: '*', hooks: [{ type: 'command', command: 'test' }] }],
        PreToolUse: [{ matcher: 'Read', hooks: [{ type: 'command', command: 'test' }] }],
      };
      
      const result = HooksConfigSchema.parse(configWithExtra);
      expect(result).toBeDefined();
      expect(result.PreToolUse).toBeDefined();
      // The InvalidEvent will be present in the result but that's OK
    });

    it('should ensure HookEventSchema and HooksConfigSchema are in sync', () => {
      
      const eventSchemaKeys = HookEventSchema.options;
      const hooksConfigKeys = Object.keys(HooksConfigSchema.shape);
      
      // Every event in HookEventSchema should be in HooksConfigSchema
      for (const event of eventSchemaKeys) {
        expect(hooksConfigKeys).toContain(event);
      }
      
      // Every key in HooksConfigSchema should be in HookEventSchema
      for (const key of hooksConfigKeys) {
        expect(eventSchemaKeys).toContain(key);
      }
    });

    it('should validate PreToolUse hook configuration specifically', () => {
      
      const preToolUseConfig = {
        PreToolUse: [
          {
            matcher: 'Read|Edit|MultiEdit|Write',
            hooks: [
              {
                type: 'command',
                command: 'claudekit-hooks run file-guard',
              },
            ],
          },
        ],
      };
      
      const result = HooksConfigSchema.parse(preToolUseConfig);
      expect(result.PreToolUse).toBeDefined();
      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse?.[0]?.matcher).toBe('Read|Edit|MultiEdit|Write');
      expect(result.PreToolUse?.[0]?.hooks[0]?.command).toBe('claudekit-hooks run file-guard');
    });
  });
});
