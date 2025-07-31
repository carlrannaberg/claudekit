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
    .option('--list', 'List available hooks');
    
  // Add list command
  program
    .command('list')
    .description('List available hooks')
    .action(() => {
      console.log('Available hooks:');
      console.log('  typecheck      - TypeScript type checking');
      console.log('  no-any         - Forbid any types in TypeScript');
      console.log('  eslint         - ESLint code validation');
      console.log('  auto-checkpoint - Git auto-checkpoint on stop');
      console.log('  run-related-tests - Run tests for changed files');
      console.log('  project-validation - Full project validation');
      console.log('  validate-todo-completion - Validate todo completions');
    });
    
  // Add run command (default)
  program
    .command('run <hook>')
    .description('Run a specific hook')
    .action(async (hookName: string) => {
      const hookRunner = new HookRunner(program.opts().config);
      const exitCode = await hookRunner.run(hookName);
      process.exit(exitCode);
    });
    
  // Handle --list option
  program.hook('preAction', (thisCommand) => {
    if (thisCommand.opts().list) {
      console.log('Available hooks:');
      console.log('  typecheck      - TypeScript type checking');
      console.log('  no-any         - Forbid any types in TypeScript');
      console.log('  eslint         - ESLint code validation');
      console.log('  auto-checkpoint - Git auto-checkpoint on stop');
      console.log('  run-related-tests - Run tests for changed files');
      console.log('  project-validation - Full project validation');
      console.log('  validate-todo-completion - Validate todo completions');
      process.exit(0);
    }
  });
    
  return program;
}

// Entry point
if (import.meta.url === `file://${process.argv[1]}`) {
  createHooksCLI().parse(process.argv);
}