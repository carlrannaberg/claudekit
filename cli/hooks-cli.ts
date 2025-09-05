#!/usr/bin/env node

/**
 * ClaudeKit Hooks CLI
 * Command-line interface for managing and executing Claude Code hooks
 */

import { Command } from 'commander';
import { setImmediate } from 'node:timers';
import * as path from 'node:path';
import { HookRunner } from './hooks/runner.js';
import { profileHooks } from './hooks/profile.js';
import { SessionHookManager } from './hooks/session-utils.js';
import { loadConfig, configExists } from './utils/config.js';

// Helper types for fuzzy matching
interface MatchResult {
  type: 'exact' | 'multiple' | 'none' | 'not-configured';
  hook?: string;
  hooks?: string[];
  suggestions?: string[];
}

// Helper function to resolve hook names with fuzzy matching
async function resolveHookName(input: string, projectHooks: string[]): Promise<MatchResult> {
  // 1. Exact match in configured hooks
  if (projectHooks.includes(input)) {
    return { type: 'exact', hook: input };
  }
  
  // 2. Partial match in configured hooks
  const partial = projectHooks.filter(name => 
    name.includes(input) || name.startsWith(input)
  );
  if (partial.length === 1 && partial[0] !== undefined) {
    return { type: 'exact', hook: partial[0] };
  }
  if (partial.length > 1) {
    return { type: 'multiple', hooks: partial };
  }
  
  // 3. Check if hook exists in registry but not configured
  const { HOOK_REGISTRY } = await import('./hooks/registry.js');
  const registryHooks = Object.keys(HOOK_REGISTRY);
  
  if (registryHooks.includes(input)) {
    return { type: 'not-configured', hook: input };
  }
  
  const registryPartial = registryHooks.filter(name => 
    name.includes(input) || name.startsWith(input)
  );
  if (registryPartial.length === 1 && registryPartial[0] !== undefined) {
    return { type: 'not-configured', hook: registryPartial[0] };
  }
  
  // 4. No match anywhere
  return { type: 'none', suggestions: projectHooks };
}

// Helper function to get project-configured hooks
async function getProjectHooks(): Promise<string[]> {
  try {
    const projectRoot = process.cwd();
    if (await configExists(projectRoot)) {
      const config = await loadConfig(projectRoot);
      const hooks = new Set<string>();
      
      // Extract hook commands from all events
      for (const [, matchers] of Object.entries(config.hooks)) {
        if (matchers) {
          for (const matcher of matchers) {
            for (const hook of matcher.hooks) {
              // Extract hook name from command like "claudekit-hooks run typecheck-changed"
              const match = hook.command.match(/claudekit-hooks\s+run\s+([^\s]+)/);
              if (match && match[1] !== undefined) {
                hooks.add(match[1]);
              }
            }
          }
        }
      }
      
      return Array.from(hooks).sort();
    }
  } catch {
    // If config fails to load, return empty array - don't fall back to registry
  }
  
  // Return empty array if no config or config is invalid
  // We only allow disabling hooks that are actually configured to run
  return [];
}

// Helper function to discover transcript files in a directory and return most recent UUID
async function discoverTranscriptUuid(transcriptDir: string): Promise<string | null> {
  try {
    const fs = await import('node:fs/promises');
    const files = await fs.readdir(transcriptDir);
    const transcriptFiles = files.filter(f => f.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl?$/i));
    
    if (transcriptFiles.length > 0) {
      // Get the most recent transcript file
      const stats = await Promise.all(
        transcriptFiles.map(async file => ({
          file,
          stat: await fs.stat(path.join(transcriptDir, file))
        }))
      );
      stats.sort((a, b) => b.stat.mtime.getTime() - a.stat.mtime.getTime());
      
      const sessionManager = new SessionHookManager();
      const firstFile = stats[0];
      return firstFile ? sessionManager.extractTranscriptUuid(firstFile.file) : null;
    }
  } catch (error) {
    // Debug: Log errors during development
    if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
      console.error(`Debug: discoverTranscriptUuid failed for ${transcriptDir}:`, error);
    }
  }
  
  return null;
}

