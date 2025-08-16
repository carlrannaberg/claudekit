/**
 * Definition for an AI agent with metadata and content
 */
export interface AgentDefinition {
  /** Unique identifier for the agent (e.g., "typescript-expert") */
  id: string;
  
  /** Human-readable name of the agent from frontmatter */
  name: string;
  
  /** Brief description of the agent's purpose and capabilities */
  description: string;
  
  /** Category this agent belongs to (e.g., "TypeScript", "React", "Testing") */
  category: string;
  
  /** List of related agent IDs that work well together */
  bundle?: string[];
  
  /** UI-friendly display name for the agent */
  displayName?: string;
  
  /** UI color hint for visual representation */
  color?: string;
  
  /** Raw markdown content after frontmatter removal */
  content: string;
  
  /** Full filesystem path to the source file */
  filePath: string;
  
  /** List of allowed tools this agent can use */
  tools?: string[];
}

/**
 * Definition for a Claude Code command with metadata and content
 */
export interface CommandDefinition {
  /** Unique identifier for the command (e.g., "spec:create") */
  id: string;
  
  /** Command name derived from filename */
  name: string;
  
  /** Brief description of what the command does */
  description: string;
  
  /** Optional category for grouping commands */
  category?: string;
  
  /** List of tools this command is allowed to use */
  allowedTools: string[];
  
  /** Hint about expected arguments format */
  argumentHint?: string;
  
  /** Raw markdown content after frontmatter removal */
  content: string;
  
  /** Full filesystem path to the source file */
  filePath: string;
}