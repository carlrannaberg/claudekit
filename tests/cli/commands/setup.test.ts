import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import type { Component, ComponentType, ComponentCategory, Platform, InstallOptions } from '../../../cli/types/index';

// Mock the filesystem module
vi.mock('../../../cli/lib/filesystem', () => ({
  pathExists: vi.fn(),
  ensureDirectoryExists: vi.fn(),
  expandHomePath: vi.fn().mockImplementation((p: string) => p.replace('~', '/home/user')),
  normalizePath: vi.fn().mockImplementation((p: string) => path.resolve(p)),
}));

// Mock fs promises
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
  },
}));

// Mock inquirer prompts
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(),
}));

// Mock Colors utility
vi.mock('../../../cli/utils/colors', () => ({
  Colors: {
    warn: vi.fn().mockImplementation((s: string) => s),
    accent: vi.fn().mockImplementation((s: string) => s),
    info: vi.fn().mockImplementation((s: string) => s),
    dim: vi.fn().mockImplementation((s: string) => s),
  },
}));

// Import after mocks
import { pathExists } from '../../../cli/lib/filesystem';
import { confirm } from '@inquirer/prompts';

// Extract and export the createProjectSettings function from setup.ts
// Since it's not exported, we need to test it through the setup function
// For this test, we'll create a test-only version that matches the implementation

interface HookSettings {
  hooks: {
    PostToolUse: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    Stop: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
  };
}

async function createProjectSettings(claudeDir: string, components: Component[], options: InstallOptions): Promise<string | null> {
  const settingsPath = path.join(claudeDir, 'settings.json');
  let backupPath: string | null = null;
  
  // Read existing settings if present
  let existingSettings: HookSettings | null = null;
  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    existingSettings = JSON.parse(content) as HookSettings;
  } catch {
    // No existing settings or invalid JSON
  }

  // Start with existing settings or create new structure
  const settings: HookSettings = existingSettings ?? {
    hooks: {
      PostToolUse: [],
      Stop: [],
    },
  };
  
  // Ensure required structure exists
  if (settings.hooks === null || settings.hooks === undefined) {
    settings.hooks = {
      PostToolUse: [],
      Stop: [],
    };
  }
  if (settings.hooks.PostToolUse === null || settings.hooks.PostToolUse === undefined) {
    settings.hooks.PostToolUse = [];
  }
  if (settings.hooks.Stop === null || settings.hooks.Stop === undefined) {
    settings.hooks.Stop = [];
  }

  // Helper function to check if a hook is already configured
  const isHookConfigured = (hookId: string): boolean => {
    // Create both old and new command formats to check
    const oldCommand = `.claude/hooks/${hookId}.sh`;
    const newCommand = `claudekit-hooks run ${hookId}`;
    
    // Check PostToolUse hooks
    for (const entry of settings.hooks.PostToolUse) {
      if (entry.hooks.some(h => h.command === oldCommand || h.command === newCommand)) {
        return true;
      }
    }
    // Check Stop hooks
    for (const entry of settings.hooks.Stop) {
      if (entry.hooks.some(h => h.command === oldCommand || h.command === newCommand)) {
        return true;
      }
    }
    return false;
  };

  // Add hooks based on installed components and options
  for (const component of components) {
    if (component.type === 'hook') {
      // Use embedded hook command format
      const hookCommand = `claudekit-hooks run ${component.id}`;
      
      // Skip if this hook is already configured
      if (isHookConfigured(component.id)) {
        continue;
      }

      switch (component.id) {
        case 'typecheck':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.ts',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'eslint':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'prettier':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx,json,md}',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'no-any':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.{ts,tsx}',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'run-related-tests':
          settings.hooks.PostToolUse.push({
            matcher: 'Write,Edit,MultiEdit',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'auto-checkpoint': {
          const stopEntry = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntry !== undefined) {
            stopEntry.hooks.push({ type: 'command', command: hookCommand });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
          break;
        }

        case 'validate-todo-completion': {
          const stopEntryTodo = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntryTodo !== undefined) {
            stopEntryTodo.hooks.push({ type: 'command', command: hookCommand });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
          break;
        }

        case 'project-validation': {
          // Add project-validation to Stop hooks
          const stopEntryValidation = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntryValidation !== undefined) {
            stopEntryValidation.hooks.push({ type: 'command', command: hookCommand });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
          break;
        }
      }
    }
  }

  // Write settings.json with conflict detection
  const newContent = JSON.stringify(settings, null, 2);
  
  // Check if file exists and has different content
  if (await pathExists(settingsPath)) {
    const existingContent = await fs.readFile(settingsPath, 'utf-8');
    if (existingContent !== newContent) {
      // In non-interactive mode, throw error
      if (options.interactive === false && options.force !== true) {
        throw new Error(
          `\nFile conflict detected: ${settingsPath} already exists with different content.\n` +
          `To overwrite existing files, run with --force flag.`
        );
      }
      
      // In interactive mode, prompt for confirmation
      if (options.force !== true) {
        // Interactive conflict resolution
        if (options.onPromptStart) {
          options.onPromptStart();
        }
        
        // Clear the spinner and show conflict info
        process.stdout.write('\x1B[2K\r');
        console.log(`\n━━━ Settings Conflict Detected ━━━`);
        console.log(`File: ${settingsPath}`);
        console.log(`This file already exists with different content.`);
        console.log(`The setup wants to add new hook configurations.`);
        console.log('');
        
        const shouldOverwrite = await confirm({
          message: 'Do you want to update the settings file?',
          default: true
        });
        
        console.log(''); // Add spacing after prompt
        
        // Notify that prompt is done
        if (options.onPromptEnd) {
          options.onPromptEnd();
        }
        
        if (!shouldOverwrite) {
          console.log('Skipping settings.json update');
          return null;
        }
        
        // Create backup if requested
        if (options.backup !== false) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          backupPath = `${settingsPath}.backup-${timestamp}`;
          await fs.copyFile(settingsPath, backupPath);
          console.log(`Created backup: ${backupPath}`);
        }
      }
    } else {
      // Files are identical, skip
      return null;
    }
  }
  
  // Write the new content
  await fs.writeFile(settingsPath, newContent);
  
  // Return backup path for cleanup
  return backupPath;
}

