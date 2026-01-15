# Feature Specification: Prevent Comment Replacement Hook

## Status
Draft

## Authors
Claude Code Assistant - August 10, 2025

## Overview
A PostToolUse hook for claudekit that detects and prevents AI models from replacing actual code implementations with placeholder comments during Edit/MultiEdit operations. This addresses a common anti-pattern where models replace functional code with comments like "// Rest of implementation", "// ... existing code ...", or similar placeholders.

## Background/Problem Statement

AI coding assistants, including Claude, sometimes exhibit an undesirable behavior where they replace existing, functional code with placeholder comments when making edits. This typically happens when:

1. The model is trying to show context without including full code
2. The model is attempting to be concise but inadvertently removes implementation
3. The model misunderstands the scope of the requested change
4. The model is trying to indicate unchanged code but uses the wrong approach

This behavior is particularly problematic because:
- It destroys working code
- It requires manual restoration from git history
- It can go unnoticed until runtime or compilation
- It disrupts developer workflow and trust in AI assistance

## Goals
- Detect when Edit/MultiEdit operations replace code with placeholder comments
- Block such operations before they corrupt the codebase
- Provide clear feedback to guide the AI toward proper editing behavior
- Support multiple programming languages and comment styles
- Maintain high performance with minimal false positives

## Non-Goals
- Detecting legitimate TODOs or FIXMEs in new code
- Preventing all comments (comments are valuable for documentation)
- Analyzing unchanged portions of files
- Detecting placeholder code (only placeholder comments)
- Real-time prevention (this is a post-operation validation)

## Technical Dependencies
- Node.js 18+ (for claudekit runtime)
- TypeScript 5.0+ (for hook implementation)
- fs-extra (for file operations)
- claudekit BaseHook class and infrastructure

## Detailed Design

### Architecture Changes

The hook will be integrated into claudekit's embedded hook system as a new TypeScript class extending `BaseHook`. It will:

1. Parse Edit/MultiEdit tool input to extract old and new content
2. Analyze the differences to detect suspicious comment patterns
3. Block operations that replace code with placeholders
4. Provide actionable feedback for correction

### Implementation Approach

#### Pattern Detection Strategy

The hook will detect several categories of placeholder comments:

**Category 1: Ellipsis Patterns**
```javascript
// Patterns to detect:
"// ..."
"/* ... */"
"// ... rest of"
"// ... existing"
"// ... previous"
"// ... original"
"# ..." (Python/Shell)
"-- ..." (SQL)
```

**Category 2: Placeholder Text**
```javascript
// Patterns to detect:
"// Rest of implementation"
"// Implementation here"
"// Existing code"
"// Previous implementation"
"// Original code"
"// Code continues"
"// Same as before"
"/* Implementation details */"
```

**Category 3: Contextual Placeholders**
```javascript
// Patterns to detect:
"// [Component code]"
"// {existing logic}"
"// <implementation>"
"// TODO: implement" (when replacing existing code)
```

#### Detection Algorithm

