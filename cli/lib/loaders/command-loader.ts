import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import type { CommandDefinition } from './types.js';
import { BaseLoader } from './base-loader.js';

/**
 * Loader for command definitions from markdown files
 */
export class CommandLoader extends BaseLoader {
  constructor() {
    super('commands');
  }

  /**
   * Load a command definition by ID
   * @param commandId The command identifier (e.g., "spec:create", "validate-and-fix")
   * @returns Promise<CommandDefinition>
   * @throws Error if command not found
   */
  async loadCommand(commandId: string): Promise<CommandDefinition> {
    await this.ensurePathsInitialized();
    const commandPath = await this.resolveCommandPath(commandId);
    if (commandPath === null) {
      throw new Error(`Command not found: ${commandId}`);
    }

    // Read and parse file using base class method
    const { data, content } = await this.readAndParseFile(commandPath);

    // Build definition with conditional optional properties
    const category = this.getOptionalString(data, 'category');
    const argumentHint = this.getOptionalString(data, 'argument-hint');

    const definition: CommandDefinition = {
      id: commandId,
      name: path.basename(commandPath, '.md'),
      description: this.getRequiredString(data, 'description', ''),
      allowedTools: this.parseAllowedTools(data['allowed-tools']),
      content,
      filePath: commandPath,
      ...(category !== undefined && { category }),
      ...(argumentHint !== undefined && { argumentHint }),
    };

    return definition;
  }

  /**
   * Parse allowed-tools field from frontmatter, supporting both string and array formats
   * @param tools The tools value from frontmatter
   * @returns string[] Array of allowed tools
   */
  private parseAllowedTools(tools: unknown): string[] {
    if (tools === null || tools === undefined) {
      return [];
    }

    if (typeof tools === 'string') {
      return tools
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    if (Array.isArray(tools)) {
      return tools.map((t) => String(t).trim()).filter((t) => t.length > 0);
    }

    return [];
  }

  /**
   * Resolve command ID to file path using multiple strategies
   * @param commandId The command identifier
   * @returns Promise<string | null> Path to command file or null if not found
   */
  private async resolveCommandPath(commandId: string): Promise<string | null> {
    for (const searchPath of this.searchPaths) {
      // Strategy 1: Handle namespaced commands (e.g., "spec:create" → "spec/create.md")
      if (commandId.includes(':')) {
        const parts = commandId.split(':');
        const namespace = parts[0];
        const name = parts[1];

        if (namespace !== undefined && name !== undefined) {
          const namespacedPath = path.join(searchPath, namespace, `${name}.md`);
          if (await this.fileExists(namespacedPath)) {
            return namespacedPath;
          }
        }
      }

      // Strategy 2: Direct file match ({searchPath}/{commandId}.md)
      const directPath = path.join(searchPath, `${commandId}.md`);
      if (await this.fileExists(directPath)) {
        return directPath;
      }

      // Strategy 3: Recursive search through all subdirectories
      const recursiveMatch = await this.searchRecursivelyForCommand(searchPath, commandId);
      if (recursiveMatch !== null) {
        return recursiveMatch;
      }
    }

    return null;
  }

  /**
   * Get all available commands from all search paths
   * @returns Promise<Array<{id: string, source: string, path: string}>>
   */
  async getAllCommands(): Promise<Array<{ id: string; source: string; path: string }>> {
    await this.ensurePathsInitialized();
    const commands: Array<{ id: string; source: string; path: string }> = [];
    const seen = new Set<string>();

    for (const searchPath of this.searchPaths) {
      const source = this.getSourceLabel(searchPath);
      const commandsInPath = await this.findCommandsInPath(searchPath);

      for (const { id, path: cmdPath } of commandsInPath) {
        if (!seen.has(id)) {
          seen.add(id);
          commands.push({ id, source, path: cmdPath });
        }
      }
    }

    return commands;
  }

  /**
   * Get source label for a search path
   */
  private getSourceLabel(searchPath: string): string {
    const home = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '';
    const homeClaudePath = path.join(home, '.claude');

    // Check if it's the user's global .claude directory
    if (searchPath === homeClaudePath || searchPath.startsWith(homeClaudePath + path.sep)) {
      return 'global';
    }
    // Check if it's a project .claude directory (not in home)
    else if (searchPath.includes('.claude')) {
      return 'project';
    }
    // Otherwise it's embedded
    else {
      return 'embedded';
    }
  }

  /**
   * Find all commands in a specific path
   */
  private async findCommandsInPath(
    searchPath: string,
    prefix: string = ''
  ): Promise<Array<{ id: string; path: string }>> {
    const commands: Array<{ id: string; path: string }> = [];

    try {
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(searchPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subPrefix = prefix !== '' ? `${prefix}:${entry.name}` : entry.name;
          const subCommands = await this.findCommandsInPath(fullPath, subPrefix);
          commands.push(...subCommands);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const baseName = path.basename(entry.name, '.md');
          const commandId = prefix !== '' ? `${prefix}:${baseName}` : baseName;
          commands.push({ id: commandId, path: fullPath });
        }
      }
    } catch {
      // Directory might not exist or be readable
    }

    return commands;
  }

  /**
   * Recursively search for command files by filename
   * @param searchPath Base directory to search
   * @param commandId Command ID to find
   * @returns Promise<string | null> Path to matching file or null
   */
  private async searchRecursivelyForCommand(
    searchPath: string,
    commandId: string
  ): Promise<string | null> {
    return this.searchRecursively(searchPath, async (fullPath, entry) => {
      // Check if filename matches (without .md extension)
      const nameWithoutExt = path.basename(entry.name, '.md');
      if (nameWithoutExt === commandId) {
        return fullPath;
      }
      return null;
    });
  }
}
