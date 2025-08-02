#!/usr/bin/env node

/**
 * ClaudeKit Hooks CLI
 * Command-line interface for managing and executing Claude Code hooks
 */

import { Command } from 'commander';
import { HookRunner } from './hooks/runner.js';

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
    .action(() => {
      console.log('Available hooks:');
      console.log('  typecheck-changed     - TypeScript type checking on changed files');
      console.log('  check-any-changed     - Forbid any types in changed TypeScript files');
      console.log('  lint-changed          - ESLint validation on changed files');
      console.log('  test-changed          - Run tests for changed files');
      console.log('  create-checkpoint     - Git auto-checkpoint on stop');
      console.log('  check-todos           - Validate todo completions');
      console.log('  typecheck-project     - TypeScript validation on entire project');
      console.log('  lint-project          - ESLint validation on entire project');
      console.log('  test-project          - Run full test suite');
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
      process.exit(exitCode);
    });

  // Handle --list option
  program.hook('preAction', (thisCommand) => {
    if (thisCommand.opts()['list'] === true) {
      console.log('Available hooks:');
      console.log('  typecheck-changed     - TypeScript type checking on changed files');
      console.log('  check-any-changed     - Forbid any types in changed TypeScript files');
      console.log('  lint-changed          - ESLint validation on changed files');
      console.log('  test-changed          - Run tests for changed files');
      console.log('  create-checkpoint     - Git auto-checkpoint on stop');
      console.log('  check-todos           - Validate todo completions');
      console.log('  typecheck-project     - TypeScript validation on entire project');
      console.log('  lint-project          - ESLint validation on entire project');
      console.log('  test-project          - Run full test suite');
      process.exit(0);
    }
  });

  return program;
}

// Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  createHooksCLI().parse(process.argv);
}