```typescript
// Type definitions
interface Edit {
  oldString: string;
  newString: string;
}

interface Violation {
  oldContent: string;
  newContent: string;
  reason: string;
}

interface HookResult {
  exitCode: number;
}

class PreventCommentReplacementHook extends BaseHook {
  name = 'prevent-comment-replacement';
  description = 'Prevents replacing code with placeholder comments';

  private readonly PLACEHOLDER_PATTERNS = [
    // Ellipsis patterns
    /^\s*(?:\/\/|#|--|\*)\s*\.{3}/,
    /^\s*\/\*\s*\.{3}\s*\*\//,
    
    // Text placeholders
    /^\s*(?:\/\/|#|--|\*)\s*(?:rest of|existing|previous|original|same as)/i,
    /^\s*(?:\/\/|#|--|\*)\s*(?:implementation|code|logic)\s*(?:here|continues|details)?/i,
    
    // Bracketed placeholders
    /^\s*(?:\/\/|#|--|\*)\s*[\[{<].*[\]}>]\s*$/,
  ];

  async execute(filePath: string): Promise<HookResult> {
    // Skip binary files
    if (this.isBinaryFile(filePath)) {
      return { exitCode: 0 };
    }

    // 1. Parse tool input for Edit/MultiEdit
    const toolInput = this.getToolInput();
    
    // Handle malformed input
    if (!toolInput || typeof toolInput !== 'object') {
      console.error('Invalid tool input received');
      return { exitCode: 0 }; // Allow operation but log error
    }
    
    // 2. Extract old_string and new_string from edits
    const edits = this.extractEdits(toolInput);
    
    // 3. Analyze each edit for suspicious replacements
    const violations = this.detectViolations(edits);
    
    // 4. Block if violations found
    if (violations.length > 0) {
      return this.blockWithError(violations);
    }
    
    return { exitCode: 0 };
  }

  private isBinaryFile(filePath: string): boolean {
    const binaryExtensions = [
      '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
      '.pdf', '.zip', '.tar', '.gz', '.rar', '.7z',
      '.exe', '.dll', '.so', '.dylib', '.bin',
      '.mp3', '.mp4', '.avi', '.mov', '.wmv',
      '.woff', '.woff2', '.ttf', '.eot'
    ];
    return binaryExtensions.some(ext => filePath.toLowerCase().endsWith(ext));
  }

  private extractEdits(toolInput: any): Edit[] {
    const edits: Edit[] = [];
    
    // Handle Edit tool
    if (toolInput.old_string && toolInput.new_string) {
      // Limit very large edits to prevent performance issues
      const MAX_EDIT_SIZE = 100000; // ~100KB
      if (toolInput.old_string.length > MAX_EDIT_SIZE || 
          toolInput.new_string.length > MAX_EDIT_SIZE) {
        return []; // Skip analysis for very large edits
      }
      
      edits.push({
        oldString: toolInput.old_string,
        newString: toolInput.new_string
      });
    }
    
    // Handle MultiEdit tool
    if (toolInput.edits && Array.isArray(toolInput.edits)) {
      for (const edit of toolInput.edits) {
        if (edit.old_string && edit.new_string) {
          // Apply same size limit
          const MAX_EDIT_SIZE = 100000;
          if (edit.old_string.length > MAX_EDIT_SIZE || 
              edit.new_string.length > MAX_EDIT_SIZE) {
            continue; // Skip this edit but process others
          }
          
          edits.push({
            oldString: edit.old_string,
            newString: edit.new_string
          });
        }
      }
    }
    
    return edits;
  }

  private detectViolations(edits: Edit[]): Violation[] {
    const violations: Violation[] = [];
    
    for (const edit of edits) {
      const oldLines = edit.oldString.split('\n');
      const newLines = edit.newString.split('\n');
      
      // Check if code is being replaced with comments
      if (this.isCodeReplacement(oldLines, newLines)) {
        violations.push({
          oldContent: edit.oldString,
          newContent: edit.newString,
          reason: this.determineViolationType(newLines)
        });
      }
    }
    
    return violations;
  }

  private isCodeReplacement(oldLines: string[], newLines: string[]): boolean {
    // Count substantive code lines in old content
    const oldCodeLines = oldLines.filter(line => 
      !this.isComment(line) && line.trim().length > 0
    ).length;
    
    // Count placeholder comments in new content
    const placeholderCount = newLines.filter(line =>
      this.isPlaceholderComment(line)
    ).length;
    
    // Detect if code is being replaced with placeholders
    return oldCodeLines > 2 && placeholderCount > 0 && 
           newLines.length < oldLines.length / 2;
  }

  private isComment(line: string): boolean {
    const trimmed = line.trim();
    // Check for common comment patterns across languages
    return (
      trimmed.startsWith('//') ||
      trimmed.startsWith('/*') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('--') ||
      trimmed.startsWith('<!--') ||
      trimmed === ''
    );
  }

  private isPlaceholderComment(line: string): boolean {
    // Check against all placeholder patterns
    return this.PLACEHOLDER_PATTERNS.some(pattern => pattern.test(line));
  }

  private determineViolationType(newLines: string[]): string {
    // Analyze the type of placeholder used
    for (const line of newLines) {
      if (/\.{3}/.test(line)) {
        return 'Ellipsis placeholder detected';
      }
      if (/\b(rest of|existing|previous|original)\b/i.test(line)) {
        return 'Reference placeholder detected';
      }
      if (/\b(implementation|code|logic)\s*(here|continues|details)/i.test(line)) {
        return 'Implementation placeholder detected';
      }
      if (/[\[{<].*[\]}>]/.test(line) && this.isComment(line)) {
        return 'Bracketed placeholder detected';
      }
    }
    return 'Generic placeholder detected';
  }

  private blockWithError(violations: Violation[]): HookResult {
    const errorLines: string[] = [];
    
    errorLines.push('████ Error: Code Replaced with Placeholder Comments ████');
    errorLines.push('');
    errorLines.push('Detected attempt to replace functional code with placeholder comments.');
    errorLines.push('');
    errorLines.push(`Found ${violations.length} violation${violations.length > 1 ? 's' : ''}:`);
    errorLines.push('');
    
    violations.forEach((violation, index) => {
      const oldLineCount = violation.oldContent.split('\n').length;
      const newLineCount = violation.newContent.split('\n').length;
      
      errorLines.push(`Violation ${index + 1}: ${violation.reason}`);
      errorLines.push(`Original code (${oldLineCount} lines):`);
      
      // Show first few lines of original code
      const oldPreview = violation.oldContent.split('\n').slice(0, 5).join('\n');
      errorLines.push('  ' + oldPreview.split('\n').join('\n  '));
      if (oldLineCount > 5) {
        errorLines.push(`  ... and ${oldLineCount - 5} more lines`);
      }
      
      errorLines.push('');
      errorLines.push(`Attempted replacement (${newLineCount} lines):`);
      errorLines.push('  ' + violation.newContent.split('\n').join('\n  '));
      errorLines.push('');
    });
    
    errorLines.push('How to fix:');
    errorLines.push('1. Include the COMPLETE implementation in your edit');
    errorLines.push('2. Do not use placeholder comments like "...", "rest of", or "existing code"');
    errorLines.push('3. If you need to show context, include the actual code');
    errorLines.push('4. For large unchanged sections, use larger context boundaries');
    errorLines.push('');
    errorLines.push('Example of correct approach:');
    errorLines.push('- Include full function/class implementations');
    errorLines.push('- Use MultiEdit for multiple precise changes');
    errorLines.push('- Expand context to include complete code blocks');
    
    // Write to stderr for Claude to see
    process.stderr.write(errorLines.join('\n'));
    
    return { exitCode: 2 }; // Block operation
  }
}
```

