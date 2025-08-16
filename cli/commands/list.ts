import { Logger } from '../utils/logger.js';
import { loadConfig } from '../utils/config.js';
import { progress } from '../utils/progress.js';
import path from 'path';
import fs from 'fs-extra';
import { Colors } from '../utils/colors.js';
import { HOOK_REGISTRY } from '../hooks/registry.js';

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

  const validTypes = ['all', 'hooks', 'commands', 'agents', 'config'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
  }

  type OperationResult = HookInfo[] | CommandInfo[] | AgentInfo[] | Record<string, unknown>;
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

  if (type === 'all' || type === 'agents') {
    operations.push({
      name: 'Listing agents',
      operation: () => listAgents(options) as Promise<OperationResult>,
    });
  }

  if (type === 'all' || type === 'config') {
    operations.push({
      name: 'Listing configuration',
      operation: () => listConfig(options) as Promise<OperationResult>,
    });
  }

  // Execute operations with progress
  const operationResults = await progress.withSteps(operations, {
    quiet: options.quiet === true || options.format === 'json', // Suppress progress output for JSON format
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
      commandsResult.every((item): item is CommandInfo => 'description' in item && !('category' in item))
    ) {
      results.commands = commandsResult;
    }
  }

  if (type === 'all' || type === 'agents') {
    const agentsResult = operationResults[resultIndex++];
    if (
      Array.isArray(agentsResult) &&
      agentsResult.every((item): item is AgentInfo => 'category' in item)
    ) {
      results.agents = agentsResult;
    }
  }

  if (type === 'all' || type === 'config') {
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
  const hooks: HookInfo[] = [];
  const pattern =
    options.filter !== undefined && options.filter !== '' ? new RegExp(options.filter, 'i') : null;

  // List embedded hooks from the registry
  for (const [name] of Object.entries(HOOK_REGISTRY)) {
    if (pattern !== null && !pattern.test(name)) {
      continue;
    }

    hooks.push({
      name,
      type: 'embedded-hook',
      path: `embedded:${name}`,
      executable: true, // Embedded hooks are always executable
      size: 0, // Size not applicable for embedded hooks
      modified: new Date(), // Use current date for embedded hooks
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
  tokens: number;
  modified: Date;
}

interface AgentInfo {
  name: string;
  type: string;
  path: string;
  description: string;
  category: string;
  size: number;
  tokens: number;
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

        // Extract frontmatter data
        const { frontmatter, tokens } = await extractFrontmatter(fullPath);
        const description = frontmatter.description ?? '';

        commands.push({
          name: commandName,
          type: 'command',
          path: fullPath,
          description,
          size: stats.size,
          tokens,
          modified: stats.mtime,
        });
      }
    }
  }

  // Start the recursive search from the commands directory
  await findCommandFiles(commandsDir);

  return commands;
}

