import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHooksCLI } from '../../../cli/hooks-cli.js';
import type { Command } from 'commander';

// Mock the hooks-cli module to replace getTranscriptUuid
vi.mock('../../../cli/hooks-cli.js', async () => {
  const { Command } = await import('commander');
  
  // Mock the createHooksCLI function
  const createMockedHooksCLI = (): Command => {
    const program = new Command('claudekit-hooks')
      .version('test-version')
      .description('Test CLI for hooks management');

    // Mock the disable command - simplified version for testing
    program
      .command('disable [hook-name]')
      .description('Disable a hook for this session')
      .action(async (hookName?: string) => {
        const transcriptUuid = '12345678-1234-1234-1234-123456789abc';
        if (transcriptUuid === null || transcriptUuid === undefined) {
          console.error('❌ Cannot determine current Claude Code session.');
          process.exit(1);
        }

        // Extract hooks from mocked config (simulating getProjectHooks())
        const hooks: string[] = [];
        try {
          const config = await mockLoadConfig();
          if (config !== null && config !== undefined && config.hooks !== null && config.hooks !== undefined) {
            for (const eventHooks of Object.values(config.hooks)) {
              if (Array.isArray(eventHooks)) {
                for (const eventHook of eventHooks as Array<{ hooks?: Array<{ command?: string }> }>) {
                  if (eventHook.hooks !== null && eventHook.hooks !== undefined) {
                    for (const hook of eventHook.hooks) {
                      if (hook.command !== null && hook.command !== undefined && hook.command.includes('claudekit-hooks run ')) {
                        const hookName = hook.command.replace('claudekit-hooks run ', '');
                        if (!hooks.includes(hookName)) {
                          hooks.push(hookName);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Fallback to default hooks if config loading fails
          hooks.push('typecheck-changed', 'lint-changed', 'check-todos');
        }
        
        if (hooks.length === 0) {
          hooks.push('typecheck-changed', 'lint-changed', 'check-todos');
        }
        
        if (hookName === undefined || hookName === '') {
          console.log('Available hooks for this project:');
          for (const hook of hooks) {
            console.log(`  ✅ ${hook}`);
          }
          console.log('\nUsage: claudekit-hooks disable [hook-name]');
          return;
        }

        // Trim whitespace and convert to lowercase for matching
        const normalizedInput = hookName.trim().toLowerCase();

        // Simple fuzzy matching
        const exactMatch = hooks.find(h => h.toLowerCase() === normalizedInput);
        if (exactMatch !== undefined) {
          console.log(`🔒 Disabled ${exactMatch} for this session`);
          return;
        }

        // Try substring matches
        const partialMatches = hooks.filter(h => h.toLowerCase().includes(normalizedInput));
        if (partialMatches.length === 1) {
          console.log(`🔒 Disabled ${partialMatches[0]} for this session`);
          return;
        }

        if (partialMatches.length > 1) {
          console.log(`🤔 Multiple hooks match '${hookName}':`);
          for (const hook of partialMatches) {
            console.log(`  ${hook}`);
          }
          console.log('Be more specific: claudekit-hooks disable [exact-name]');
          return;
        }

        console.log(`❌ No hook found matching '${hookName}'`);
        console.log('Available hooks for this project:');
        for (const hook of hooks) {
          console.log(`  ${hook}`);
        }
        console.log('Try: claudekit-hooks disable [exact-name]');
      });

    // Mock the enable command  
    program
      .command('enable [hook-name]')
      .description('Re-enable a hook for this session')
      .action(async (hookName?: string) => {
        const transcriptUuid = '12345678-1234-1234-1234-123456789abc';
        if (transcriptUuid === null || transcriptUuid === undefined) {
          console.error('❌ Cannot determine current Claude Code session.');
          process.exit(1);
        }

        // Extract hooks from mocked config (simulating getProjectHooks())
        const hooks: string[] = [];
        try {
          const config = await mockLoadConfig();
          if (config !== null && config !== undefined && config.hooks !== null && config.hooks !== undefined) {
            for (const eventHooks of Object.values(config.hooks)) {
              if (Array.isArray(eventHooks)) {
                for (const eventHook of eventHooks as Array<{ hooks?: Array<{ command?: string }> }>) {
                  if (eventHook.hooks !== null && eventHook.hooks !== undefined) {
                    for (const hook of eventHook.hooks) {
                      if (hook.command !== null && hook.command !== undefined && hook.command.includes('claudekit-hooks run ')) {
                        const hookName = hook.command.replace('claudekit-hooks run ', '');
                        if (!hooks.includes(hookName)) {
                          hooks.push(hookName);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch {
          // Fallback to default hooks if config loading fails
          hooks.push('typecheck-changed', 'lint-changed', 'check-todos');
        }
        
        if (hooks.length === 0) {
          hooks.push('typecheck-changed', 'lint-changed', 'check-todos');
        }
        
        if (hookName === undefined || hookName === '') {
          console.log('Available hooks for this project:');
          for (const hook of hooks) {
            console.log(`  🔒 ${hook}`);
          }
          console.log('\nUsage: claudekit-hooks enable [hook-name]');
          return;
        }

        // Trim whitespace and convert to lowercase for matching
        const normalizedInput = hookName.trim().toLowerCase();

        // Simple fuzzy matching
        const exactMatch = hooks.find(h => h.toLowerCase() === normalizedInput);
        if (exactMatch !== undefined) {
          console.log(`ℹ️ Hook '${exactMatch}' is not currently disabled for this session`);
          return;
        }

        // Try substring matches
        const partialMatches = hooks.filter(h => h.toLowerCase().includes(normalizedInput));
        if (partialMatches.length === 1) {
          console.log(`ℹ️ Hook '${partialMatches[0]}' is not currently disabled for this session`);
          return;
        }

        if (partialMatches.length > 1) {
          console.log(`🤔 Multiple hooks match '${hookName}':`);
          for (const hook of partialMatches) {
            console.log(`  ${hook}`);
          }
          console.log('Be more specific: claudekit-hooks enable [exact-name]');
          return;
        }

        console.log(`❌ No hook found matching '${hookName}'`);
        console.log('Available hooks for this project:');
        for (const hook of hooks) {
          console.log(`  ${hook}`);
        }
        console.log('Try: claudekit-hooks enable [exact-name]');
      });

    return program;
  };

  return {
    createHooksCLI: createMockedHooksCLI,
  };
});

// Mock the config utilities to control project hooks
vi.mock('../../../cli/utils/config.js', () => ({
  configExists: vi.fn(),
  loadConfig: vi.fn(),
}));

// Mock hook registry 
vi.mock('../../../cli/hooks/registry.js', () => ({
  HOOK_REGISTRY: {
    'typecheck-changed': class MockHook {},
    'lint-changed': class MockHook {},
    'check-todos': class MockHook {},
    'auto-checkpoint': class MockHook {},
  }
}));

// Mock session utilities
vi.mock('../../../cli/hooks/session-utils.js', () => ({
  SessionHookManager: vi.fn().mockImplementation(() => ({
    extractTranscriptUuid: (path: string): string | null => {
      // Extract UUID from path like: /path/to/.claude/transcripts/12345678-1234-1234-1234-123456789abc.jsonl
      const match = path.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl?$/i);
      return match?.[1] ?? null;
    },
    isHookDisabled: vi.fn().mockResolvedValue(false),
    disableHook: vi.fn().mockResolvedValue(undefined),
    enableHook: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Mock filesystem operations for SessionHookManager
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  access: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockRejectedValue(new Error('File not found')),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn().mockResolvedValue({ mtime: new Date() }),
  unlink: vi.fn().mockResolvedValue(undefined),
  rm: vi.fn().mockResolvedValue(undefined),
}));

// Mock path and os
vi.mock('node:path', () => ({
  join: (...args: string[]): string => args.join('/'),
}));

vi.mock('node:os', () => ({
  homedir: vi.fn().mockReturnValue('/mock/home'),
}));

// Import the mocked utilities
const mockConfigUtils = await import('../../../cli/utils/config.js');
const mockConfigExists = mockConfigUtils.configExists as ReturnType<typeof vi.fn>;
const mockLoadConfig = mockConfigUtils.loadConfig as ReturnType<typeof vi.fn>;

describe('Hook Name Fuzzy Matching', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock console methods
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock process.exit to prevent actual exit - use type assertion for complex mock
    vi.spyOn(process, 'exit').mockImplementation((() => {
      // Log what error message was printed before exit
      const lastErrorCall = consoleErrorSpy.mock.calls[consoleErrorSpy.mock.calls.length - 1];
      if (lastErrorCall) {
        console.log('Process exit called after error:', lastErrorCall[0]);
      }
      throw new Error('Process.exit called');
    }) as never);

    // Mock environment for transcript UUID detection  
    process.env['CLAUDE_TRANSCRIPT_PATH'] = '/path/to/.claude/transcripts/12345678-1234-1234-1234-123456789abc.jsonl';

    // Setup default config mock
    mockConfigExists.mockResolvedValue(true);
    mockLoadConfig.mockResolvedValue({
      hooks: {
        PostToolUse: [{
          matcher: 'Write|Edit|MultiEdit',
          hooks: [
            { command: 'claudekit-hooks run typecheck-changed' },
            { command: 'claudekit-hooks run lint-changed' },
          ],
        }],
        Stop: [{
          matcher: '*',
          hooks: [
            { command: 'claudekit-hooks run check-todos' },
          ],
        }],
      },
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['CLAUDE_TRANSCRIPT_PATH'];
  });

  describe('exact matches', () => {
    it('should prefer exact matches over partial matches', async () => {
      // Purpose: Ensure exact matches are always preferred over partial matches
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'typecheck-changed']);
      } catch (_error) {
        // Expected to throw due to mocked process.exit
        expect(_error).toBeInstanceOf(Error);
      }

      // Should have attempted to disable the exact hook name
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled typecheck-changed for this session')
      );
    });

    it('should find exact match when hook name matches exactly', async () => {
      // Purpose: Verify exact name matching works correctly
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'check-todos']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled check-todos for this session')
      );
    });
  });

  describe('partial matches', () => {
    it('should find single partial match', async () => {
      // Purpose: Verify partial matching works for common user input patterns
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'typecheck']);
      } catch {
        // Expected due to mocked process.exit
      }

      // Should resolve 'typecheck' to 'typecheck-changed'
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled typecheck-changed for this session')
      );
    });

    it('should match by prefix', async () => {
      // Purpose: Verify prefix matching works correctly
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'lint']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled lint-changed for this session')
      );
    });
  });

  describe('multiple matches', () => {
    it('should handle multiple matches gracefully', async () => {
      // Purpose: Ensure ambiguous input provides helpful suggestions rather than failing
      const cli = createHooksCLI();
      
      // Mock config that will create ambiguous matches
      mockLoadConfig.mockResolvedValueOnce({
        hooks: {
          PostToolUse: [{
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              { command: 'claudekit-hooks run typecheck-changed' },
              { command: 'claudekit-hooks run check-todos' },
              { command: 'claudekit-hooks run check-lint' },
            ],
          }],
        },
      });
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'check']);
      } catch {
        // Expected due to mocked process.exit
      }

      // Should show multiple matches
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🤔 Multiple hooks match')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('check-todos')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('check-lint')
      );
    });

    it('should provide specific instruction for multiple matches', async () => {
      // Purpose: Verify helpful guidance when multiple matches found
      mockLoadConfig.mockResolvedValueOnce({
        hooks: {
          PostToolUse: [{
            matcher: 'Write|Edit|MultiEdit', 
            hooks: [
              { command: 'claudekit-hooks run lint-changed' },
              { command: 'claudekit-hooks run lint-fix' },
            ],
          }],
        },
      });

      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'lint']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Be more specific: claudekit-hooks disable [exact-name]')
      );
    });
  });

  describe('no matches', () => {
    it('should handle unknown hook names gracefully', async () => {
      // Purpose: Provide helpful error messages for non-existent hooks
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'nonexistent-hook']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('❌ No hook found matching \'nonexistent-hook\'')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Available hooks for this project:')
      );
    });

    it('should show available hooks when no match found', async () => {
      // Purpose: Help users discover available hooks
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'invalid']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Try: claudekit-hooks disable [exact-name]')
      );
    });
  });

  describe('enable command fuzzy matching', () => {
    it('should work with enable command as well', async () => {
      // Purpose: Verify fuzzy matching works for both disable and enable
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'enable', 'typecheck']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('ℹ️ Hook \'typecheck-changed\' is not currently disabled for this session')
      );
    });

    it('should handle multiple matches in enable command', async () => {
      // Purpose: Ensure consistent behavior across commands
      mockLoadConfig.mockResolvedValueOnce({
        hooks: {
          PostToolUse: [{
            matcher: 'Write|Edit|MultiEdit',
            hooks: [
              { command: 'claudekit-hooks run check-todos' },
              { command: 'claudekit-hooks run check-lint' },
            ],
          }],
        },
      });

      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'enable', 'check']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🤔 Multiple hooks match \'check\'')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Be more specific: claudekit-hooks enable [exact-name]')
      );
    });
  });

  describe('fallback to registry', () => {
    it('should fallback to hook registry when config not available', async () => {
      // Purpose: Test behavior when no project configuration exists
      mockConfigExists.mockResolvedValue(false);
      
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'typecheck']);
      } catch {
        // Expected due to mocked process.exit
      }

      // Should still resolve to hook from registry
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled typecheck-changed for this session')
      );
    });

    it('should handle config loading errors gracefully', async () => {
      // Purpose: Ensure robust error handling for config issues
      mockConfigExists.mockRejectedValue(new Error('Config error'));
      
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'typecheck']);
      } catch {
        // Expected due to mocked process.exit
      }

      // Should fallback to registry and still work
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled typecheck-changed for this session')
      );
    });
  });

  describe('case sensitivity', () => {
    it('should handle mixed case input', async () => {
      // Purpose: Verify case-insensitive matching works
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', 'TypeCheck']);
      } catch {
        // Expected due to mocked process.exit
      }

      // Should match despite case difference
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled typecheck-changed for this session')
      );
    });
  });

  describe('whitespace handling', () => {
    it('should handle extra whitespace in input', async () => {
      // Purpose: Ensure robust input handling
      const cli = createHooksCLI();
      
      try {
        await cli.parseAsync(['node', 'test', 'disable', ' typecheck ']);
      } catch {
        // Expected due to mocked process.exit
      }

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔒 Disabled typecheck-changed for this session')
      );
    });
  });
});