### Code Structure and File Organization

```
cli/hooks/
├── prevent-comment-replacement.ts   # Main hook implementation
├── registry.ts                      # Update with new hook registration
├── index.ts                         # Export new hook
└── __tests__/
    └── prevent-comment-replacement.test.ts  # Comprehensive tests
```

### API Changes
No public API changes. The hook integrates seamlessly with the existing hook infrastructure.

### Data Model Changes
No data model changes required.

### Integration with External Libraries
Uses existing claudekit infrastructure and Node.js built-ins only.

## User Experience

### For Developers Using claudekit

1. **Automatic Protection**: Once enabled, the hook automatically prevents code loss
2. **Clear Error Messages**: When blocked, developers see exactly what was wrong
3. **Actionable Feedback**: Error messages guide toward correct editing patterns

### Error Message Example

```
████ Error: Code Replaced with Placeholder Comments ████

Detected attempt to replace functional code with placeholder comments.

Found 1 violation:

Original code (12 lines):
  function calculateTotal(items) {
    let total = 0;
    for (const item of items) {
      total += item.price * item.quantity;
    }
    return total;
  }

Attempted replacement (2 lines):
  // ... existing implementation ...

How to fix:
1. Include the COMPLETE implementation in your edit
2. Do not use placeholder comments like "...", "rest of", or "existing code"
3. If you need to show context, include the actual code
4. For large unchanged sections, use larger context boundaries

Example of correct approach:
- Include full function/class implementations
- Use MultiEdit for multiple precise changes
- Expand context to include complete code blocks
```

## Testing Strategy

### Unit Tests

```typescript
describe('PreventCommentReplacementHook', () => {
  // Purpose: Verify hook correctly identifies placeholder patterns
  it('should detect ellipsis placeholder comments', () => {
    const violations = hook.detectViolations([{
      oldString: 'function foo() {\n  return 42;\n}',
      newString: '// ... existing implementation ...'
    }]);
    expect(violations).toHaveLength(1);
  });

  // Purpose: Ensure legitimate comments are not blocked
  it('should allow legitimate documentation comments', () => {
    const violations = hook.detectViolations([{
      oldString: 'function foo() {\n  return 42;\n}',
      newString: '// Calculate the ultimate answer\nfunction foo() {\n  return 42;\n}'
    }]);
    expect(violations).toHaveLength(0);
  });

  // Purpose: Test language-specific comment syntax
  it('should detect Python-style placeholder comments', () => {
    const violations = hook.detectViolations([{
      oldString: 'def calculate():\n    return sum(values)',
      newString: '# ... rest of implementation'
    }]);
    expect(violations).toHaveLength(1);
  });

  // Purpose: Verify threshold-based detection to avoid false positives
  it('should not trigger on small code removals', () => {
    const violations = hook.detectViolations([{
      oldString: 'const x = 1;',
      newString: '// Removed deprecated variable'
    }]);
    expect(violations).toHaveLength(0);
  });
});
```

### Integration Tests

