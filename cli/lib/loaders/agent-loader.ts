import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import type { AgentDefinition } from './types.js';
import { BaseLoader } from './base-loader.js';

/**
 * Loader for agent definitions from markdown files
 */
export class AgentLoader extends BaseLoader {
  constructor() {
    super('agents');
  }

  /**
   * Load an agent definition by ID
   * @param agentId The agent identifier (e.g., "typescript-expert", "typescript/expert")
   * @returns Promise<AgentDefinition>
   * @throws Error if agent not found
   */
  async loadAgent(agentId: string): Promise<AgentDefinition> {
    await this.ensurePathsInitialized();
    const agentPath = await this.resolveAgentPath(agentId);
    if (agentPath === null) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Read and parse file using base class method
    const { data, content } = await this.readAndParseFile(agentPath);

    // Build definition with conditional optional properties
    const bundle = this.validateStringArray(data['bundle']);
    const displayName = this.getOptionalString(data, 'displayName');
    const color = this.getOptionalString(data, 'color');
    const tools = this.validateStringArray(data['tools']);

    const definition: AgentDefinition = {
      id: agentId,
      name: this.getRequiredString(data, 'name', agentId),
      description: this.getRequiredString(data, 'description', ''),
      category: this.getRequiredString(data, 'category', 'general'),
      content,
      filePath: agentPath,
      ...(bundle !== undefined && { bundle }),
      ...(displayName !== undefined && { displayName }),
      ...(color !== undefined && { color }),
      ...(tools !== undefined && { tools }),
    };

    return definition;
  }

  /**
   * Get all available agents from all search paths
   * @returns Promise<Array<{id: string, source: string, path: string}>>
   */
  async getAllAgents(): Promise<Array<{ id: string; source: string; path: string }>> {
    await this.ensurePathsInitialized();
    const agents: Array<{ id: string; source: string; path: string }> = [];
    const seen = new Set<string>();

    for (const searchPath of this.searchPaths) {
      const source = this.getSourceLabel(searchPath);
      const agentsInPath = await this.findAgentsInPath(searchPath);

      for (const { id, path: agentPath } of agentsInPath) {
        if (!seen.has(id)) {
          seen.add(id);
          agents.push({ id, source, path: agentPath });
        }
      }
    }

    return agents;
  }

  /**
   * Check if an agent is available in user or project locations (not embedded)
   * @param agentId The agent identifier to check
   * @returns Promise<boolean> True if agent exists in user/project directories
   */
  async isAgentInstalledByUser(agentId: string): Promise<boolean> {
    await this.ensurePathsInitialized();
    
    for (const searchPath of this.searchPaths) {
      const source = this.getSourceLabel(searchPath);
      
      // Skip embedded agents
      if (source === 'embedded') {
        continue;
      }
      
      // Check if agent exists in this path using the same logic as resolveAgentPath
      if (await this.checkAgentInPath(agentId, searchPath)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Check if an agent exists in a specific search path
   * @param agentId The agent identifier
   * @param searchPath The path to search in
   * @returns Promise<boolean> True if agent exists in this path
   */
  private async checkAgentInPath(agentId: string, searchPath: string): Promise<boolean> {
    // Direct file match
    const directPath = path.join(searchPath, `${agentId}.md`);
    if (await this.fileExists(directPath)) {
      return true;
    }
    
    // Try with -expert suffix
    if (!agentId.endsWith('-expert')) {
      const expertPath = path.join(searchPath, `${agentId}-expert.md`);
      if (await this.fileExists(expertPath)) {
        return true;
      }
    }
    
    return false;
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
   * Find all agents in a specific path
   */
  private async findAgentsInPath(searchPath: string): Promise<Array<{ id: string; path: string }>> {
    const agents: Array<{ id: string; path: string }> = [];

    try {
      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(searchPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subAgents = await this.findAgentsInPath(fullPath);
          agents.push(...subAgents);
        } else if (entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'README.md') {
          const baseName = path.basename(entry.name, '.md');
          agents.push({ id: baseName, path: fullPath });
        }
      }
    } catch {
      // Directory might not exist or be readable
    }

    return agents;
  }

  /**
   * Resolve agent ID to file path using multiple strategies
   * @param agentId The agent identifier
   * @returns Promise<string | null> Path to agent file or null if not found
   */
  private async resolveAgentPath(agentId: string): Promise<string | null> {
    for (const searchPath of this.searchPaths) {
      // Use shared method to check if agent exists
      if (await this.checkAgentInPath(agentId, searchPath)) {
        // Return the actual path
        const directPath = path.join(searchPath, `${agentId}.md`);
        if (await this.fileExists(directPath)) {
          return directPath;
        }
        
        if (!agentId.endsWith('-expert')) {
          const expertPath = path.join(searchPath, `${agentId}-expert.md`);
          if (await this.fileExists(expertPath)) {
            return expertPath;
          }
        }
      }

      // Strategy 3: Handle category/name pattern (e.g., "typescript/expert")
      if (agentId.includes('/')) {
        const parts = agentId.split('/');
        const category = parts[0];
        const name = parts[1];

        if (category !== undefined && name !== undefined) {
          const categoryPath = path.join(searchPath, category, `${name}.md`);
          if (await this.fileExists(categoryPath)) {
            return categoryPath;
          }

          // Also try with -expert suffix for category/name pattern
          if (name && !name.endsWith('-expert')) {
            const categoryExpertPath = path.join(searchPath, category, `${name}-expert.md`);
            if (await this.fileExists(categoryExpertPath)) {
              return categoryExpertPath;
            }
          }
        }
      }

      // Strategy 4: Recursive search with frontmatter name field matching
      const recursiveMatch = await this.searchByFrontmatterName(searchPath, agentId);
      if (recursiveMatch !== null) {
        return recursiveMatch;
      }
    }

    return null;
  }

  /**
   * Recursively search for agent files by frontmatter name field
   * @param searchPath Base directory to search
   * @param targetName Name to match in frontmatter
   * @returns Promise<string | null> Path to matching file or null
   */
  private async searchByFrontmatterName(
    searchPath: string,
    targetName: string
  ): Promise<string | null> {
    return this.searchRecursively(searchPath, async (fullPath, _entry) => {
      try {
        // Read and parse frontmatter
        const { data } = await this.readAndParseFile(fullPath);

        // Check if name field matches
        if ('name' in data && data['name'] === targetName) {
          return fullPath;
        }
      } catch {
        // Skip files that can't be parsed
      }
      return null;
    });
  }
}
