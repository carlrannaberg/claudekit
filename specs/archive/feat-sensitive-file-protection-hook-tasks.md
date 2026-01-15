# Task Breakdown: File Guard Hook
Generated: 2025-08-22
Source: specs/feat-sensitive-file-protection-hook.md

## Overview
Implementation of a PreToolUse hook that prevents AI assistants from accessing sensitive files based on glob patterns from multiple ignore file formats. The hook merges patterns from all available ignore files for comprehensive protection.

## Phase 1: Foundation

### Task 1.1: Create Hook Class Structure
**Description**: Create the base FileGuardHook class with metadata and properties
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Extend BaseHook class from cli/hooks/base.ts
- Define hook metadata with PreToolUse trigger
- Set up class properties for patterns and found files
- Import necessary dependencies

**Implementation from spec**:
```typescript
// cli/hooks/file-guard.ts
import { BaseHook } from './base.js';
import type { HookContext, HookResult } from './base.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import picomatch from 'picomatch';

export class FileGuardHook extends BaseHook {
  name = 'file-guard';
  
  static metadata = {
    id: 'file-guard',
    displayName: 'File Guard',
    description: 'Prevents AI from accessing sensitive files based on ignore file patterns',
    category: 'validation' as const,
    triggerEvent: 'PreToolUse' as const,
    matcher: 'Read|Edit|MultiEdit|Write',
    dependencies: [],
  };

  private ignorePatterns: string[] = [];
  private ignoreFilesFound: string[] = [];

  async execute(context: HookContext): Promise<HookResult> {
    // Implementation in next tasks
  }
}
```

**Acceptance Criteria**:
- [ ] Hook class extends BaseHook
- [ ] Metadata properly defines PreToolUse trigger
- [ ] Matcher includes all four tools: Read, Edit, MultiEdit, Write
- [ ] Class properties initialized correctly
- [ ] TypeScript compilation succeeds

### Task 1.2: Define Default Patterns
**Description**: Create the default patterns constant for essential sensitive files
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1

**Technical Requirements**:
- Minimal set of critical patterns
- Cover environment files, keys, credentials, SSH
- Use gitignore-compatible syntax

**Implementation from spec**:
```typescript
const DEFAULT_PATTERNS = [
  // Environment files
  '.env',
  '.env.*',
  
  // Keys and certificates  
  '*.pem',
  '*.key',
  
  // Cloud credentials
  '.aws/credentials',
  
  // SSH keys
  '.ssh/*',
];
```

**Acceptance Criteria**:
- [ ] Covers essential sensitive file types
- [ ] Uses proper glob patterns
- [ ] Minimal but comprehensive set

## Phase 2: Core Implementation

### Task 2.1: Implement Ignore File Loading
**Description**: Create loadIgnorePatterns method to read and merge patterns from all ignore files
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1, 1.2
**Can run parallel with**: None

**Technical Requirements**:
- Check all six ignore file formats in order
- Merge patterns from all existing files
- Remove duplicates while preserving order
- Fall back to default patterns if no files exist
- Track which ignore files were found

**Implementation from spec**:
```typescript
private async loadIgnorePatterns(projectRoot: string): Promise<void> {
  // Check all ignore files and merge patterns
  const ignoreFiles = [
    '.agentignore',    // OpenAI Codex CLI
    '.aiignore',       // JetBrains AI Assistant
    '.aiexclude',      // Gemini Code Assist
    '.geminiignore',   // Gemini CLI
    '.codeiumignore',  // Codeium
    '.cursorignore'    // Cursor IDE
  ];
  
  const allPatterns: string[] = [];
  this.ignoreFilesFound = [];
  
  // Load and merge patterns from all existing ignore files
  for (const fileName of ignoreFiles) {
    const filePath = path.join(projectRoot, fileName);
    if (await this.fileExists(filePath)) {
      this.ignoreFilesFound.push(fileName);
      const patterns = await this.parseIgnoreFile(filePath);
      allPatterns.push(...patterns);
    }
  }
  
  // Remove duplicates while preserving order (later patterns can override)
  this.ignorePatterns = [...new Set(allPatterns)];
  
  // Add default patterns if no ignore files exist
  if (this.ignoreFilesFound.length === 0) {
    this.ignorePatterns = DEFAULT_PATTERNS;
  }
}
```

