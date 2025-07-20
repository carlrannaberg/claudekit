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
  
  if (options.verbose) {
    logger.setLevel('debug');
  } else if (options.quiet) {
    logger.setLevel('error');
  }
  
  logger.debug(`Listing ${type} with options:`, options);
  
  const validTypes = ['all', 'hooks', 'commands', 'settings', 'config'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
  }
  
  const operations = [];
  
  // Prepare operations based on type
  if (type === 'all' || type === 'hooks') {
    operations.push({
      name: 'Listing hooks',
      operation: () => listHooks(options)
    });
  }
  
  if (type === 'all' || type === 'commands') {
    operations.push({
      name: 'Listing commands',
      operation: () => listCommands(options)
    });
  }
  
  if (type === 'all' || type === 'settings' || type === 'config') {
    operations.push({
      name: 'Listing configuration',
      operation: () => listConfig(options)
    });
  }
  
  // Execute operations with progress
  const operationResults = await progress.withSteps(operations, {
    quiet: options.quiet,
    verbose: options.verbose
  });
  
  // Map results back to expected structure
  const results: any = {};
  let resultIndex = 0;
  
  if (type === 'all' || type === 'hooks') {
    results.hooks = operationResults[resultIndex++];
  }
  
  if (type === 'all' || type === 'commands') {
    results.commands = operationResults[resultIndex++];
  }
  
  if (type === 'all' || type === 'settings' || type === 'config') {
    results.config = operationResults[resultIndex++];
  }
  
  // Output results
  if (options.format === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else {
    displayTable(results, type);
  }
}

async function listHooks(options: ListOptions): Promise<any[]> {
  const hooksDir = '.claude/hooks';
  const hooks: any[] = [];
  
  if (!await fs.pathExists(hooksDir)) {
    return hooks;
  }
  
  const files = await fs.readdir(hooksDir);
  const pattern = options.filter ? new RegExp(options.filter, 'i') : null;
  
  for (const file of files) {
    if (!file.endsWith('.sh')) continue;
    if (pattern && !pattern.test(file)) continue;
    
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

async function listCommands(options: ListOptions): Promise<any[]> {
  const commandsDir = '.claude/commands';
  const commands: any[] = [];
  
  if (!await fs.pathExists(commandsDir)) {
    return commands;
  }
  
  const files = await fs.readdir(commandsDir);
  const pattern = options.filter ? new RegExp(options.filter, 'i') : null;
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    if (pattern && !pattern.test(file)) continue;
    
    const name = path.basename(file, '.md');
    const filePath = path.join(commandsDir, file);
    const stats = await fs.stat(filePath);
    
    // Try to extract description from frontmatter
    let description = '';
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
      if (match && match[1]) {
        const frontmatter = match[1];
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch && descMatch[1]) {
          description = descMatch[1].trim();
        }
      }
    } catch {
      // Ignore errors reading file
    }
    
    commands.push({
      name,
      type: 'command',
      path: filePath,
      description,
      size: stats.size,
      modified: stats.mtime,
    });
  }
  
  return commands;
}

async function listConfig(options: ListOptions): Promise<any> {
  try {
    const config = await loadConfig(process.cwd());
    const pattern = options.filter ? new RegExp(options.filter, 'i') : null;
    
    if (pattern) {
      // Filter config keys
      const filtered: any = {};
      for (const [key, value] of Object.entries(config)) {
        if (pattern.test(key)) {
          filtered[key] = value;
        }
      }
      return filtered;
    }
    
    return config;
  } catch (error) {
    return {};
  }
}

function displayTable(results: any, type: string): void {
  
  // Display hooks
  if (results.hooks && results.hooks.length > 0) {
    console.log(Colors.bold('\nHooks:'));
    console.log(Colors.dim('─'.repeat(60)));
    
    for (const hook of results.hooks) {
      const exec = hook.executable ? Colors.success('✓') : Colors.error('✗');
      const size = formatSize(hook.size);
      const date = formatDate(hook.modified);
      
      console.log(`  ${exec} ${Colors.accent(hook.name.padEnd(20))} ${size.padStart(8)} ${Colors.dim(date)}`);
    }
  } else if (type === 'hooks' || type === 'all') {
    console.log(Colors.dim('\nNo hooks found'));
  }
  
  // Display commands
  if (results.commands && results.commands.length > 0) {
    console.log(Colors.bold('\nCommands:'));
    console.log(Colors.dim('─'.repeat(60)));
    
    for (const cmd of results.commands) {
      const size = formatSize(cmd.size);
      const desc = cmd.description ? Colors.dim(` - ${cmd.description}`) : '';
      
      console.log(`  ${Colors.accent(cmd.name.padEnd(20))} ${size.padStart(8)}${desc}`);
    }
  } else if (type === 'commands' || type === 'all') {
    console.log(Colors.dim('\nNo commands found'));
  }
  
  // Display config
  if (results.config && Object.keys(results.config).length > 0) {
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
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}