import { Logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import { progress } from '../utils/progress.js';
import path from 'path';
import fs from 'fs-extra';
import { Colors } from '../utils/colors.js';

interface ListOptions {
  format?: 'table' | 'json';
  filter?: string;
  verbose?: boolean;
  quiet?: boolean;
}

/**
 * List hooks, commands, or settings
 */
export async function list(type: string = 'all', options: ListOptions = {}): Promise<void> {
  const logger = new Logger();

  if (options.verbose === true) {
    logger.setLevel('debug');
  } else if (options.quiet === true) {
    logger.setLevel('error');
  }

  logger.debug(`Listing ${type} with options:`, options);

  const validTypes = ['all', 'hooks', 'commands', 'settings', 'config'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
  }

  type OperationResult = HookInfo[] | CommandInfo[] | Record<string, unknown>;
  const operations: Array<{ name: string; operation: () => Promise<OperationResult> }> = [];

  // Prepare operations based on type
  if (type === 'all' || type === 'hooks') {
    operations.push({
      name: 'Listing hooks',
      operation: () => listHooks(options) as Promise<OperationResult>,
    });
  }

  if (type === 'all' || type === 'commands') {
    operations.push({
      name: 'Listing commands',
      operation: () => listCommands(options) as Promise<OperationResult>,
    });
  }

  if (type === 'all' || type === 'settings' || type === 'config') {
    operations.push({
      name: 'Listing configuration',
      operation: () => listConfig(options) as Promise<OperationResult>,
    });
  }

  // Execute operations with progress
  const operationResults = await progress.withSteps(operations, {
    quiet: options.quiet,
    verbose: options.verbose,
  });

  // Map results back to expected structure
  const results: ListResults = {};
  let resultIndex = 0;

  if (type === 'all' || type === 'hooks') {
    const hooksResult = operationResults[resultIndex++];
    if (
      Array.isArray(hooksResult) &&
      hooksResult.every((item): item is HookInfo => 'executable' in item)
    ) {
      results.hooks = hooksResult;
    }
  }

  if (type === 'all' || type === 'commands') {
    const commandsResult = operationResults[resultIndex++];
    if (
      Array.isArray(commandsResult) &&
      commandsResult.every((item): item is CommandInfo => 'description' in item)
    ) {
      results.commands = commandsResult;
    }
  }

  if (type === 'all' || type === 'settings' || type === 'config') {
    const configResult = operationResults[resultIndex++];
    if (configResult && typeof configResult === 'object' && !Array.isArray(configResult)) {
      results.config = configResult as Record<string, unknown>;
    }
  }

  // Output results
  if (options.format === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else {
    displayTable(results, type);
  }
}

interface HookInfo {
  name: string;
  type: string;
  path: string;
  executable: boolean;
  size: number;
  modified: Date;
}

async function listHooks(options: ListOptions): Promise<HookInfo[]> {
  const hooksDir = '.claude/hooks';
  const hooks: HookInfo[] = [];

  if (!(await fs.pathExists(hooksDir))) {
    return hooks;
  }

  const files = await fs.readdir(hooksDir);
  const pattern =
    options.filter !== undefined && options.filter !== '' ? new RegExp(options.filter, 'i') : null;

  for (const file of files) {
    if (!file.endsWith('.sh')) {
      continue;
    }
    if (pattern !== null && !pattern.test(file)) {
      continue;
    }

    const name = path.basename(file, '.sh');
    const filePath = path.join(hooksDir, file);
    const stats = await fs.stat(filePath);

    hooks.push({
      name,
      type: 'hook',
      path: filePath,
      executable: (stats.mode & 0o111) !== 0,
      size: stats.size,
      modified: stats.mtime,
    });
  }

  return hooks;
}

interface CommandInfo {
  name: string;
  type: string;
  path: string;
  description: string;
  size: number;
  modified: Date;
}

async function listCommands(options: ListOptions): Promise<CommandInfo[]> {
  const commandsDir = '.claude/commands';
  const commands: CommandInfo[] = [];

  if (!(await fs.pathExists(commandsDir))) {
    return commands;
  }

  const pattern =
    options.filter !== undefined && options.filter !== '' ? new RegExp(options.filter, 'i') : null;

  // Recursively find all .md files in commands directory
  async function findCommandFiles(dir: string, prefix: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        // Recurse into subdirectories
        const newPrefix = prefix ? `${prefix}:${entry.name}` : entry.name;
        await findCommandFiles(fullPath, newPrefix);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const baseName = path.basename(entry.name, '.md');
        const commandName = prefix ? `${prefix}:${baseName}` : baseName;
        
        if (pattern !== null && !pattern.test(commandName)) {
          continue;
        }
        
        const stats = await fs.stat(fullPath);

        // Try to extract description from frontmatter
        let description = '';
        try {
          const content = await fs.readFile(fullPath, 'utf8');
          const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
          if (match !== null && match[1] !== undefined && match[1] !== '') {
            const frontmatter = match[1];
            const descMatch = frontmatter.match(/description:\s*(.+)/);
            if (descMatch !== null && descMatch[1] !== undefined && descMatch[1] !== '') {
              description = descMatch[1].trim();
            }
          }
        } catch {
          // Ignore errors reading file
        }

        commands.push({
          name: commandName,
          type: 'command',
          path: fullPath,
          description,
          size: stats.size,
          modified: stats.mtime,
        });
      }
    }
  }

  // Start the recursive search from the commands directory
  await findCommandFiles(commandsDir);

  return commands;
}