**Acceptance Criteria**:
- [ ] Checks all six ignore file formats
- [ ] Merges patterns from all found files
- [ ] Removes duplicate patterns
- [ ] Falls back to defaults when no files exist
- [ ] Tracks which files were found for error messages

### Task 2.2: Implement Pattern Parsing
**Description**: Create parseIgnoreFile method to parse gitignore-style patterns
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 2.3

**Technical Requirements**:
- Parse gitignore syntax
- Skip comments and empty lines
- Preserve negation patterns (!)
- Handle line endings properly

**Implementation from spec**:
```typescript
private async parseIgnoreFile(filePath: string): Promise<string[]> {
  const content = await this.readFile(filePath);
  const lines = content.split('\n');
  const patterns: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    
    // Handle negation patterns (!)
    // Store as-is for proper gitignore-style processing
    patterns.push(trimmed);
  }
  
  return patterns;
}
```

**Acceptance Criteria**:
- [ ] Correctly parses gitignore syntax
- [ ] Skips comments starting with #
- [ ] Skips empty lines and whitespace
- [ ] Preserves negation patterns with !
- [ ] Handles Windows and Unix line endings

### Task 2.3: Implement File Protection Check
**Description**: Create isFileProtected method with symlink resolution and pattern matching
**Size**: Large
**Priority**: High
**Dependencies**: Task 1.1, 2.2
**Can run parallel with**: None

**Technical Requirements**:
- Resolve symlinks to actual targets
- Check both symlink and target paths
- Block access outside project root
- Handle positive and negative patterns
- Use picomatch for glob matching

**Implementation from spec**:
```typescript
import picomatch from 'picomatch';

private async isFileProtected(filePath: string, patterns: string[]): Promise<boolean> {
  // Resolve symlinks to check the actual target
  let targetPath = filePath;
  try {
    targetPath = await fs.realpath(filePath);
  } catch {
    // If symlink resolution fails, use original path
  }
  
  // Check both the symlink and target paths
  const pathsToCheck = [filePath];
  if (targetPath !== filePath) {
    pathsToCheck.push(targetPath);
  }
  
  for (const pathToCheck of pathsToCheck) {
    // Normalize and get relative path
    const normalizedPath = path.normalize(pathToCheck);
    const relativePath = path.relative(this.projectRoot, normalizedPath);
    
    // Don't allow access outside project root
    if (relativePath.startsWith('..')) {
      return true; // Block access outside project
    }
    
    // Separate positive and negative patterns
    const positivePatterns = patterns.filter(p => !p.startsWith('!'));
    const negativePatterns = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));
    
    // Create matchers (without caching for simplicity)
    const positiveMatcher = positivePatterns.length > 0 
      ? picomatch(positivePatterns, {
          dot: true,
          matchBase: true,
          noglobstar: false,
          bash: true
        })
      : () => false;
    
    const negativeMatcher = negativePatterns.length > 0
      ? picomatch(negativePatterns, {
          dot: true,
          matchBase: true,
          noglobstar: false,
          bash: true
        })
      : () => false;
    
    // Check if file matches positive patterns
    const isMatched = positiveMatcher(relativePath);
    
    // If matched, check if it's negated
    if (isMatched && !negativeMatcher(relativePath)) {
      return true; // File is protected
    }
  }
  
  return false; // File is not protected
}
```