async function listAgents(options: ListOptions): Promise<AgentInfo[]> {
  const agentsDir = '.claude/agents';
  const agents: AgentInfo[] = [];

  if (!(await fs.pathExists(agentsDir))) {
    return agents;
  }

  const pattern =
    options.filter !== undefined && options.filter !== '' ? new RegExp(options.filter, 'i') : null;

  // Recursively find all .md files in agents directory
  async function findAgentFiles(dir: string, category: string = ''): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      // Get stats to properly handle symlinks
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        // Use directory name as category
        await findAgentFiles(fullPath, entry.name);
      } else if (stats.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
        const baseName = path.basename(entry.name, '.md');
        const agentName = baseName;

        // Extract frontmatter data
        const { frontmatter, tokens } = await extractFrontmatter(fullPath);
        const displayName = frontmatter.name ?? agentName; // Use frontmatter name or fallback to filename
        const description = frontmatter.description ?? '';
        
        // Use frontmatter filter after we have the actual name
        if (pattern !== null && !pattern.test(displayName)) {
          continue;
        }

        agents.push({
          name: displayName,
          type: 'agent',
          path: fullPath,
          description,
          category: category || 'general',
          size: stats.size,
          tokens,
          modified: stats.mtime,
        });
      }
    }
  }

  // Start the recursive search from the agents directory
  await findAgentFiles(agentsDir);

  return agents;
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
    tokens: number;
    modified: Date;
  }>;
  agents?: Array<{
    name: string;
    type: string;
    path: string;
    description: string;
    category: string;
    size: number;
    tokens: number;
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
      console.log(`  ${Colors.accent(hook.name)}`);
    }
  } else if (type === 'hooks' || type === 'all') {
    console.log(Colors.dim('\nNo hooks found'));
  }

  // Display commands
  if (results.commands !== undefined && results.commands.length > 0) {
    console.log(Colors.bold('\nCommands:'));
    console.log(Colors.dim('─'.repeat(60)));

    for (const cmd of results.commands) {
      const tokens = formatTokens(cmd.tokens ?? estimateTokens(''));

      console.log(`  ${Colors.accent(cmd.name.padEnd(30))} ${tokens.padStart(12)}`);
    }
  } else if (type === 'commands' || type === 'all') {
    console.log(Colors.dim('\nNo commands found'));
  }

  // Display agents
  if (results.agents !== undefined && results.agents.length > 0) {
    console.log(Colors.bold('\nAgents:'));
    console.log(Colors.dim('─'.repeat(60)));

    // Group agents by category
    const grouped = results.agents.reduce((acc, agent) => {
      if (!acc[agent.category]) {
        acc[agent.category] = [];
      }
      const categoryAgents = acc[agent.category];
      if (categoryAgents !== undefined) {
        categoryAgents.push(agent);
      }
      return acc;
    }, {} as Record<string, typeof results.agents>);

    // Display by category
    for (const [category, categoryAgents] of Object.entries(grouped)) {
      if (categoryAgents !== undefined && categoryAgents.length > 0) {
        console.log(`  ${Colors.dim(`${category}:`)}`);
        for (const agent of categoryAgents) {
          const tokens = formatTokens(agent.tokens);
          console.log(`    ${Colors.accent(agent.name.padEnd(25))} ${tokens.padStart(12)}`);
        }
      }
    }
  } else if (type === 'agents' || type === 'all') {
    console.log(Colors.dim('\nNo agents found'));
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
  } else if (type === 'config' || type === 'all') {
    console.log(Colors.dim('\nNo configuration found'));
  }
}

interface FrontmatterData {
  name?: string;
  description?: string;
  category?: string;
  [key: string]: unknown;
}

/**
 * Extract frontmatter data from a markdown file
 */
async function extractFrontmatter(filePath: string): Promise<{ 
  content: string; 
  frontmatter: FrontmatterData;
  tokens: number;
}> {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    const tokens = estimateTokens(content);
    const frontmatter: FrontmatterData = {};
    
    const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
    if (match !== null && match[1] !== undefined && match[1] !== '') {
      const frontmatterText = match[1];
      
      // Extract common fields
      const nameMatch = frontmatterText.match(/name:\s*(.+)/);
      if (nameMatch !== null && nameMatch[1] !== undefined && nameMatch[1] !== '') {
        frontmatter.name = nameMatch[1].trim();
      }
      
      const descMatch = frontmatterText.match(/description:\s*(.+)/);
      if (descMatch !== null && descMatch[1] !== undefined && descMatch[1] !== '') {
        frontmatter.description = descMatch[1].trim();
      }
      
      const categoryMatch = frontmatterText.match(/category:\s*(.+)/);
      if (categoryMatch !== null && categoryMatch[1] !== undefined && categoryMatch[1] !== '') {
        frontmatter.category = categoryMatch[1].trim();
      }
    }
    
    return { content, frontmatter, tokens };
  } catch {
    return { 
      content: '', 
      frontmatter: {},
      tokens: 0
    };
  }
}

function estimateTokens(text: string): number {
  // Rough estimation: ~1 token per 4 characters for English text
  // This is a simplified heuristic that works reasonably well for markdown/code
  return Math.ceil(text.length / 4);
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) {
    return `${tokens} tokens`;
  }
  return `${(tokens / 1000).toFixed(1)}k tokens`;
}
