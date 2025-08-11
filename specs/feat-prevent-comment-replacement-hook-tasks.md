# Task Breakdown: Prevent Comment Replacement Hook
Generated: 2025-08-10
Source: specs/feat-prevent-comment-replacement-hook.md

## Overview
Implementation of a PostToolUse hook for claudekit that detects and prevents AI models from replacing actual code with placeholder comments during Edit/MultiEdit operations. This will protect codebases from destructive edits where functional code is replaced with comments like "// ... existing implementation ..." or similar placeholders.

## Task Summary
- **Total Tasks**: 12
- **Phase 1 (Foundation)**: 2 tasks
- **Phase 2 (Core Implementation)**: 5 tasks  
- **Phase 3 (Testing)**: 2 tasks
- **Phase 4 (Integration)**: 2 tasks
- **Phase 5 (Documentation)**: 1 task

## Phase 1: Foundation

### Task 1.1: Create Hook Base File Structure
**Description**: Set up the initial TypeScript file structure for the prevent-comment-replacement hook
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: None

**Technical Requirements**:
- Create `cli/hooks/prevent-comment-replacement.ts`
- Import required dependencies from BaseHook and utilities
- Define TypeScript interfaces for Edit, Violation, and HookResult
- Set up class skeleton extending BaseHook

**Implementation Steps**:
1. Create new file `cli/hooks/prevent-comment-replacement.ts`
2. Add imports:
```typescript
import { BaseHook } from './base.js';
import type { HookResult } from './types.js';
```
3. Define interfaces:
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
```
4. Create class skeleton:
```typescript
export class PreventCommentReplacementHook extends BaseHook {
  name = 'prevent-comment-replacement';
  description = 'Prevents replacing code with placeholder comments';
}
```

**Acceptance Criteria**:
- [ ] File created at correct location
- [ ] All TypeScript interfaces defined
- [ ] Class extends BaseHook properly
- [ ] File compiles without errors

### Task 1.2: Define Pattern Constants
**Description**: Define all regex patterns for detecting placeholder comments
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Define PLACEHOLDER_PATTERNS array with all regex patterns
- Include patterns for ellipsis, text placeholders, and bracketed placeholders
- Support multiple language comment styles

**Implementation**:
```typescript
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
```

**Acceptance Criteria**:
- [ ] All pattern categories included
- [ ] Patterns support multiple comment styles
- [ ] Regex patterns compile without errors
- [ ] Patterns are case-insensitive where appropriate

## Phase 2: Core Implementation

### Task 2.1: Implement Main Execute Method
**Description**: Implement the main execute method that orchestrates the hook logic
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2
**Can run parallel with**: Task 2.2

**Technical Requirements**:
- Parse tool input for Edit/MultiEdit
- Handle binary files and malformed input
- Extract edits and detect violations
- Return appropriate exit codes

**Full Implementation**:
```typescript
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
```

**Acceptance Criteria**:
- [ ] Binary files are skipped
- [ ] Malformed input handled gracefully
- [ ] Edit extraction works for both Edit and MultiEdit
- [ ] Violations trigger blocking (exit code 2)
- [ ] Clean edits pass through (exit code 0)

### Task 2.2: Implement File and Edit Processing Methods
**Description**: Implement helper methods for file detection and edit extraction
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.1

**Technical Requirements**:
- Binary file detection with common extensions
- Edit extraction from tool input with size limits
- Support for both Edit and MultiEdit tools

**Full Implementation**:
```typescript
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
```

**Acceptance Criteria**:
- [ ] Binary file detection covers common formats
- [ ] Edit extraction handles both Edit and MultiEdit
- [ ] Size limits prevent performance issues (100KB)
- [ ] Malformed edits are skipped gracefully

### Task 2.3: Implement Violation Detection Logic
**Description**: Implement the core logic for detecting code replacement with placeholder comments
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.2, Task 2.2
**Can run parallel with**: None

**Technical Requirements**:
- Detect when code is replaced with placeholder comments
- Check line counts and content patterns
- Determine violation types for clear error messages

**Full Implementation**:
```typescript
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
```

**Acceptance Criteria**:
- [ ] Detects code replacement with placeholders
- [ ] Threshold prevents false positives (>2 code lines)
- [ ] Line count comparison (< 50% of original)
- [ ] Violation reasons are specific and helpful

### Task 2.4: Implement Pattern Matching Methods
**Description**: Implement methods for comment detection and placeholder pattern matching
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.2
**Can run parallel with**: Task 2.5

**Technical Requirements**:
- Detect various comment styles across languages
- Match placeholder patterns against lines
- Categorize violation types

**Full Implementation**:
```typescript
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
```

**Acceptance Criteria**:
- [ ] Comment detection covers major languages
- [ ] Placeholder patterns match correctly
- [ ] Violation types are accurately categorized
- [ ] Empty lines handled appropriately

### Task 2.5: Implement Error Formatting Method
**Description**: Implement the error formatting method that provides actionable feedback
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.3
**Can run parallel with**: Task 2.4

**Technical Requirements**:
- Format comprehensive error messages
- Show violation details with code snippets
- Provide actionable fix instructions
- Write to stderr for Claude to see

**Full Implementation**:
```typescript
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
```

**Acceptance Criteria**:
- [ ] Error messages are clear and formatted
- [ ] Violations show code context
- [ ] Fix instructions are actionable
- [ ] Exit code 2 blocks the operation
- [ ] Output goes to stderr for Claude

## Phase 3: Testing

### Task 3.1: Create Unit Tests
**Description**: Implement comprehensive unit tests for the hook
**Size**: Large
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 2.4, Task 2.5
**Can run parallel with**: Task 3.2

**Technical Requirements**:
- Test pattern detection for all placeholder types
- Test threshold logic to avoid false positives
- Test legitimate comment handling
- Test multi-language support

**Test Implementation**:
```typescript
// Create file: cli/hooks/__tests__/prevent-comment-replacement.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { PreventCommentReplacementHook } from '../prevent-comment-replacement.js';