**Acceptance Criteria**:
- [ ] Resolves symlinks using fs.realpath
- [ ] Checks both original and target paths
- [ ] Blocks paths outside project root (..)
- [ ] Correctly handles negation patterns
- [ ] Uses picomatch with proper options
- [ ] Returns true for protected files

### Task 2.4: Implement Main Execute Method
**Description**: Create the main execute method that ties everything together
**Size**: Medium
**Priority**: High
**Dependencies**: Tasks 2.1, 2.3
**Can run parallel with**: None

**Technical Requirements**:
- Filter for relevant tools only
- Extract file path from payload
- Load patterns on first use
- Return proper PreToolUse decision
- Include informative error messages

**Implementation from spec**:
```typescript
async execute(context: HookContext): Promise<HookResult> {
  const { payload, projectRoot } = context;
  
  // Only process relevant tools
  const toolName = payload.tool_name;
  if (!['Read', 'Edit', 'MultiEdit', 'Write'].includes(toolName)) {
    return { exitCode: 0 };
  }
  
  // Extract file path from tool input
  const filePath = payload.tool_input?.file_path;
  if (!filePath) {
    return { exitCode: 0 };
  }
  
  // Load ignore patterns if not already loaded
  if (this.ignorePatterns.length === 0) {
    await this.loadIgnorePatterns(projectRoot);
  }
  
  // Check if file is protected
  if (await this.isFileProtected(filePath, this.ignorePatterns)) {
    // Return PreToolUse decision to deny access
    return {
      exitCode: 0,
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Access denied: '${path.basename(filePath)}' is protected by ${this.ignoreFilesFound.length > 0 ? this.ignoreFilesFound.join(', ') : 'default patterns'}. This file matches patterns that prevent AI assistant access.`
      }
    };
  }
  
  // Allow access if not protected
  return {
    exitCode: 0,
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow'
    }
  };
}
```

**Acceptance Criteria**:
- [ ] Filters for Read, Edit, MultiEdit, Write tools
- [ ] Extracts file_path from tool_input
- [ ] Loads patterns lazily on first use
- [ ] Returns deny decision for protected files
- [ ] Returns allow decision for unprotected files
- [ ] Error message shows which ignore files were used

### Task 2.5: Export Hook and Register
**Description**: Export the hook class and register it in the hooks index
**Size**: Small
**Priority**: High
**Dependencies**: Tasks 2.1-2.4
**Can run parallel with**: None

**Technical Requirements**:
- Export from file-guard.ts
- Add to cli/hooks/index.ts exports
- Ensure proper module resolution

**Implementation**:
```typescript
// In cli/hooks/index.ts, add:
export { FileGuardHook } from './file-guard.js';
```

**Acceptance Criteria**:
- [ ] Hook exported from its module
- [ ] Added to hooks index
- [ ] Build succeeds with new hook

## Phase 3: Testing

### Task 3.1: Create Unit Tests
**Description**: Implement unit tests for core hook functionality
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 2 complete
**Can run parallel with**: Task 3.2

**Test scenarios from spec**:
```bash
# tests/unit/hooks/file-guard.test.sh

#!/usr/bin/env bash
source "$(dirname "$0")/../../test-framework.sh"

# Purpose: Verify hook correctly identifies and blocks protected files
test_start "Block .env file access"
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
  claudekit-hooks run file-guard
test_exit_code 0
test_output_contains "permissionDecision.*deny"

# Purpose: Verify hook allows non-protected files
test_start "Allow regular file access"
echo '{"tool_name":"Read","tool_input":{"file_path":"src/index.js"}}' | \
  claudekit-hooks run file-guard
test_exit_code 0
test_output_contains "permissionDecision.*allow"

# Purpose: Test glob pattern matching for nested files
test_start "Block nested secret files"
echo '{"tool_name":"Edit","tool_input":{"file_path":"config/secrets/api.json"}}' | \
  claudekit-hooks run file-guard
test_exit_code 0
test_output_contains "permissionDecision.*deny"

