import path from 'path';
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
      ...(tools !== undefined && { tools })
    };
    
    return definition;
  }
  
  /**
   * Resolve agent ID to file path using multiple strategies
   * @param agentId The agent identifier
   * @returns Promise<string | null> Path to agent file or null if not found
   */
  private async resolveAgentPath(agentId: string): Promise<string | null> {
    for (const searchPath of this.searchPaths) {
      // Strategy 1: Direct file match {searchPath}/{agentId}.md
      const directPath = path.join(searchPath, `${agentId}.md`);
      if (await this.fileExists(directPath)) {
        return directPath;
      }

      // Strategy 2: Try with -expert suffix
      if (!agentId.endsWith('-expert')) {
        const expertPath = path.join(searchPath, `${agentId}-expert.md`);
        if (await this.fileExists(expertPath)) {
          return expertPath;
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
  private async searchByFrontmatterName(searchPath: string, targetName: string): Promise<string | null> {
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