```typescript
describe('PreventCommentReplacement Integration', () => {
  // Purpose: Verify hook blocks Edit operations with placeholders
  it('should block Edit operation replacing code with placeholders', async () => {
    const result = await executeHook('prevent-comment-replacement', {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/test/file.js',
        old_string: 'function calculate(a, b) {\n  return a + b;\n}',
        new_string: '// ... existing calculation logic ...'
      }
    });
    expect(result.exitCode).toBe(2);
  });

  // Purpose: Test MultiEdit with mixed valid/invalid edits
  it('should block MultiEdit with any placeholder replacements', async () => {
    const result = await executeHook('prevent-comment-replacement', {
      tool_name: 'MultiEdit',
      tool_input: {
        file_path: '/test/file.js',
        edits: [
          { old_string: 'const x = 1;', new_string: 'const x = 2;' }, // Valid
          { old_string: 'function foo() {}', new_string: '// ... rest ...' } // Invalid
        ]
      }
    });
    expect(result.exitCode).toBe(2);
  });
});
```

### E2E Tests
Not required - hook operates within claudekit's existing E2E test infrastructure.

### Mocking Strategies
- Mock file system operations using existing test utilities
- Mock tool input payloads for various scenarios
- Test with real-world code samples from different languages

## Performance Considerations

### Impact
- **Overhead**: Minimal - only string parsing and regex matching
- **Complexity**: O(n) where n is the number of lines in edits
- **Memory**: Proportional to edit size, typically < 1MB

### Mitigation Strategies
1. **Early Exit**: Skip processing for non-code files
2. **Caching**: Cache compiled regex patterns
3. **Line Limits**: Skip analysis for very large edits (> 10,000 lines)
4. **Lazy Loading**: Only load hook when Edit/MultiEdit tools are used

## Security Considerations

### Security Implications
- No external network calls
- No file system writes
- No execution of user code
- Read-only analysis of edit content

### Safeguards
1. **Input Validation**: Sanitize all tool input
2. **Resource Limits**: Cap processing time and memory usage
3. **Error Isolation**: Catch all exceptions to prevent hook system disruption
4. **No Code Execution**: Pure analysis without eval or dynamic execution

## Documentation

### Updates Required
1. **hooks-documentation.md**: Add hook to available hooks list
2. **AGENT.md**: Document the new protective behavior
3. **README.md**: Note in features section
4. **CHANGELOG.md**: Document addition in next release

### New Documentation
- Create `docs/hooks/prevent-comment-replacement.md` with:
  - Detailed pattern explanations
  - Examples of violations
  - Best practices for AI-assisted editing
  - Configuration options

## Implementation Phases

### Phase 1: MVP/Core functionality
1. Implement basic pattern detection for common placeholders
2. Support JavaScript/TypeScript comment syntax
3. Integrate with Edit/MultiEdit tools
4. Add unit tests for core patterns
5. Test with real-world scenarios

### Phase 2: Enhanced features
1. Add support for multiple language comment styles
2. Implement configurable sensitivity levels
3. Add metrics/logging for pattern effectiveness
4. Support custom pattern additions via configuration
5. Add detailed violation reporting

### Phase 3: Polish and optimization
1. Optimize regex patterns for performance
2. Add machine learning-based detection (if patterns insufficient)
3. Integrate with git diff for better context
4. Add auto-fix suggestions
5. Create VS Code extension for real-time preview

## Open Questions

1. **Threshold Tuning**: What's the optimal line count threshold to avoid false positives?
   - Current proposal: Trigger if > 2 code lines replaced with placeholders
   - May need adjustment based on real-world usage

2. **Language Detection**: Should we auto-detect language from file extension or rely on comment syntax?
   - Current proposal: Use comment syntax patterns that work across languages
   - Alternative: Use file extension for language-specific rules

3. **Configuration**: Should sensitivity be configurable per-project?
   - Current proposal: Start with sensible defaults, add configuration in Phase 2
   - Consider: Project-specific patterns in `.claude/settings.json`

4. **AI Feedback Loop**: Should we collect anonymized violation data to improve Claude's behavior?
   - Privacy implications need consideration
   - Could help train models to avoid this pattern

## References

### Related Issues and PRs
- Similar pattern in `check-any-changed` hook for TypeScript validation
- Hook architecture established in feat-embedded-hooks-system

### External Documentation
- [Claude Code Hooks Documentation](https://docs.claude.com/en/docs/claude-code/hooks)
- [CommonMark Specification](https://spec.commonmark.org/) - For comment syntax
- [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) - For language detection patterns

### Design Patterns
- **Strategy Pattern**: For language-specific detection strategies
- **Chain of Responsibility**: For pattern matching pipeline
- **Template Method**: BaseHook provides structure, hook implements specifics

### Architectural Decisions
- **Self-Contained Principle**: Hook includes all logic inline per claudekit standards
- **Exit Code Convention**: Use code 2 for blocking with AI feedback
- **Error Format**: Follow established claudekit error formatting patterns