# Purpose: Test negation patterns work correctly
test_start "Allow negated patterns"
# Setup: Create .agentignore with .env and !.env.example
setup_test_project
echo -e ".env\n!.env.example" > .agentignore
echo '{"tool_name":"Read","tool_input":{"file_path":".env.example"}}' | \
  claudekit-hooks run file-guard
test_exit_code 0
test_output_contains "permissionDecision.*allow"
```

**Acceptance Criteria**:
- [ ] Tests blocking of .env files
- [ ] Tests allowing regular files
- [ ] Tests glob pattern matching
- [ ] Tests negation patterns
- [ ] All tests pass

### Task 3.2: Create Integration Tests
**Description**: Implement integration tests for multi-file scenarios
**Size**: Medium
**Priority**: High
**Dependencies**: Phase 2 complete
**Can run parallel with**: Task 3.1

**Test scenarios from spec**:
```bash
# tests/integration/sensitive-file-protection.test.sh

#!/usr/bin/env bash
source "$(dirname "$0")/../test-framework.sh"

# Purpose: Test pattern merging from multiple ignore files
test_start "Pattern merging from multiple files"
create_test_project
echo ".env" > .agentignore
echo "*.secret" > .cursorignore
echo "*.key" > .aiignore
# Test that ALL patterns are active
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
  claudekit-hooks run file-guard | grep -q "deny"
echo '{"tool_name":"Read","tool_input":{"file_path":"test.secret"}}' | \
  claudekit-hooks run file-guard | grep -q "deny"
echo '{"tool_name":"Read","tool_input":{"file_path":"id_rsa.key"}}' | \
  claudekit-hooks run file-guard | grep -q "deny"

# Purpose: Test duplicate pattern handling
test_start "Duplicate pattern deduplication"
create_test_project
echo ".env" > .agentignore
echo ".env" > .cursorignore
# Should still work without errors

# Purpose: Test default patterns when no ignore files exist
test_start "Default patterns fallback"
create_test_project
# No ignore files - should use defaults
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
  claudekit-hooks run file-guard | grep -q "deny"
```

**Acceptance Criteria**:
- [ ] Tests pattern merging from multiple files
- [ ] Tests duplicate deduplication
- [ ] Tests default pattern fallback
- [ ] All integration tests pass

### Task 3.3: Create Edge Case Tests
**Description**: Test edge cases like symlinks, path traversal, and malformed files
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 2 complete
**Can run parallel with**: Tasks 3.1, 3.2

**Test scenarios from spec**:
```bash
# Purpose: Test symlink handling
test_start "Symlink protection"
ln -s /etc/passwd symlink-to-passwd
echo '{"tool_name":"Read","tool_input":{"file_path":"symlink-to-passwd"}}' | \
  claudekit-hooks run file-guard
# Should block access

# Purpose: Test relative vs absolute paths
test_start "Path normalization"
echo '{"tool_name":"Read","tool_input":{"file_path":"../../../etc/passwd"}}' | \
  claudekit-hooks run file-guard
# Should block paths outside project

# Purpose: Test case sensitivity
test_start "Case sensitive patterns"
echo ".env" > .agentignore
echo '{"tool_name":"Read","tool_input":{"file_path":".ENV"}}' | \
  claudekit-hooks run file-guard
# Behavior depends on filesystem

# Purpose: Test empty/malformed ignore files
test_start "Malformed ignore file handling"
echo -e "\n\n#comment\n  \n" > .agentignore
echo '{"tool_name":"Read","tool_input":{"file_path":"test.txt"}}' | \
  claudekit-hooks run file-guard
