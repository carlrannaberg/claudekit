/**
 * Subagent Detection Utility
 * Detects if we're running in a subagent context by parsing the transcript
 */

import fs from 'fs-extra';
import fastGlob from 'fast-glob';

interface SubagentMetadata {
  name: string;
  disableHooks?: string[];
  [key: string]: unknown;
}

interface TranscriptEntry {
  type: string;
  message?: {
    content?: Array<{
      type: string;
      name?: string;
      input?: {
        subagent_type?: string;
        [key: string]: unknown;
      };
    }>;
  };
  timestamp?: string;
  [key: string]: unknown;
}

/**
 * Detect subagent context by parsing the transcript
 */
export async function detectSubagentFromTranscript(transcriptPath?: string): Promise<string | null> {
  if (transcriptPath === undefined || transcriptPath === '' || !await fs.pathExists(transcriptPath)) {
    return null;
  }

  try {
    // Read the transcript file
    const content = await fs.readFile(transcriptPath, 'utf-8');
    const lines = content.trim().split('\n');
    
    // Parse from the end to find the most recent Task invocation
    // We look at the last 50 entries to find a Task tool use
    const recentLines = lines.slice(-50);
    
    for (let i = recentLines.length - 1; i >= 0; i--) {
      try {
        const entry: TranscriptEntry = JSON.parse(recentLines[i] ?? '{}');
        
        // Check if this is an assistant message with tool use
        if (entry.type === 'assistant' && entry.message?.content) {
          for (const content of entry.message.content) {
            if (content.type === 'tool_use' && 
                content.name === 'Task' && 
                content.input?.subagent_type !== undefined &&
                content.input.subagent_type !== '') {
              // Found a Task invocation with subagent_type
              return content.input.subagent_type;
            }
          }
        }
      } catch {
        // Ignore parse errors for individual lines
        continue;
      }
    }
  } catch {
    // Error reading or parsing transcript
    return null;
  }
  
  return null;
}

/**
 * Load subagent metadata from its definition file
 */
export async function loadSubagentMetadata(agentName: string): Promise<SubagentMetadata | null> {
  try {
    // Search for agent definition files
    const patterns = [
      `src/agents/${agentName}.md`,
      `.claude/agents/${agentName}.md`,
      `**/agents/${agentName}.md`
    ];
    
    for (const pattern of patterns) {
      const files = await fastGlob(pattern, { cwd: process.cwd() });
      if (files.length > 0 && files[0] !== undefined) {
        const content = await fs.readFile(files[0], 'utf-8');
        return parseAgentFrontmatter(content, agentName);
      }
    }
  } catch {
    // Silently fail if we can't load metadata
  }
  
  return null;
}

/**
 * Parse agent frontmatter to extract metadata
 */
function parseAgentFrontmatter(content: string, agentName: string): SubagentMetadata {
  const metadata: SubagentMetadata = { name: agentName };
  
  // Simple frontmatter parsing for disableHooks
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch !== null && frontmatterMatch[1] !== undefined) {
    const frontmatter = frontmatterMatch[1];
    const lines = frontmatter.split('\n');
    
    for (const line of lines) {
      // Parse disableHooks array (supports both array and list format)
      if (line.trim().startsWith('disableHooks:')) {
        const remainder = line.substring(line.indexOf(':') + 1).trim();
        
        // Handle inline array format: disableHooks: ['hook1', 'hook2']
        const arrayMatch = remainder.match(/\[(.*?)\]/);
        if (arrayMatch !== null && arrayMatch[1] !== undefined) {
          metadata.disableHooks = arrayMatch[1]
            .split(',')
            .map(h => h.trim().replace(/['"]/g, ''))
            .filter(h => h.length > 0);
        }
      }
    }
    
    // Also check for YAML list format
    let inDisableHooks = false;
    for (const line of lines) {
      if (line.trim() === 'disableHooks:') {
        inDisableHooks = true;
        metadata.disableHooks = [];
      } else if (inDisableHooks) {
        if (line.startsWith('  - ')) {
          // YAML list item
          const hookName = line.substring(4).trim().replace(/['"]/g, '');
          if (!metadata.disableHooks) {
            metadata.disableHooks = [];
          }
          metadata.disableHooks.push(hookName);
        } else if (!line.startsWith('  ')) {
          // End of list
          inDisableHooks = false;
        }
      }
    }
  }
  
  return metadata;
}

/**
 * Check if a specific hook should be disabled for the current context
 */
export async function isHookDisabledForSubagent(
  hookName: string, 
  transcriptPath?: string
): Promise<boolean> {
  // Detect which subagent we're in (if any)
  const subagentType = await detectSubagentFromTranscript(transcriptPath);
  
  if (subagentType === null || subagentType === '') {
    // Not in a subagent context
    return false;
  }
  
  // Load the subagent's metadata
  const metadata = await loadSubagentMetadata(subagentType);
  
  if (!metadata || !metadata.disableHooks) {
    // No metadata or no disabled hooks
    return false;
  }
  
  // Check if this hook is in the disabled list
  return metadata.disableHooks.includes(hookName);
}