#!/usr/bin/env node

/**
 * ClaudeKit Hooks CLI
 * Command-line interface for managing and executing Claude Code hooks
 */

import { Command } from 'commander';
import { setImmediate } from 'node:timers';
import { HookRunner } from './hooks/runner.js';
import { profileHooks } from './hooks/profile.js';

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
      await profileHooks(hook, options);
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