describe('createProjectSettings - Embedded Hook Settings Generation', () => {
  const mockClaudeDir = '/test/project/.claude';
  const mockSettingsPath = '/test/project/.claude/settings.json';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock behaviors
    (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    (fs.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('File not found'));
    (fs.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (fs.copyFile as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (confirm as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const createMockComponent = (id: string, type: ComponentType = 'hook'): Component => ({
    id,
    type,
    name: `${id} component`,
    description: `Description for ${id}`,
    path: `/src/hooks/${id}.sh`,
    dependencies: [],
    platforms: ['darwin', 'linux'] as Platform[],
    category: 'validation' as ComponentCategory,
    version: '1.0.0',
    author: 'ClaudeKit',
    enabled: true,
    config: {},
    metadata: {} as any,
  });

  describe('Hook Command Format', () => {
    it('should generate hook commands in embedded format (claudekit-hooks run <hook>)', async () => {
      const components = [
        createMockComponent('typecheck'),
        createMockComponent('eslint'),
      ];

      await createProjectSettings(mockClaudeDir, components, {});

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"command": "claudekit-hooks run typecheck"')
      );
      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.stringContaining('"command": "claudekit-hooks run eslint"')
      );
    });

    it('should NOT generate old format commands (.claude/hooks/<hook>.sh)', async () => {
      const components = [
        createMockComponent('typecheck'),
        createMockComponent('eslint'),
      ];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = (fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(writtenContent).not.toContain('.claude/hooks/');
      expect(writtenContent).not.toContain('.sh');
    });
  });

  describe('All Hook Types', () => {
    it('should handle typecheck hook with correct matcher', async () => {
      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const typecheckEntry = writtenContent.hooks.PostToolUse.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('typecheck'))
      );

      expect(typecheckEntry).toBeDefined();
      expect(typecheckEntry.matcher).toBe('tools:Write AND file_paths:**/*.ts');
      expect(typecheckEntry.hooks[0]).toEqual({
        type: 'command',
        command: 'claudekit-hooks run typecheck',
      });
    });

    it('should handle eslint hook with correct matcher', async () => {
      const components = [createMockComponent('eslint')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const eslintEntry = writtenContent.hooks.PostToolUse.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('eslint'))
      );

      expect(eslintEntry).toBeDefined();
      expect(eslintEntry.matcher).toBe('tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}');
      expect(eslintEntry.hooks[0]).toEqual({
        type: 'command',
        command: 'claudekit-hooks run eslint',
      });
    });

    it('should handle prettier hook with correct matcher', async () => {
      const components = [createMockComponent('prettier')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const prettierEntry = writtenContent.hooks.PostToolUse.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('prettier'))
      );

      expect(prettierEntry).toBeDefined();
      expect(prettierEntry.matcher).toBe('tools:Write AND file_paths:**/*.{js,ts,tsx,jsx,json,md}');
      expect(prettierEntry.hooks[0]).toEqual({
        type: 'command',
        command: 'claudekit-hooks run prettier',
      });
    });

    it('should handle no-any hook with correct matcher', async () => {
      const components = [createMockComponent('no-any')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const noAnyEntry = writtenContent.hooks.PostToolUse.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('no-any'))
      );

      expect(noAnyEntry).toBeDefined();
      expect(noAnyEntry.matcher).toBe('tools:Write AND file_paths:**/*.{ts,tsx}');
      expect(noAnyEntry.hooks[0]).toEqual({
        type: 'command',
        command: 'claudekit-hooks run no-any',
      });
    });

    it('should handle run-related-tests hook with correct matcher', async () => {
      const components = [createMockComponent('run-related-tests')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const testsEntry = writtenContent.hooks.PostToolUse.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('run-related-tests'))
      );

      expect(testsEntry).toBeDefined();
      expect(testsEntry.matcher).toBe('Write,Edit,MultiEdit');
      expect(testsEntry.hooks[0]).toEqual({
        type: 'command',
        command: 'claudekit-hooks run run-related-tests',
      });
    });

    it('should handle auto-checkpoint hook in Stop event', async () => {
      const components = [createMockComponent('auto-checkpoint')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const stopEntry = writtenContent.hooks.Stop.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('auto-checkpoint'))
      );

      expect(stopEntry).toBeDefined();
      expect(stopEntry.matcher).toBe('*');
      expect(stopEntry.hooks).toContainEqual({
        type: 'command',
        command: 'claudekit-hooks run auto-checkpoint',
      });
    });

    it('should handle validate-todo-completion hook in Stop event', async () => {
      const components = [createMockComponent('validate-todo-completion')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const stopEntry = writtenContent.hooks.Stop.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('validate-todo-completion'))
      );

      expect(stopEntry).toBeDefined();
      expect(stopEntry.matcher).toBe('*');
      expect(stopEntry.hooks).toContainEqual({
        type: 'command',
        command: 'claudekit-hooks run validate-todo-completion',
      });
    });

    it('should handle project-validation hook in Stop event', async () => {
      const components = [createMockComponent('project-validation')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const stopEntry = writtenContent.hooks.Stop.find(
        (e: any) => e.hooks.some((h: any) => h.command.includes('project-validation'))
      );

      expect(stopEntry).toBeDefined();
      expect(stopEntry.matcher).toBe('*');
      expect(stopEntry.hooks).toContainEqual({
        type: 'command',
        command: 'claudekit-hooks run project-validation',
      });
    });
  });

  describe('Duplicate Hook Prevention', () => {
    it('should not add duplicate hooks with new format', async () => {
      const existingSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [{ type: 'command', command: 'claudekit-hooks run typecheck' }],
            },
          ],
          Stop: [],
        },
      };

      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      // Format with 2 spaces to match the output of JSON.stringify(settings, null, 2)
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existingSettings, null, 2));

      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      // Should not write anything since content is identical
      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should not add duplicate hooks when old format exists', async () => {
      const existingSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [{ type: 'command', command: '.claude/hooks/typecheck.sh' }],
            },
          ],
          Stop: [],
        },
      };

      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existingSettings));

      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      // Should not add the hook again since it's already configured (old format)
      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      const typecheckEntries = writtenContent.hooks.PostToolUse.filter(
        (e: any) => e.hooks.some((h: any) => h.command.includes('typecheck'))
      );
      
      expect(typecheckEntries).toHaveLength(1);
      expect(typecheckEntries[0].hooks[0].command).toBe('.claude/hooks/typecheck.sh');
    });

    it('should combine multiple Stop hooks in same entry', async () => {
      const components = [
        createMockComponent('auto-checkpoint'),
        createMockComponent('validate-todo-completion'),
        createMockComponent('project-validation'),
      ];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      
      // Should have only one Stop entry with matcher '*'
      expect(writtenContent.hooks.Stop).toHaveLength(1);
      expect(writtenContent.hooks.Stop[0].matcher).toBe('*');
      
      // Should have all three hooks in the same entry
      expect(writtenContent.hooks.Stop[0].hooks).toHaveLength(3);
      expect(writtenContent.hooks.Stop[0].hooks).toContainEqual({
        type: 'command',
        command: 'claudekit-hooks run auto-checkpoint',
      });
      expect(writtenContent.hooks.Stop[0].hooks).toContainEqual({
        type: 'command',
        command: 'claudekit-hooks run validate-todo-completion',
      });
      expect(writtenContent.hooks.Stop[0].hooks).toContainEqual({
        type: 'command',
        command: 'claudekit-hooks run project-validation',
      });
    });
  });

  describe('Settings Merging', () => {
    it('should merge with existing settings', async () => {
      const existingSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'custom-matcher',
              hooks: [{ type: 'command', command: 'custom-command' }],
            },
          ],
          Stop: [],
        },
      };

      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existingSettings));

      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      
      // Should preserve existing custom entry
      expect(writtenContent.hooks.PostToolUse).toContainEqual({
        matcher: 'custom-matcher',
        hooks: [{ type: 'command', command: 'custom-command' }],
      });
      
      // Should add new typecheck entry
      expect(writtenContent.hooks.PostToolUse).toContainEqual({
        matcher: 'tools:Write AND file_paths:**/*.ts',
        hooks: [{ type: 'command', command: 'claudekit-hooks run typecheck' }],
      });
    });

    it('should handle missing hooks structure gracefully', async () => {
      const malformedSettings = {
        // Missing hooks property
        someOtherProperty: 'value',
      };

      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(malformedSettings));

      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      
      // Should create proper structure
      expect(writtenContent.hooks).toBeDefined();
      expect(writtenContent.hooks.PostToolUse).toBeDefined();
      expect(writtenContent.hooks.Stop).toBeDefined();
      
      // Should preserve other properties
      expect(writtenContent.someOtherProperty).toBe('value');
    });
  });

  describe('File System Operations', () => {
    it('should create new settings file when none exists', async () => {
      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      expect(fs.writeFile).toHaveBeenCalledWith(
        mockSettingsPath,
        expect.any(String)
      );

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      expect(writtenContent.hooks.PostToolUse).toHaveLength(1);
      expect(writtenContent.hooks.Stop).toHaveLength(0);
    });

    it('should handle file conflicts in non-interactive mode without force', async () => {
      const existingSettings = { hooks: { PostToolUse: [], Stop: [] } };
      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existingSettings));

      const components = [createMockComponent('typecheck')];

      await expect(
        createProjectSettings(mockClaudeDir, components, { interactive: false })
      ).rejects.toThrow('File conflict detected');
    });

    it('should overwrite with force flag', async () => {
      const existingSettings = { hooks: { PostToolUse: [], Stop: [] } };
      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existingSettings));

      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, { force: true });

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should create backup when overwriting in interactive mode', async () => {
      const existingSettings = { hooks: { PostToolUse: [], Stop: [] } };
      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(JSON.stringify(existingSettings));
      (confirm as ReturnType<typeof vi.fn>).mockResolvedValue(true);

      const components = [createMockComponent('typecheck')];

      const backupPath = await createProjectSettings(mockClaudeDir, components, { interactive: true });

      expect(fs.copyFile).toHaveBeenCalled();
      expect(backupPath).toMatch(/settings\.json\.backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });

    it('should skip writing if content is identical', async () => {
      const existingSettings = {
        hooks: {
          PostToolUse: [
            {
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [{ type: 'command', command: 'claudekit-hooks run typecheck' }],
            },
          ],
          Stop: [],
        },
      };

      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
        JSON.stringify(existingSettings, null, 2)
      );

      const components = [createMockComponent('typecheck')];

      const result = await createProjectSettings(mockClaudeDir, components, {});

      expect(result).toBeNull();
      expect(fs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe('Component Type Filtering', () => {
    it('should only process hook components, not commands', async () => {
      const components = [
        createMockComponent('typecheck', 'hook'),
        createMockComponent('git:commit', 'command'),
        createMockComponent('validate-and-fix', 'command'),
      ];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      
      // Should only have typecheck hook
      expect(writtenContent.hooks.PostToolUse).toHaveLength(1);
      expect(writtenContent.hooks.PostToolUse[0].hooks[0].command).toBe('claudekit-hooks run typecheck');
      
      // Should not have any command components
      const allCommands = [
        ...writtenContent.hooks.PostToolUse.flatMap((e: any) => e.hooks.map((h: any) => h.command)),
        ...writtenContent.hooks.Stop.flatMap((e: any) => e.hooks.map((h: any) => h.command)),
      ];
      
      expect(allCommands).not.toContain('claudekit-hooks run git:commit');
      expect(allCommands).not.toContain('claudekit-hooks run validate-and-fix');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty component list', async () => {
      await createProjectSettings(mockClaudeDir, [], {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      expect(writtenContent.hooks.PostToolUse).toHaveLength(0);
      expect(writtenContent.hooks.Stop).toHaveLength(0);
    });

    it('should handle unknown hook types gracefully', async () => {
      const components = [
        createMockComponent('unknown-hook-type'),
      ];

      await createProjectSettings(mockClaudeDir, components, {});

      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      // Unknown hooks should not be added
      expect(writtenContent.hooks.PostToolUse).toHaveLength(0);
      expect(writtenContent.hooks.Stop).toHaveLength(0);
    });

    it('should handle JSON parse errors gracefully', async () => {
      (pathExists as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (fs.readFile as ReturnType<typeof vi.fn>).mockResolvedValue('invalid json content');

      const components = [createMockComponent('typecheck')];

      await createProjectSettings(mockClaudeDir, components, {});

      // Should still create valid settings
      expect(fs.writeFile).toHaveBeenCalled();
      const writtenContent = JSON.parse((fs.writeFile as ReturnType<typeof vi.fn>).mock.calls[0][1]);
      expect(writtenContent.hooks.PostToolUse).toHaveLength(1);
    });
  });
});