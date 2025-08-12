import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class CheckUnusedParametersHook extends BaseHook {
  name = 'check-unused-parameters';

  static metadata = {
    id: 'check-unused-parameters',
    displayName: 'Check Unused Parameters',
    description: 'Detect lazy refactoring where parameters are prefixed with _ instead of being removed',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Edit|MultiEdit',
  };

  // Pattern to detect function signatures with underscore-prefixed parameters
  private readonly UNDERSCORE_PARAM_PATTERNS = [
    // TypeScript/JavaScript function declarations and expressions
    /function\s+\w*\s*\([^)]*\b_\w+[^)]*\)/,
    // Arrow functions
    /\([^)]*\b_\w+[^)]*\)\s*=>/,
    // Single parameter arrow functions
    /\b_\w+\s*=>/,
    // Method declarations in classes
    /^\s*(?:async\s+)?(?:static\s+)?(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\([^)]*\b_\w+[^)]*\)/m,
    // Constructor
    /constructor\s*\([^)]*\b_\w+[^)]*\)/,
  ];

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath } = context;

    // Only check TypeScript and JavaScript files
    if (filePath === undefined || filePath === '' || !this.isCodeFile(filePath)) {
      return { exitCode: 0 };
    }

    // Extract tool name from payload
    const toolName = context.payload['tool_name'] as string | undefined;
    
    // Only process Edit and MultiEdit operations (not Write, since we're checking for changes)
    if (toolName === undefined || toolName === '' || !['Edit', 'MultiEdit'].includes(toolName)) {
      return { exitCode: 0 };
    }

    const edits = this.extractEdits(context, toolName);
    if (edits.length === 0) {
      return { exitCode: 0 };
    }

    const violations = this.analyzeEdits(edits, filePath);

    if (violations.length > 0) {
      const feedback = this.generateFeedback(violations, filePath);
      this.error('Lazy Parameter Refactoring Detected', feedback, [
        'Remove truly unused parameters from function signatures',
        'If parameter is required by interface/type, document why with a comment',
        'For callbacks/event handlers, consider if the signature can be simplified',
        'Use proper TypeScript types instead of ignoring parameters',
      ]);
      return { exitCode: 2 };
    }

    return { exitCode: 0 };
  }

  private isCodeFile(filePath: string): boolean {
    const codeExtensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
    return codeExtensions.some(ext => filePath.endsWith(ext));
  }

  private extractEdits(context: HookContext, toolName: string): Array<{ oldString: string; newString: string }> {
    const edits: Array<{ oldString: string; newString: string }> = [];
    const toolInput = context.payload.tool_input;

    if (toolName === 'Write' && toolInput !== undefined) {
      // For Write tool, we analyze the entire content
      const content = toolInput['content'] as string | undefined;
      if (content !== undefined && content !== '') {
        edits.push({ oldString: '', newString: content });
      }
    } else if (toolName === 'Edit' && toolInput !== undefined) {
      const oldString = toolInput['old_string'] as string | undefined;
      const newString = toolInput['new_string'] as string | undefined;
      if (oldString !== undefined && newString !== undefined) {
        edits.push({ oldString, newString });
      }
    } else if (toolName === 'MultiEdit' && toolInput !== undefined) {
      const multiEdits = toolInput['edits'] as
        | Array<{ old_string: string; new_string: string }>
        | undefined;
      if (multiEdits !== undefined) {
        for (const edit of multiEdits) {
          if (edit.old_string !== undefined && edit.new_string !== undefined) {
            edits.push({ oldString: edit.old_string, newString: edit.new_string });
          }
        }
      }
    }

    return edits;
  }

  private analyzeEdits(
    edits: Array<{ oldString: string; newString: string }>,
    _filePath: string
  ): Array<{ line: string; reason: string; suggestion: string }> {
    const violations: Array<{ line: string; reason: string; suggestion: string }> = [];

    for (const edit of edits) {
      // ONLY check if edit is changing a parameter to underscore version (lazy refactoring)
      const isLazyRefactor = this.detectLazyRefactor(edit.oldString, edit.newString);
      
      if (isLazyRefactor) {
        violations.push({
          line: this.extractFunctionSignature(edit.newString),
          reason: 'Parameter changed to underscore prefix instead of being properly handled',
          suggestion: 'Either remove the parameter entirely or document why it needs to stay',
        });
      }
    }

    return violations;
  }

  private detectLazyRefactor(oldString: string, newString: string): boolean {
    // Check if the edit is just adding underscores to parameters
    if (!oldString || !newString) {
      return false;
    }

    // Extract parameter names from both strings
    const oldParams = this.extractParameters(oldString);
    const newParams = this.extractParameters(newString);

    if (oldParams.length === 0 || oldParams.length !== newParams.length) {
      return false;
    }

    // Check if any parameter was changed to underscore version
    for (let i = 0; i < oldParams.length; i++) {
      const oldParam = oldParams[i];
      const newParam = newParams[i];
      
      // Check if new parameter is underscore version of old
      if (oldParam !== undefined && newParam !== undefined && 
          (newParam === `_${oldParam}` || 
          (oldParam.startsWith('_') === false && newParam.startsWith('_')))) {
        return true;
      }
    }

    return false;
  }

  private extractParameters(code: string): string[] {
    const params: string[] = [];
    
    // Match function signatures
    const signatureMatch = code.match(/\(([^)]*)\)/);
    if (!signatureMatch) {
      return params;
    }
    
    const paramString = signatureMatch[1];
    if (paramString === undefined || paramString === '') {
      return params;
    }
    
    // Split by comma and extract parameter names
    const paramParts = paramString.split(',');
    for (const part of paramParts) {
      // Extract parameter name (before : or =)
      const paramMatch = part.match(/^\s*(?:\.\.\.)?(\w+)/);
      if (paramMatch !== null && paramMatch[1] !== undefined) {
        params.push(paramMatch[1]);
      }
    }
    
    return params;
  }

  private extractFunctionSignature(code: string): string {
    const lines = code.split('\n');
    for (const line of lines) {
      if (this.hasUnderscoreParam(line)) {
        return line.trim();
      }
    }
    const firstLine = code.split('\n')[0];
    return firstLine !== undefined ? firstLine.trim() : '';
  }

  private hasUnderscoreParam(line: string): boolean {
    return this.UNDERSCORE_PARAM_PATTERNS.some(pattern => pattern.test(line));
  }


  private generateFeedback(
    violations: Array<{ line: string; reason: string; suggestion: string }>,
    filePath: string
  ): string {
    const lines = [
      '⚠️ **Lazy Parameter Refactoring Detected**',
      '',
      `Found ${violations.length} instance${violations.length !== 1 ? 's' : ''} of underscore-prefixed parameters in ${filePath}`,
      '',
      '**Issue:** Simply prefixing unused parameters with underscore is lazy refactoring.',
      'It adds noise to function signatures and avoids addressing the real issue.',
      '',
      '**Best Practices:**',
      '1. Remove truly unused parameters if possible',
      '2. If parameter is required by an interface, add a comment explaining why',
      '3. For callbacks/handlers, consider if a simpler signature is possible',
      '4. Use proper TypeScript types and destructuring instead of ignoring parameters',
      '',
      '**Violations found:**',
    ];

    for (const [index, violation] of violations.entries()) {
      lines.push('', `${index + 1}. ${violation.reason}`);
      lines.push(`   Line: ${violation.line}`);
      lines.push(`   Suggestion: ${violation.suggestion}`);
    }

    return lines.join('\n');
  }
}