// Helper function to generate session marker hash and extract transcript UUID
async function getSessionIdentifier(): Promise<string | null> {
  // Generate marker hash for session connection (as per spec)
  const { exec } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const execAsync = promisify(exec);
  
  try {
    // Generate POSIX-compatible hash using /dev/urandom, od, and tr
    const { stdout: hash } = await execAsync("head -c 8 /dev/urandom | od -An -tx1 | tr -d ' \\n'");
    const sessionHash = hash.trim();
    
    // Inject hash as hidden comment to connect transcript with session
    console.log(`<!-- claudekit-session-marker:${sessionHash} -->`);
    
    // Try to get transcript UUID from Claude Code environment
    const transcriptPath = process.env['CLAUDE_TRANSCRIPT_PATH'];
    if (transcriptPath !== undefined && transcriptPath !== '') {
      const sessionManager = new SessionHookManager();
      return sessionManager.extractTranscriptUuid(transcriptPath);
    }

    // Try to extract UUID from ITERM_SESSION_ID (common in Claude Code sessions)
    const itermSessionId = process.env['ITERM_SESSION_ID'];
    if (itermSessionId !== undefined && itermSessionId !== '') {
      const uuidMatch = itermSessionId.match(/([0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12})/i);
      if (uuidMatch !== null && uuidMatch[1] !== undefined) {
        if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
          console.error(`Debug: Using UUID from ITERM_SESSION_ID: ${uuidMatch[1]}`);
        }
        return uuidMatch[1].toLowerCase();
      }
    }

    // Try current directory's .claude/transcripts
    const projectTranscriptDir = path.join(process.cwd(), '.claude', 'transcripts');
    if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
      console.error(`Debug: Trying project transcripts at ${projectTranscriptDir}`);
    }
    const projectUuid = await discoverTranscriptUuid(projectTranscriptDir);
    if (projectUuid !== null) {
      return projectUuid;
    }

    // Try user's home directory ~/.claude/transcripts
    const os = await import('node:os');
    const homeTranscriptDir = path.join(os.homedir(), '.claude', 'transcripts');
    if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
      console.error(`Debug: Trying home transcripts at ${homeTranscriptDir}`);
    }
    const homeUuid = await discoverTranscriptUuid(homeTranscriptDir);
    if (homeUuid !== null) {
      return homeUuid;
    }

    // Fallback: If we're in Claude Code but can't find transcript files,
    // use the session marker hash as session ID (for testing/development)
    if (process.env['CLAUDECODE'] === '1') {
      if (process.env['CLAUDEKIT_DEBUG'] === 'true') {
        console.error(`Debug: Using session marker hash as fallback session ID: ${sessionHash}`);
      }
      return sessionHash;
    }

    return null;
  } catch (error) {
    // Fallback if hash generation fails
    console.error('Warning: Could not generate session marker hash:', error);
    return null;
  }
}

