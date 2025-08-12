import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class CheckAnyChangedHook extends BaseHook {
  name = 'check-any-changed';

  static metadata = {
    id: 'check-any-changed',
    displayName: 'TypeScript Any Detector',
    description: 'Forbid any types in changed TypeScript files',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath } = context;

    // Skip if no file or wrong extension
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }

    this.progress(`🚫 Checking for 'any' types in ${filePath}`);

    if (filePath === undefined) {
      return { exitCode: 0 };
    }
    const content = await this.readFile(filePath);
    const errors: string[] = [];

    // Remove all string literals and comments to avoid false positives
    const cleanedContent = this.removeStringsAndComments(content);
    const lines = content.split('\n');
    const cleanedLines = cleanedContent.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const originalLine = lines[i];
      const cleanedLine = cleanedLines[i];
      
      if (originalLine === undefined || originalLine === '' || cleanedLine === undefined) {
        continue;
      }

      const lineNum = i + 1;

      // Skip test utilities in the cleaned line
      if (cleanedLine.includes('expect.any(') || cleanedLine.includes('.any(')) {
        continue;
      }

      // Check for forbidden 'any' patterns in the cleaned line
      const typeWord = 'any';
      const forbiddenTypePattern = new RegExp(`:\\s*${typeWord}\\b|:\\s*${typeWord}\\[\\]|<${typeWord}>|as\\s+${typeWord}\\b|=\\s*${typeWord}\\b`);
      if (forbiddenTypePattern.test(cleanedLine)) {
        errors.push(`Line ${lineNum}: ${originalLine.trim()}`);
      }
    }

    if (errors.length > 0) {
      const errorCount = errors.length;
      const plural = errorCount > 1 ? 's' : '';
      this.error(
        "Forbidden 'any' types detected",
        `❌ File contains ${errorCount} forbidden 'any' type${plural}:\n\n${errors.join('\n')}`,
        [
          "Replace ALL 'any' types with proper types",
          "Use specific interfaces, union types, or generics instead of 'any'",
          'Examples of fixes:',
          '  - Instead of: data: any → Define: interface Data { ... }',
          '  - Instead of: items: any[] → Use: items: Item[] or items: Array<{id: string, name: string}>',
          '  - Instead of: value: any → Use: value: string | number | boolean',
          '  - Instead of: response: any → Use: response: unknown (then add type guards)',
        ]
      );
      return { exitCode: 2 };
    }

    this.success("No forbidden 'any' types found!");
    return { exitCode: 0 };
  }

  /**
   * Remove string literals and comments from TypeScript code to avoid false positives
   * when detecting 'any' types. This handles:
   * - Single and double quoted strings
   * - Template literals (backticks)
   * - Single line comments (//)
   * - Multi-line comments (slash-star star-slash)
   */
  private removeStringsAndComments(content: string): string {
    let result = '';
    let i = 0;
    
    while (i < content.length) {
      const char = content[i];
      const nextChar = content[i + 1];
      
      // Handle single line comments
      if (char === '/' && nextChar === '/') {
        // Find end of line
        const endOfLine = content.indexOf('\n', i);
        if (endOfLine === -1) {
          // Comment goes to end of file
          result += ' '.repeat(content.length - i);
          break;
        } else {
          // Replace comment with spaces, keep newline
          result += `${' '.repeat(endOfLine - i)}\n`;
          i = endOfLine + 1;
        }
        continue;
      }
      
      // Handle multi-line comments
      if (char === '/' && nextChar === '*') {
        const endComment = content.indexOf('*/', i + 2);
        if (endComment === -1) {
          // Unclosed comment, replace rest with spaces
          result += ' '.repeat(content.length - i);
          break;
        } else {
          // Replace comment with spaces, preserving newlines
          const commentContent = content.substring(i, endComment + 2);
          const replacement = commentContent.replace(/[^\n]/g, ' ');
          result += replacement;
          i = endComment + 2;
        }
        continue;
      }
      
      // Handle string literals
      if (char === '"' || char === "'" || char === '`') {
        const quote = char;
        result += ' '; // Replace opening quote with space
        i++;
        
        // Find closing quote, handling escapes
        while (i < content.length) {
          const currentChar = content[i];
          
          if (currentChar === '\\') {
            // Skip escaped character
            result += '  '; // Replace escape sequence with spaces
            i += 2;
          } else if (currentChar === quote) {
            // Found closing quote
            result += ' '; // Replace closing quote with space
            i++;
            break;
          } else if (currentChar === '\n') {
            // Preserve newlines in template literals
            result += '\n';
            i++;
          } else {
            // Replace string content with space
            result += ' ';
            i++;
          }
        }
        continue;
      }
      
      // Regular character, keep as is
      result += char;
      i++;
    }
    
    return result;
  }
}