describe('PreventCommentReplacementHook', () => {
  let hook: PreventCommentReplacementHook;
  
  beforeEach(() => {
    hook = new PreventCommentReplacementHook();
  });

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
  
  // Purpose: Test reference placeholder detection
  it('should detect "rest of" style placeholders', () => {
    const violations = hook.detectViolations([{
      oldString: 'class Calculator {\n  add(a, b) {\n    return a + b;\n  }\n}',
      newString: '// Rest of implementation'
    }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toBe('Reference placeholder detected');
  });
  
  // Purpose: Test bracketed placeholder detection
  it('should detect bracketed placeholders', () => {
    const violations = hook.detectViolations([{
      oldString: 'const utils = {\n  format: () => {},\n  parse: () => {}\n};',
      newString: '// [utility functions]'
    }]);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toBe('Bracketed placeholder detected');
  });
});
```

**Acceptance Criteria**:
- [ ] All placeholder patterns tested
- [ ] False positive scenarios tested
- [ ] Multi-language comment styles tested
- [ ] Each test has purpose documentation
- [ ] Tests can fail to reveal real issues

### Task 3.2: Create Integration Tests
**Description**: Implement integration tests for Edit and MultiEdit tools
**Size**: Medium
**Priority**: High
**Dependencies**: Task 2.1
**Can run parallel with**: Task 3.1

**Technical Requirements**:
- Test with actual Edit tool payloads
- Test with MultiEdit tool payloads
- Test mixed valid/invalid edits
- Test error output formatting

**Test Implementation**:
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
  
  // Purpose: Test binary file handling
  it('should skip binary files', async () => {
    const result = await executeHook('prevent-comment-replacement', {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/test/image.png',
        old_string: 'binary content',
        new_string: '// placeholder'
      }
    });
    expect(result.exitCode).toBe(0);
  });
  
  // Purpose: Test size limit handling
  it('should skip very large edits', async () => {
    const largeString = 'x'.repeat(200000);
    const result = await executeHook('prevent-comment-replacement', {
      tool_name: 'Edit',
      tool_input: {
        file_path: '/test/file.js',
        old_string: largeString,
        new_string: '// ...'
      }
    });
    expect(result.exitCode).toBe(0);
  });
});
```

**Acceptance Criteria**:
- [ ] Edit tool integration tested
- [ ] MultiEdit tool integration tested
- [ ] Binary file skipping tested
- [ ] Size limit enforcement tested
- [ ] Error messages properly formatted

## Phase 4: Integration

### Task 4.1: Register Hook in System
**Description**: Add the hook to the claudekit hook registry
**Size**: Small
**Priority**: High
**Dependencies**: Task 2.1, Task 2.2, Task 2.3, Task 2.4, Task 2.5
**Can run parallel with**: Task 4.2

**Technical Requirements**:
- Add hook to registry.ts
- Export from index.ts
- Import in runner.ts
- Add to CLI description

**Implementation Steps**:
1. Update `cli/hooks/registry.ts`:
```typescript
import { PreventCommentReplacementHook } from './prevent-comment-replacement.js';

export const HOOK_REGISTRY = {
  // ... existing hooks
  'prevent-comment-replacement': PreventCommentReplacementHook,
};
```

2. Update `cli/hooks/index.ts`:
```typescript
export { PreventCommentReplacementHook } from './prevent-comment-replacement.js';
```

3. Update `cli/hooks/runner.ts`:
```typescript
import { PreventCommentReplacementHook } from './prevent-comment-replacement.js';

// In constructor
this.hooks.set('prevent-comment-replacement', new PreventCommentReplacementHook());
```

4. Update `cli/hooks-cli.ts` with description:
```typescript
'prevent-comment-replacement': 'Prevents replacing code with placeholder comments during edits',
```

**Acceptance Criteria**:
- [ ] Hook registered in all required files
- [ ] Hook available via `claudekit-hooks run prevent-comment-replacement`
- [ ] CLI shows hook in available hooks list
- [ ] No compilation errors

### Task 4.2: Configure Hook in Settings
**Description**: Add hook configuration to project settings
**Size**: Small
**Priority**: High
**Dependencies**: Task 4.1
**Can run parallel with**: Task 4.1

**Technical Requirements**:
- Add to .claude/settings.json
- Configure for Edit and MultiEdit tools
- Set up PostToolUse event

**Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run prevent-comment-replacement"
          }
        ]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] Hook configured in settings.json
