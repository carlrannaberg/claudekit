import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';

export interface ToolInput {
  file_path?: string;
  path?: string;
  old_string?: string;
  new_string?: string;
  command?: string;
  content?: string;
  todos?: Array<{ content: string; status: string; id: string }>;
  edits?: Array<{ old_string: string; new_string: string }>;
  [key: string]: unknown;
}

export interface TranscriptEntry {
  type?: string;
  uuid?: string;
  parentUuid?: string | null;
  sessionId?: string;
  timestamp?: string;
  message?: {
    id?: string;
    role?: string;
    content?: Array<{
      type?: string;
      name?: string;
      text?: string;
      input?: ToolInput;
      tool_use_id?: string;
    }>;
  };
  toolUseResult?: {
    newTodos?: Array<{ content: string; status: string; id?: string }>;
    filePath?: string;
    oldString?: string;
    newString?: string;
    [key: string]: unknown;
  };
}

export interface ToolUse {
  name: string;
  input: ToolInput;
  timestamp?: string | undefined;
}

export class TranscriptParser {
  private readonly transcriptPath: string;
  private entries: TranscriptEntry[] | null = null;

  constructor(transcriptPath: string) {
    this.transcriptPath = transcriptPath.replace(/^~/, homedir());
  }

  exists(): boolean {
    return existsSync(this.transcriptPath);
  }

  private loadEntries(): TranscriptEntry[] {
    if (this.entries) {
      return this.entries;
    }

    if (!this.exists()) {
      return [];
    }

    try {
      const content = readFileSync(this.transcriptPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      this.entries = lines.map(line => {
        try {
          return JSON.parse(line) as TranscriptEntry;
        } catch {
          return null;
        }
      }).filter((entry): entry is TranscriptEntry => entry !== null);
      
      return this.entries;
    } catch {
      return [];
    }
  }

  /**
   * Get entries from the last N conversation messages (user or assistant turns)
   * Groups messages as they appear in Claude Code UI:
   * - Each dot (⏺) in the UI represents one message group
   * - Assistant with text starts a new message (gets a dot)
   * - Following assistant with only tools is part of the same message
   * - Standalone tool use (like TodoWrite) is its own message
   * - User entries are included but don't create dots
   */
  getRecentMessages(messageCount: number): TranscriptEntry[] {
    const entries = this.loadEntries();
    
    // First, identify UI message groups (things that get dots in the UI)
    const allGroups: TranscriptEntry[][] = [];
    let i = 0;
    
    while (i < entries.length) {
      const entry = entries[i];
      if (!entry) {
        i++;
        continue;
      }
      
      const group: TranscriptEntry[] = [];
      
      if (entry.type === 'assistant') {
        const hasText = Array.isArray(entry.message?.content) && 
                       entry.message.content.some(c => c.type === 'text');
        
        if (hasText) {
          // Assistant with text - starts a UI message
          // Include this entry and any following tool-only assistants
          group.push(entry);
          i++;
          
          // Collect following tool-only assistants
          while (i < entries.length) {
            const next = entries[i];
            if (next?.type === 'assistant') {
              const nextHasText = Array.isArray(next.message?.content) && 
                                 next.message.content.some(c => c.type === 'text');
              if (!nextHasText) {
                // Tool-only assistant, part of same UI message
                group.push(next);
                i++;
              } else {
                // Next assistant has text, starts new message
                break;
              }
            } else {
              // Not an assistant, ends this group
              break;
            }
          }
          
          allGroups.push(group);
        } else {
          // Tool-only assistant (like TodoWrite) - standalone UI message
          group.push(entry);
          allGroups.push(group);
          i++;
        }
      } else {
        // User or system entry - not a UI message but include in flow
        i++;
      }
    }
    
    // Now get the last N UI message groups and include intervening entries
    const uiGroups = allGroups.slice(-messageCount);
    if (uiGroups.length === 0) {
      return [];
    }
    
    // Find the index of the first entry in our selected groups
    const firstGroupFirstEntry = uiGroups[0]?.[0];
    if (!firstGroupFirstEntry) {
      return [];
    }
    
    const startIndex = entries.indexOf(firstGroupFirstEntry);
    if (startIndex === -1) {
      return [];
    }
    
    // Return all entries from that point forward (includes user entries between groups)
    return entries.slice(startIndex);
  }

  /**
   * Find tool uses in recent messages
   */
  findToolUsesInRecentMessages(messageCount: number, toolNames?: string[]): ToolUse[] {
    const entries = this.getRecentMessages(messageCount);
    const toolUses: ToolUse[] = [];
    
    for (const entry of entries) {
      if (entry.type === 'assistant' && entry.message?.content) {
        for (const content of entry.message.content) {
          if (content.type === 'tool_use' && content.name !== undefined && content.name !== null) {
            if (!toolNames || toolNames.includes(content.name)) {
              toolUses.push({
                name: content.name,
                input: content.input || {},
                timestamp: entry.timestamp
              });
            }
          }
        }
      }
    }
    
    return toolUses;
  }

  /**
   * Get the most recent todo state from the transcript
   */
  findLatestTodoState(): Array<{ content: string; status: string; id?: string }> | null {
    const entries = this.loadEntries();
    
    // Read from end to find most recent todo state
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry) {
        continue;
      }
      
      if (entry.type === 'user' && 
          entry.toolUseResult?.newTodos !== null &&
          entry.toolUseResult?.newTodos !== undefined &&
          Array.isArray(entry.toolUseResult.newTodos)) {
        return entry.toolUseResult.newTodos;
      }
    }
    
    return null;
  }

  /**
   * Check if there are code file changes in recent messages
   */
  hasRecentCodeChanges(
    messageCount: number,
    codeExtensions: string[] = ['.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.swift', '.kt', '.rb', '.php', '.scala', '.clj', '.vue', '.svelte', '.astro', '.sol', '.dart', '.lua', '.r', '.m'],
    ignorePatterns: string[] = ['README', 'CHANGELOG', 'LICENSE', '.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.ini', '.env', '.gitignore', '.dockerignore']
  ): boolean {
    const codeEditingTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
    const toolUses = this.findToolUsesInRecentMessages(messageCount, codeEditingTools);
    
    for (const toolUse of toolUses) {
      const filePath = (toolUse.input?.file_path ?? toolUse.input?.path ?? '').toString();
      
      // Skip if it's a documentation or config file
      const shouldIgnore = ignorePatterns.some(pattern => 
        filePath.toUpperCase().includes(pattern.toUpperCase())
      );
      if (shouldIgnore) {
        continue;
      }
      
      // Check if it's a code file
      const isCodeFile = codeExtensions.some(ext => 
        filePath.toLowerCase().endsWith(ext)
      );
      if (isCodeFile) {
        return true;
      }
    }
    
    return false;
  }
}