async function listConfig(options: ListOptions): Promise<Record<string, unknown>> {
  try {
    const config = await loadConfig(process.cwd());
    const pattern =
      options.filter !== undefined && options.filter !== ''
        ? new RegExp(options.filter, 'i')
        : null;

    if (pattern !== null) {
      // Filter config keys
      const filtered: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(config)) {
        if (pattern.test(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    }

    return config;
  } catch {
    return {};
  }
}

// Interface needs to be defined before usage
interface ListResults {
  hooks?: Array<{
    name: string;
    type: string;
    path: string;
    executable: boolean;
    size: number;
    modified: Date;
  }>;
  commands?: Array<{
    name: string;
    type: string;
    path: string;
    description: string;
    size: number;
    modified: Date;
  }>;
  config?: Record<string, unknown>;
}

function displayTable(results: ListResults, type: string): void {
  // Display hooks
  if (results.hooks !== undefined && results.hooks.length > 0) {
    console.log(Colors.bold('\nHooks:'));
    console.log(Colors.dim('─'.repeat(60)));

    for (const hook of results.hooks) {
      const exec = hook.executable === true ? Colors.success('✓') : Colors.error('✗');
      const size = formatSize(hook.size);
      const date = formatDate(hook.modified);

      console.log(
        `  ${exec} ${Colors.accent(hook.name.padEnd(20))} ${size.padStart(8)} ${Colors.dim(date)}`
      );
    }
  } else if (type === 'hooks' || type === 'all') {
    console.log(Colors.dim('\nNo hooks found'));
  }

  // Display commands
  if (results.commands !== undefined && results.commands.length > 0) {
    console.log(Colors.bold('\nCommands:'));
    console.log(Colors.dim('─'.repeat(60)));

    for (const cmd of results.commands) {
      const size = formatSize(cmd.size);
      const desc = cmd.description !== '' ? Colors.dim(` - ${cmd.description}`) : '';

      console.log(`  ${Colors.accent(cmd.name.padEnd(20))} ${size.padStart(8)}${desc}`);
    }
  } else if (type === 'commands' || type === 'all') {
    console.log(Colors.dim('\nNo commands found'));
  }

  // Display config
  if (results.config !== undefined && Object.keys(results.config).length > 0) {
    console.log(Colors.bold('\nConfiguration:'));
    console.log(Colors.dim('─'.repeat(60)));

    const configStr = JSON.stringify(results.config, null, 2);
    const lines = configStr.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }
  } else if (type === 'settings' || type === 'config' || type === 'all') {
    console.log(Colors.dim('\nNo configuration found'));
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes}B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return 'today';
  }
  if (days === 1) {
    return 'yesterday';
  }
  if (days < 7) {
    return `${days} days ago`;
  }
  if (days < 30) {
    return `${Math.floor(days / 7)} weeks ago`;
  }
  if (days < 365) {
    return `${Math.floor(days / 30)} months ago`;
  }
  return `${Math.floor(days / 365)} years ago`;
}