# Should handle gracefully
```

**Acceptance Criteria**:
- [ ] Symlinks are resolved and blocked
- [ ] Path traversal attempts blocked
- [ ] Malformed files handled gracefully
- [ ] Edge cases don't crash hook

## Phase 4: Documentation

### Task 4.1: Update Hook Documentation
**Description**: Add file-guard to the hooks reference documentation
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 2 complete
**Can run parallel with**: Tasks 4.2, 4.3, 4.4

**Documentation content**:
- Add to docs/reference/hooks.md
- Include description, trigger event, configuration
- Provide usage examples
- Document all supported ignore files

**Acceptance Criteria**:
- [ ] Hook listed in reference docs
- [ ] Examples provided
- [ ] All ignore formats documented

### Task 4.2: Create Security Guide
**Description**: Create a comprehensive security guide for sensitive file protection
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 2 complete
**Can run parallel with**: Tasks 4.1, 4.3, 4.4

**Documentation outline**:
- docs/guides/security.md (new file)
- Explain sensitive file protection
- Best practices for ignore patterns
- Common patterns to use
- Security considerations

**Acceptance Criteria**:
- [ ] Security guide created
- [ ] Best practices documented
- [ ] Pattern examples provided

### Task 4.3: Update README
**Description**: Add sensitive file protection to main README features
**Size**: Small
**Priority**: Low
**Dependencies**: Phase 2 complete
**Can run parallel with**: Tasks 4.1, 4.2, 4.4

**Updates needed**:
- Add to features list
- Quick start section
- Link to detailed documentation

**Acceptance Criteria**:
- [ ] Feature listed in README
- [ ] Quick start example added
- [ ] Links to detailed docs

### Task 4.4: Update AGENTS.md
**Description**: Document ignore file behavior for AI assistants
**Size**: Small  
**Priority**: Low
**Dependencies**: Phase 2 complete
**Can run parallel with**: Tasks 4.1, 4.2, 4.3

**Updates needed**:
- Note about respecting ignore files
- Security considerations section
- Expected behavior when access denied

**Acceptance Criteria**:
- [ ] AGENTS.md updated
- [ ] Security notes added
- [ ] Behavior documented

## Phase 5: Integration

### Task 5.1: Configure Hook in Settings
**Description**: Add hook to default .claude/settings.json configuration
**Size**: Small
**Priority**: High
**Dependencies**: All phases complete
**Can run parallel with**: None

**Configuration to add**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Read|Edit|MultiEdit|Write",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run file-guard"}
        ]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] Hook configured in settings
- [ ] Matcher includes all four tools
- [ ] Command path correct

### Task 5.2: Test End-to-End Integration
**Description**: Test the complete hook integration with Claude Code
**Size**: Medium
**Priority**: High
**Dependencies**: Task 5.1
**Can run parallel with**: None

**Test scenarios**:
1. Create .agentignore with .env pattern
2. Create .env file with test data
3. Attempt to read .env via Claude Code
4. Verify access is denied
5. Create .env.example file
6. Add !.env.example negation pattern
7. Verify .env.example is accessible

**Acceptance Criteria**:
- [ ] Hook triggers on file access
- [ ] Protected files are blocked
- [ ] Negation patterns work
- [ ] Error messages display correctly

## Summary

**Total Tasks**: 16
**Phase Breakdown**:
- Phase 1 (Foundation): 2 tasks
- Phase 2 (Core Implementation): 5 tasks
- Phase 3 (Testing): 3 tasks
- Phase 4 (Documentation): 4 tasks
- Phase 5 (Integration): 2 tasks

**Critical Path**:
1.1 → 2.1 → 2.3 → 2.4 → 2.5 → 5.1 → 5.2

**Parallel Opportunities**:
- Tasks 1.1 and 1.2 can run in parallel
- Tasks 2.2 and initial part of 2.3 can overlap
- All testing tasks (3.1, 3.2, 3.3) can run in parallel
- All documentation tasks (4.1, 4.2, 4.3, 4.4) can run in parallel

**Estimated Effort**:
- Small tasks: 5 (1-2 hours each)
- Medium tasks: 8 (2-4 hours each)
- Large tasks: 3 (4-6 hours each)