export function createHooksCLI(): Command {
  const program = new Command('claudekit-hooks')
    .description('Claude Code hooks execution system')
    .version('1.0.0')
    .option('--config <path>', 'Path to config file', '.claudekit/config.json')
    .option('--list', 'List available hooks')
    .option('--debug', 'Enable debug logging');

  // Add list command
  program
    .command('list')
    .description('List available hooks')
    .action(async () => {
      const { HOOK_REGISTRY } = await import('./hooks/registry.js');
      console.log('Available hooks:');
      for (const [id, HookClass] of Object.entries(HOOK_REGISTRY)) {
        const description = HookClass.metadata?.description ?? `${id} hook`;
        const padding = ' '.repeat(Math.max(0, 30 - id.length));
        console.log(`  ${id}${padding}- ${description}`);
      }
    });

  // Add stats command
  program
    .command('stats')
    .description('Show hook execution statistics')
    .action(async () => {
      const { printHookReport } = await import('./hooks/logging.js');
      await printHookReport();
    });

  // Add recent command
  program
    .command('recent [limit]')
    .description('Show recent hook executions')
    .action(async (limit?: string) => {
      const { getRecentExecutions } = await import('./hooks/logging.js');
      const executions = await getRecentExecutions(limit !== undefined ? parseInt(limit) : 20);

      if (executions.length === 0) {
        console.log('No recent hook executions found.');
        return;
      }

      console.log('\n=== Recent Hook Executions ===\n');
      for (const exec of executions) {
        const status = exec.exitCode === 0 ? '✓' : '✗';
        const time = new Date(exec.timestamp).toLocaleString();
        console.log(`${status} ${exec.hookName} - ${time} (${exec.executionTime}ms)`);
      }
    });

  // Add profile command
  program
    .command('profile [hook]')
    .description('Profile hook performance (time and output)')
    .option('-i, --iterations <n>', 'Number of iterations', '1')
    .action(async (hook, options) => {
      // Parse iterations to number (CLI provides string)
      const iterations = parseInt(options.iterations, 10);
      if (isNaN(iterations) || iterations < 1) {
        console.error('Error: Iterations must be a positive number');
        process.exit(1);
      }
      await profileHooks(hook, { iterations });
    });

  // Add disable command
  program
    .command('disable [hook-name]')
    .description('Disable a hook for this session')
    .action(async (hookName?: string) => {
      const sessionManager = new SessionHookManager();
      const sessionId = await getSessionIdentifier();
      
      if (sessionId === null) {
        console.error('❌ Cannot determine current Claude Code session.');
        console.error('This command must be run from within an active Claude Code session.');
        process.exit(1);
      }

      const projectHooks = await getProjectHooks();
      
      if (hookName === undefined) {
        console.log('Available hooks for this project:');
        for (const hook of projectHooks) {
          const isDisabled = await sessionManager.isHookDisabled(sessionId, hook);
          const status = isDisabled ? '🔒' : '✅';
          console.log(`  ${status} ${hook}`);
        }
        console.log('\nUsage: claudekit-hooks disable [hook-name]');
        return;
      }

      const matchResult = await resolveHookName(hookName, projectHooks);
      
      switch (matchResult.type) {
        case 'exact':
          if (matchResult.hook !== undefined) {
            const isAlreadyDisabled = await sessionManager.isHookDisabled(sessionId, matchResult.hook);
            if (isAlreadyDisabled) {
              console.log(`⚠️ Hook '${matchResult.hook}' is already disabled for this session`);
            } else {
              await sessionManager.disableHook(sessionId, matchResult.hook);
              console.log(`🔒 Disabled ${matchResult.hook} for this session`);
            }
          }
          break;
          
        case 'multiple':
          console.log(`🤔 Multiple hooks match '${hookName}':`);
          for (const hook of matchResult.hooks ?? []) {
            console.log(`  ${hook}`);
          }
          console.log(`Be more specific: claudekit-hooks disable [exact-name]`);
          break;
          
        case 'not-configured':
          if (matchResult.hook !== undefined) {
            console.log(`⚪ Hook '${matchResult.hook}' is not configured for this project`);
            console.log('This hook exists but is not configured in .claude/settings.json');
          }
          break;
          
        case 'none':
          console.log(`❌ No hook found matching '${hookName}'`);
          if (projectHooks.length === 0) {
            console.log('No hooks are configured for this project in .claude/settings.json');
          } else {
            console.log('Available hooks configured for this project:');
            for (const hook of matchResult.suggestions ?? []) {
              console.log(`  ${hook}`);
            }
            console.log('Try: claudekit-hooks disable [exact-name]');
          }
          break;
      }
    });

  // Add enable command  
  program
    .command('enable [hook-name]')
    .description('Enable a hook for this session')
    .action(async (hookName?: string) => {
      const sessionManager = new SessionHookManager();
      const sessionId = await getSessionIdentifier();
      
      if (sessionId === null) {
        console.error('❌ Cannot determine current Claude Code session.');
        console.error('This command must be run from within an active Claude Code session.');
        process.exit(1);
      }

      const projectHooks = await getProjectHooks();
      
      if (hookName === undefined) {
        console.log('Available hooks for this project:');
        for (const hook of projectHooks) {
          const isDisabled = await sessionManager.isHookDisabled(sessionId, hook);
          const status = isDisabled ? '🔒' : '✅';
          console.log(`  ${status} ${hook}`);
        }
        console.log('\nUsage: claudekit-hooks enable [hook-name]');
        return;
      }

      const matchResult = await resolveHookName(hookName, projectHooks);
      
      switch (matchResult.type) {
        case 'exact':
          if (matchResult.hook !== undefined) {
            const isDisabled = await sessionManager.isHookDisabled(sessionId, matchResult.hook);
            if (!isDisabled) {
              console.log(`ℹ️ Hook '${matchResult.hook}' is not currently disabled for this session`);
            } else {
              await sessionManager.enableHook(sessionId, matchResult.hook);
              console.log(`✅ Re-enabled ${matchResult.hook} for this session`);
            }
          }
          break;
          
        case 'multiple':
          console.log(`🤔 Multiple hooks match '${hookName}':`);
          for (const hook of matchResult.hooks ?? []) {
            console.log(`  ${hook}`);
          }
          console.log(`Be more specific: claudekit-hooks enable [exact-name]`);
          break;
          
        case 'not-configured':
          if (matchResult.hook !== undefined) {
            console.log(`⚪ Hook '${matchResult.hook}' is not configured for this project`);
            console.log('This hook exists but is not configured in .claude/settings.json');
          }
          break;
          
        case 'none':
          console.log(`❌ No hook found matching '${hookName}'`);
          if (projectHooks.length === 0) {
            console.log('No hooks are configured for this project in .claude/settings.json');
          } else {
            console.log('Available hooks configured for this project:');
            for (const hook of matchResult.suggestions ?? []) {
              console.log(`  ${hook}`);
            }
            console.log('Try: claudekit-hooks enable [exact-name]');
          }
          break;
      }
    });

  // Add status command
  program
    .command('status [hook-name]')
    .description('Show status of a hook for this session')
    .action(async (hookName?: string) => {
      const sessionManager = new SessionHookManager();
      const sessionId = await getSessionIdentifier();
      
      if (sessionId === null) {
        console.error('❌ Cannot determine current Claude Code session.');
        console.error('This command must be run from within an active Claude Code session.');
        process.exit(1);
      }

      const projectHooks = await getProjectHooks();
      
      if (hookName === undefined) {
        console.log('Hook status for this project:');
        for (const hook of projectHooks) {
          const isDisabled = await sessionManager.isHookDisabled(sessionId, hook);
          const status = isDisabled ? '🔒 disabled' : '✅ enabled';
          console.log(`  ${hook}: ${status}`);
        }
        console.log('\nUsage: claudekit-hooks status [hook-name]');
        return;
      }

      const matchResult = await resolveHookName(hookName, projectHooks);
      
      switch (matchResult.type) {
        case 'exact':
          if (matchResult.hook !== undefined) {
            const isDisabled = await sessionManager.isHookDisabled(sessionId, matchResult.hook);
            const status = isDisabled ? '🔒 disabled' : '✅ enabled';
            console.log(`${matchResult.hook}: ${status}`);
          }
          break;
          
        case 'multiple':
          console.log(`🤔 Multiple hooks match '${hookName}':`);
          for (const hook of matchResult.hooks ?? []) {
            const isDisabled = await sessionManager.isHookDisabled(sessionId, hook);
            const status = isDisabled ? '🔒 disabled' : '✅ enabled';
            console.log(`  ${hook}: ${status}`);
          }
          break;
          
        case 'not-configured':
          if (matchResult.hook !== undefined) {
            console.log(`${matchResult.hook}: ⚪ not configured`);
            console.log('This hook exists but is not configured in .claude/settings.json');
          }
          break;
          
        case 'none':
          console.log(`❌ No hook found matching '${hookName}'`);
          if (projectHooks.length === 0) {
            console.log('No hooks are configured for this project in .claude/settings.json');
          } else {
            console.log('Available hooks configured for this project:');
            for (const hook of matchResult.suggestions ?? []) {
              console.log(`  ${hook}`);
            }
            console.log('Try: claudekit-hooks status [exact-name]');
          }
          break;
      }
    });

  // Add run command (default)
  program
    .command('run <hook>')
    .description('Run a specific hook')
    .option('--debug', 'Enable debug logging')
    .action(async (hookName: string, options) => {
      const globalOpts = program.opts();
      const hookRunner = new HookRunner(
        globalOpts['config'] as string | undefined,
        globalOpts['debug'] === true || options.debug === true
      );
      const exitCode = await hookRunner.run(hookName);

      // Force process exit to ensure clean shutdown
      // Use setImmediate to allow any final I/O to complete
      setImmediate(() => {
        process.exit(exitCode);
      });
    });

  // Handle --list option
  program.hook('preAction', async (thisCommand) => {
    if (thisCommand.opts()['list'] === true) {
      const { HOOK_REGISTRY } = await import('./hooks/registry.js');
      console.log('Available hooks:');
      for (const [id, HookClass] of Object.entries(HOOK_REGISTRY)) {
        const description = HookClass.metadata?.description ?? `${id} hook`;
        const padding = ' '.repeat(Math.max(0, 30 - id.length));
        console.log(`  ${id}${padding}- ${description}`);
      }
      process.exit(0);
    }
  });

  return program;
}

// Entry point - check if this file is being run directly
// In CommonJS build, import.meta.url is undefined, so we check __filename
let isMainModule = false;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  isMainModule = import.meta.url === `file://${process.argv[1]}`;
} else if (typeof __filename !== 'undefined') {
  isMainModule = __filename === process.argv[1];
}

if (isMainModule) {
  createHooksCLI().parse(process.argv);
}