- [ ] Triggers on Edit operations
- [ ] Triggers on MultiEdit operations
- [ ] Configuration validates correctly

## Phase 5: Documentation

### Task 5.1: Create Hook Documentation
**Description**: Create comprehensive documentation for the new hook
**Size**: Medium
**Priority**: Medium
**Dependencies**: All previous tasks
**Can run parallel with**: None

**Technical Requirements**:
- Create docs/hooks/prevent-comment-replacement.md
- Update README.md
- Update AGENT.md
- Add to CHANGELOG.md

**Documentation Content**:
```markdown
# Prevent Comment Replacement Hook

## Overview
This hook prevents AI models from replacing functional code with placeholder comments during Edit/MultiEdit operations.

## Problem It Solves
AI coding assistants sometimes replace existing code with comments like:
- `// ... existing implementation ...`
- `// Rest of code`
- `/* Implementation details */`
- `// [Component code]`

This destroys working code and requires manual restoration from git history.

## How It Works
The hook:
1. Analyzes Edit/MultiEdit operations
2. Detects when substantive code (>2 lines) is replaced with placeholder comments
3. Blocks the operation if suspicious patterns are detected
4. Provides clear feedback on how to fix the issue

## Pattern Detection
The hook detects three categories of placeholder comments:

### Ellipsis Patterns
- `// ...`
- `/* ... */`
- `// ... rest of implementation`

### Text Placeholders
- `// Rest of implementation`
- `// Existing code`
- `// Implementation here`

### Bracketed Placeholders
- `// [Component code]`
- `// {existing logic}`
- `// <implementation>`

## Configuration
Add to `.claude/settings.json`:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run prevent-comment-replacement"
          }
        ]
      }
    ]
  }
}
```

## Thresholds
- Triggers when >2 lines of code are replaced
- New content must be <50% of original line count
- Must contain placeholder patterns

## Best Practices
When editing code:
- Include complete implementations
- Use MultiEdit for multiple precise changes
- Expand context boundaries for large sections
- Never use placeholder comments
```

**Acceptance Criteria**:
- [ ] Documentation file created
- [ ] README updated with feature
- [ ] AGENT.md updated with behavior
- [ ] CHANGELOG entry added
- [ ] Examples and configuration included

## Execution Strategy

### Parallel Execution Opportunities
- Phase 1 tasks: Sequential (1.1 → 1.2)
- Phase 2 tasks: 2.1 and 2.2 can run in parallel, then 2.3, then 2.4 and 2.5 in parallel
- Phase 3 tasks: 3.1 and 3.2 can run in parallel after Phase 2
- Phase 4 tasks: 4.1 and 4.2 can run in parallel after Phase 3
- Phase 5: After all previous phases

### Critical Path
1. Task 1.1 → Task 1.2
2. Tasks 2.1, 2.2 (parallel)
3. Task 2.3
4. Tasks 2.4, 2.5 (parallel)
5. Tasks 3.1, 3.2 (parallel)
6. Tasks 4.1, 4.2 (parallel)
7. Task 5.1

### Risk Assessment
- **Low Risk**: Foundation and documentation tasks
- **Medium Risk**: Integration and configuration tasks
- **High Risk**: Core implementation (violation detection logic) - requires careful threshold tuning

## Task Management System
Using: STM (Simple Task Master)