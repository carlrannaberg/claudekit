#!/usr/bin/env node
import { Command } from 'commander';
import { createRequire } from 'module';
import { Logger } from './utils/logger.js';

// For ESM, we need to create require to load package.json
// In CommonJS build, import.meta.url is undefined, so we use __filename fallback
let requireUrl: string;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  requireUrl = import.meta.url;
} else if (typeof __filename !== 'undefined') {
  requireUrl = __filename;
} else {
  requireUrl = `file://${process.cwd()}/package.json`;
}
const require = createRequire(requireUrl);
const packageJson = require('../package.json');

const program = new Command();
const logger = new Logger();

// Global options state
interface GlobalOptions {
  verbose?: boolean | undefined;
  quiet?: boolean | undefined;
  dryRun?: boolean | undefined;
}

let globalOptions: GlobalOptions = {};

program
  .name('claudekit')
  .description('CLI tools for claudekit development workflow')
  .version(packageJson.version)
  .option('-v, --verbose', 'enable verbose output')
  .option('-q, --quiet', 'suppress non-error output')
  .option('-d, --dry-run', 'perform a dry run without making changes')
  .hook('preAction', (thisCommand) => {
    // Capture global options before any command runs
    const opts = thisCommand.opts();
    globalOptions = {
      verbose: opts['verbose'] as boolean | undefined,
      quiet: opts['quiet'] as boolean | undefined,
      dryRun: opts['dryRun'] as boolean | undefined,
    };

    // Configure logger based on global options
    if (globalOptions.quiet === true) {
      logger.setLevel('error');
    } else if (globalOptions.verbose === true) {
      logger.setLevel('debug');
    }
  });

// Setup command - initializes claudekit in a project
program
  .command('setup')
  .description('Initialize claudekit in the current directory')
  .option('-f, --force', 'overwrite existing configuration')
  .option('-t, --template <template>', 'use a specific template', 'default')
  .option('-y, --yes', 'automatic yes to prompts (use default options)')
  .option('--all', 'install all features without prompting')
  .option('--skip-agents', 'skip subagent installation')
  .option('--commands <list>', 'comma-separated list of command IDs to install')
  .option('--hooks <list>', 'comma-separated list of hook IDs to install')
  .option(
    '--agents <list>',
    'comma-separated list of agent IDs to install (e.g., typescript-expert,react-expert)'
  )
  .option('--project <path>', 'target directory for project installation')
  .option('--user', 'install in user directory (~/.claude) instead of project')
  .option('--select-individual', 'use legacy individual component selection instead of groups')
  .action(async (options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      const { setup } = await import('./commands/setup.js');
      await setup(mergedOptions);
    } catch (error) {
      logger.error(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Add command - adds new hooks or commands
program
  .command('add <type> <name>')
  .description('Add a new hook or command to the project')
  .option('-t, --template <template>', 'use a specific template')
  .option('-p, --path <path>', 'custom path for the file')
  .action(async (type, name, options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      if (globalOptions.dryRun === true) {
        logger.info(`Dry run mode: Would add ${type} "${name}"`);
        return;
      }
      const { add } = await import('./commands/add.js');
      await add(type, name, mergedOptions);
    } catch (error) {
      logger.error(`Add failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Remove command - removes hooks or commands
program
  .command('remove <type> <name>')
  .description('Remove a hook or command from the project')
  .option('-f, --force', 'skip confirmation prompt')
  .action(async (type, name, options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      if (globalOptions.dryRun === true) {
        logger.info(`Dry run mode: Would remove ${type} "${name}"`);
        return;
      }
      const { remove } = await import('./commands/remove.js');
      await remove(type, name, mergedOptions);
    } catch (error) {
      logger.error(`Remove failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Update command - updates hooks or commands
program
  .command('update <type> <name>')
  .description('Update a hook or command configuration')
  .option('-c, --config <json>', 'configuration as JSON string')
  .option('-f, --file <path>', 'configuration from file')
  .action(async (type, name, options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      if (globalOptions.dryRun === true) {
        logger.info(`Dry run mode: Would update ${type} "${name}"`);
        return;
      }
      const { update } = await import('./commands/update.js');
      await update(type, name, mergedOptions);
    } catch (error) {
      logger.error(`Update failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// List command - lists hooks, commands, or settings
program
  .command('list [type]')
  .description('List hooks, commands, or settings')
  .option('-f, --format <format>', 'output format (json, table)', 'table')
  .option('--filter <pattern>', 'filter results by pattern')
  .action(async (type = 'all', options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      const { list } = await import('./commands/list.js');
      await list(type, mergedOptions);
    } catch (error) {
      logger.error(`List failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Legacy commands for backward compatibility - removed init command

program
  .command('doctor')
  .description('Run project validation checks')
  .option('-t, --type <type>', 'validation type', 'all')
  .option('--prerequisites', 'check development prerequisites')
  .action(async (options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options };
      const { doctor } = await import('./commands/doctor.js');
      await doctor(mergedOptions);
    } catch (error) {
      logger.error(`Validation failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  });

// Lint subagents command
program
  .command('lint-subagents [directory]')
  .description('Lint subagent markdown files for frontmatter issues')
  .action(async (directory = '.claude/agents', options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options, root: directory };
      const { lintSubagents } = await import('./commands/lint-subagents.js');
      await lintSubagents(mergedOptions);
    } catch (error) {
      logger.error(
        `Lint subagents failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Lint commands command
program
  .command('lint-commands [directory]')
  .description('Lint slash command markdown files for frontmatter issues')
  .action(async (directory = '.claude/commands', options) => {
    try {
      const mergedOptions = { ...globalOptions, ...options, root: directory };
      const { lintCommands } = await import('./commands/lint-commands.js');
      await lintCommands(mergedOptions);
    } catch (error) {
      logger.error(
        `Lint commands failed: ${error instanceof Error ? error.message : String(error)}`
      );
      process.exit(1);
    }
  });

// Function to run the CLI - only execute if this is the main module
export async function runCli(): Promise<void> {
  // Register show commands
  try {
    const { registerShowCommands } = await import('./commands/show.js');
    registerShowCommands(program);
  } catch (error) {
    logger.debug(
      `Show commands not available: ${error instanceof Error ? error.message : String(error)}`
    );
    // Don't fail CLI startup if show commands can't be registered
  }

  // Parse command line arguments
  program.parse(process.argv);

  // Show help if no command provided
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

// Auto-run if this file is executed directly
// In CommonJS build, import.meta.url is undefined, so we check __filename
let isMainModule = false;
if (typeof import.meta !== 'undefined' && import.meta.url) {
  isMainModule = import.meta.url === `file://${process.argv[1]}`;
} else if (typeof __filename !== 'undefined') {
  isMainModule = __filename === process.argv[1];
}

if (isMainModule) {
  runCli().catch((error) => {
    logger.error(`CLI failed to start: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

// Export the program for programmatic use
export default program;
