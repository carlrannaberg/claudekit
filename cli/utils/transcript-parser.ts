import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import picomatch from 'picomatch';

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
   * Find the most recent message containing a specific marker
   * Returns the index of the message containing the marker, or -1 if not found
   */
  findLastMessageWithMarker(marker: string): number {
    const entries = this.loadEntries();
    
    // Search backwards for the most recent message with the marker
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!entry) {
        continue;
      }
      
      // Check user messages (which often contain hook output)
      if (entry.type === 'user' && entry.message?.content) {
        const content = Array.isArray(entry.message.content) 
          ? entry.message.content.map(c => 
              typeof c === 'object' && 'text' in c ? c.text : ''
            ).join(' ')
          : '';
        
        if (content.includes(marker)) {
          return i;
        }
      }
    }
    
    return -1;
  }

  /**
   * Check if a file path matches the target patterns (glob patterns or extensions)
   */
  private matchesTargetPatterns(filePath: string, patterns?: string[]): boolean {
    // If no patterns specified, use default code extensions
    if (!patterns || patterns.length === 0) {
      const defaultPatterns = [
        '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs',  // JavaScript/TypeScript
        '**/*.py', '**/*.pyw', '**/*.pyx',                                      // Python
        '**/*.java', '**/*.kt', '**/*.scala', '**/*.clj',                      // JVM languages
        '**/*.c', '**/*.cpp', '**/*.cc', '**/*.cxx', '**/*.h', '**/*.hpp',     // C/C++
        '**/*.cs', '**/*.fs', '**/*.vb',                                        // .NET languages
        '**/*.go', '**/*.rs', '**/*.swift', '**/*.m', '**/*.mm',                // System languages
        '**/*.rb', '**/*.php', '**/*.pl', '**/*.lua', '**/*.r',                 // Scripting languages
        '**/*.vue', '**/*.svelte', '**/*.astro',                                // Framework files
        '**/*.sol', '**/*.dart', '**/*.elm', '**/*.ex', '**/*.exs'              // Other languages
      ];
      // Create a matcher for all patterns
      const isMatch = picomatch(defaultPatterns);
      return isMatch(filePath);
    }
    
    // Separate positive and negative patterns
    const positivePatterns: string[] = [];
    const negativePatterns: string[] = [];
    
    for (const pattern of patterns) {
      if (pattern.startsWith('!')) {
        negativePatterns.push(pattern.slice(1));
      } else {
        positivePatterns.push(pattern);
      }
    }
    
    // If no positive patterns, use a match-all pattern
    if (positivePatterns.length === 0) {
      positivePatterns.push('**/*');
    }
    
    // Create matchers
    const isMatch = picomatch(positivePatterns);
    const isExcluded = negativePatterns.length > 0 ? picomatch(negativePatterns) : (): boolean => false;
    
    // Check if file matches positive patterns and is not excluded
    return isMatch(filePath) && !isExcluded(filePath);
  }

  /**
   * Check if there are file changes since a specific marker position
   */
  hasFileChangesSinceMarker(marker: string, targetPatterns?: string[]): boolean {
    const entries = this.loadEntries();
    const lastMarkerIndex = this.findLastMessageWithMarker(marker);
    
    // If no previous marker, check if there are any file changes at all
    if (lastMarkerIndex === -1) {
      return this.hasRecentFileChanges(999999, targetPatterns);
    }
    
    // Check for file changes after the last marker
    const editingTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
    
    for (let i = lastMarkerIndex + 1; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry || entry.type !== 'assistant' || !entry.message?.content) {
        continue;
      }
      
      for (const content of entry.message.content) {
        if (content.type === 'tool_use' && 
            content.name !== undefined && 
            content.name !== null &&
            editingTools.includes(content.name)) {
          const filePath = (content.input?.file_path ?? content.input?.path ?? '').toString();
          
          if (this.matchesTargetPatterns(filePath, targetPatterns)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Check if there are file changes in recent messages
   */
  hasRecentFileChanges(messageCount: number, targetPatterns?: string[]): boolean {
    const editingTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
    const toolUses = this.findToolUsesInRecentMessages(messageCount, editingTools);
    
    for (const toolUse of toolUses) {
      const filePath = (toolUse.input?.file_path ?? toolUse.input?.path ?? '').toString();
      
      if (this.matchesTargetPatterns(filePath, targetPatterns)) {
        return true;
      }
    }
    
    return false;
  }
}