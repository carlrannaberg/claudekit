import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class CheckCommentReplacementHook extends BaseHook {
  name = 'check-comment-replacement';

  static metadata = {
    id: 'check-comment-replacement',
    displayName: 'Check Comment Replacement',
    description: 'Detect when code is replaced with comments',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Edit|MultiEdit',
  };

  // Patterns to detect comment lines (any language)
  private readonly COMMENT_PATTERNS = [
    /^\s*\/\/.*/,           // Single-line comments: // comment
    /^\s*\/\*.*\*\/\s*$/,   // Single-line block comments: /* comment */
    /^\s*#(?!#).*/,         // Hash comments: # comment (but not markdown headers ##)
    /^\s*--.*/,             // SQL/Lua style: -- comment
    /^\s*\*\s+.*/,          // Continuation of block comments: * comment (with space after *)
    /^\s*<!--.*-->\s*$/,    // HTML comments: <!-- comment -->
  ];

  async execute(context: HookContext): Promise<HookResult> {
    // Extract tool name from payload
    const toolName = context.payload['tool_name'] as string | undefined;
    
    // Debug: Log the full context to see what we have
    if (process.env['DEBUG'] !== undefined && process.env['DEBUG'] !== '') {
      console.error('[DEBUG] Full context.payload:', JSON.stringify(context.payload, null, 2));
      console.error('[DEBUG] Tool input:', JSON.stringify(context.payload.tool_input, null, 2));
    }
    
    // Only process Edit and MultiEdit tools
    if (toolName === undefined || !['Edit', 'MultiEdit'].includes(toolName)) {
      return { exitCode: 0 };
    }

    const edits = this.extractEdits(context, toolName);
    if (edits.length === 0) {
      return { exitCode: 0 };
    }

    const violations = this.analyzeEdits(edits);

    if (violations.length > 0) {
      const feedback = this.generateFeedback(violations);
      this.error('Code Replacement Detected', feedback, [
        'Delete the code completely instead of replacing it with comments',
        'If code is no longer needed, remove it cleanly',
        'Use git commit messages to document why code was removed',
        'If the code should stay, keep it and add explanatory comments alongside it',
      ]);
      return { exitCode: 2 };
    }

    return { exitCode: 0 };
  }

  private extractEdits(context: HookContext, toolName: string): Array<{ oldString: string; newString: string; filePath?: string }> {
    const edits: Array<{ oldString: string; newString: string; filePath?: string }> = [];
    const toolInput = context.payload.tool_input;

    if (toolName === 'Edit' && toolInput !== undefined) {
      const oldString = toolInput['old_string'] as string | undefined;
      const newString = toolInput['new_string'] as string | undefined;
      const filePath = toolInput['file_path'] as string | undefined;
      if (oldString !== undefined && oldString !== '' && newString !== undefined && newString !== '') {
        if (filePath !== undefined) {
          edits.push({ oldString, newString, filePath });
        } else {
          edits.push({ oldString, newString });
        }
      }
    } else if (toolName === 'MultiEdit' && toolInput !== undefined) {
      const multiEdits = toolInput['edits'] as
        | Array<{ old_string: string; new_string: string }>
        | undefined;
      const filePath = toolInput['file_path'] as string | undefined;
      if (multiEdits !== undefined) {
        for (const edit of multiEdits) {
          if (edit.old_string !== undefined && edit.old_string !== '' && 
              edit.new_string !== undefined && edit.new_string !== '') {
            if (filePath !== undefined) {
              edits.push({ oldString: edit.old_string, newString: edit.new_string, filePath });
            } else {
              edits.push({ oldString: edit.old_string, newString: edit.new_string });
            }
          }
        }
      }
    }

    return edits;
  }

  private analyzeEdits(
    edits: Array<{ oldString: string; newString: string; filePath?: string }>
  ): Array<{ oldContent: string; newContent: string; reason: string }> {
    const violations: Array<{ oldContent: string; newContent: string; reason: string }> = [];

    for (const edit of edits) {
      // Skip check for markdown and documentation files
      if (edit.filePath !== undefined) {
        const ext = edit.filePath.toLowerCase().split('.').pop();
        if (ext === 'md' || ext === 'mdx' || ext === 'txt' || ext === 'rst') {
          continue; // Skip validation for documentation files
        }
      }

      const oldLines = edit.oldString.split('\n');
      const newLines = edit.newString.split('\n');

      // Filter out empty lines for analysis
      const oldNonEmptyLines = oldLines.filter(line => line.trim() !== '');
      const newNonEmptyLines = newLines.filter(line => line.trim() !== '');

      // Skip if no meaningful content or if deleting content (empty replacement)
      if (oldNonEmptyLines.length === 0 || newNonEmptyLines.length === 0) {
        continue;
      }

      const isComment = (line: string): boolean => {
        return this.COMMENT_PATTERNS.some((pattern) => pattern.test(line.trim()));
      };

      // Check if old content had any non-comment lines with actual content
      // We need at least one line that's not a comment AND has meaningful content
      const oldNonCommentLinesWithContent = oldNonEmptyLines.filter(line => {
        const trimmed = line.trim();
        return trimmed !== '' && !isComment(line);
      });

      // If old content had no actual code (only comments or empty lines), skip
      if (oldNonCommentLinesWithContent.length === 0) {
        continue;
      }

      // Check if new content is all comments (after removing empty lines)
      const newIsAllComments = newNonEmptyLines.every(line => isComment(line));

      // Additional check: ensure the replacement is roughly the same size
      // If new content is significantly smaller, it's likely a deletion, not a replacement
      const sizeDifference = Math.abs(oldNonEmptyLines.length - newNonEmptyLines.length);
      const isLikelyReplacement = sizeDifference <= Math.max(2, oldNonEmptyLines.length * 0.5);

      // Violation: code (non-comments with content) replaced with only comments
      // AND it looks like a replacement (not a deletion of a section)
      if (newIsAllComments && isLikelyReplacement) {
        violations.push({
          oldContent: this.truncateContent(edit.oldString),
          newContent: this.truncateContent(edit.newString),
          reason: 'Code replaced with comments - if removing code, delete it cleanly without explanatory comments',
        });
      }
    }

    return violations;
  }

  private truncateContent(content: string, maxLines: number = 10): string {
    const lines = content.split('\n');
    if (lines.length <= maxLines) {
      return content;
    }
    return `${lines.slice(0, maxLines).join('\n')}\n... (truncated)`;
  }

  private generateFeedback(
    violations: Array<{ oldContent: string; newContent: string; reason: string }>
  ): string {
    const lines = [
      '⚠️ **Code Replaced with Comments**',
      '',
      `Found ${violations.length} instance${violations.length !== 1 ? 's' : ''} where code is being replaced with comments.`,
      '',
      '**Issue:** When removing code, it should be deleted cleanly. Replacing it with explanatory comments creates noise.',
      '',
      '**How to fix:**',
      '1. If code needs to be removed, delete it completely',
      '2. Don\'t leave comments explaining why code was removed',
      '3. Use git commit messages to document removal reasons, not code comments',
      '4. Keep the codebase clean and focused on what IS, not what WAS',
      '',
      '**Violations found:**',
    ];

    for (const [index, violation] of violations.entries()) {
      lines.push('', `${index + 1}. ${violation.reason}`);
      if (violations.length === 1) {
        lines.push('', 'Original code:', '```', violation.oldContent, '```');
        lines.push('', 'Attempted replacement:', '```', violation.newContent, '```');
      }
    }

    return lines.join('\n');
  }
}