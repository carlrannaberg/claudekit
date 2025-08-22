# Feature Specification: Sensitive File Protection Hook

**Status**: Draft  
**Authors**: Claude AI Assistant, 2025-08-22  
**Version**: 1.0.0

## Overview

Implementation of a PreToolUse hook that prevents AI assistants from reading or editing sensitive files based on glob patterns. The hook will merge patterns from all available ignore files (`.agentignore`, `.aiignore`, `.aiexclude`, `.geminiignore`, `.codeiumignore`, `.cursorignore`) to create a comprehensive protection list, similar to how `.gitignore` works for version control.

## Background/Problem Statement

AI coding assistants have broad access to project files, which can inadvertently expose sensitive information such as:
- Environment variables (`.env` files)
- API keys and secrets
- Private configuration files
- Proprietary or confidential code sections
- Personal data files

Currently, there's no standardized way in ClaudeKit to prevent AI assistants from accessing these sensitive files. While various AI tools (Cursor, JetBrains AI, etc.) have implemented their own ignore mechanisms, ClaudeKit lacks this critical security feature.

## Goals

- Prevent AI assistants from reading sensitive files via the Read tool
- Prevent AI assistants from editing sensitive files via Edit/MultiEdit/Write tools
- Support multiple ignore file formats (`.agentignore`, `.aiignore`, `.aiexclude`, `.geminiignore`, `.codeiumignore`, `.cursorignore`)
- Merge patterns from all available ignore files for comprehensive protection
- Provide clear feedback when access is denied
- Support glob patterns with negation for flexible file matching
- Resolve symlinks to prevent bypass attempts
- Integrate seamlessly with existing hook infrastructure

## Non-Goals

- Not implementing a permission escalation system (no sudo/override mechanism)
- Not creating a new ignore file syntax (reuse `.gitignore` syntax)
- Not modifying core Claude Code behavior (hook-based implementation only)
- Not implementing file encryption or obfuscation
- Not handling binary file restrictions (separate concern)
- Not implementing configuration files (only ignore files)
- Not implementing caching or performance optimizations in MVP
- Not implementing user-level patterns (project-level only)

## Technical Dependencies

### Internal Dependencies
- ClaudeKit hook system (cli/hooks/)
- BaseHook class for hook implementation
- HookContext and HookResult interfaces
- Configuration loading utilities
- File system utilities (fs/promises)

### External Dependencies
- `picomatch` (v4.0.3) - Already a direct dependency in package.json
- Node.js built-in modules: `fs`, `path`, `readline`
- No additional npm packages required

**Note**: picomatch is already being used in `cli/utils/transcript-parser.ts` and is a direct dependency, ensuring proper bundling

### Version Requirements
- Node.js 18+ (for native fs/promises support)
- ClaudeKit 1.0.0+ (current version)

## Detailed Design

### Architecture Overview

```
┌─────────────────────┐
│  Claude Code Tool   │
│  (Read/Edit/etc)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│   PreToolUse Hook   │
│   Event Triggered   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SensitiveFileGuard  │
│       Hook          │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │ Load Ignore  │
    │   Patterns   │
    └──────┬───────┘
           │
    ┌──────▼───────┐     ┌─────────────┐
    │ .agentsignore│ ──► │.cursorignore│
    └──────┬───────┘     └─────────────┘
           │
           ▼
    ┌──────────────┐
    │ Match File   │
    │   Pattern    │
    └──────┬───────┘
           │
     ┌─────▼─────┐
     │ Matched?  │
     └─────┬─────┘
           │
    ┌──────▼──────┐
    │   Yes: Deny │
    │   No: Allow │
    └─────────────┘
```

### Implementation Components

#### 1. Hook Class Structure

```typescript
// cli/hooks/file-guard.ts
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
    // Implementation details below
  }
}
```

#### 2. Ignore File Loading Logic

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
```

#### 3. Pattern Parsing

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

#### 4. File Matching Logic

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

#### 5. Hook Decision Logic

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

### Default Protected Patterns (Minimal Set)

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

## User Experience

### For Developers

1. **Creating Ignore Files**: Developers can create any of these ignore files (patterns are merged from all):
   - `.agentignore` (OpenAI Codex CLI)
   - `.aiignore` (JetBrains AI Assistant)
   - `.aiexclude` (Gemini Code Assist)
   - `.geminiignore` (Gemini CLI)
   - `.codeiumignore` (Codeium)
   - `.cursorignore` (Cursor IDE)
   
   ```bash
   # .agentignore
   # Protect environment files
   .env
   .env.*
   
   # Protect API keys
   config/secrets.json
   
   # Protect entire directories
   private/
   credentials/
   
   # Allow specific files with negation
   !.env.example
   ```

2. **Hook Installation**: Via claudekit setup or manual configuration:
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

### For AI Assistants

When attempting to access a protected file:
```
User: Can you read my .env file?
Assistant: [Attempts Read tool]
System: Access denied: '.env' is protected by .agentsignore. This file matches patterns that prevent AI assistant access.
Assistant: I'm unable to read the .env file as it's protected by your security settings. This is intentional to prevent accidental exposure of sensitive information like API keys and passwords.
```

## Testing Strategy

### Unit Tests

```bash
# tests/unit/hooks/file-guard.test.sh

# Purpose: Verify hook correctly identifies and blocks protected files
test_start "Block .env file access"
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
  claudekit-hooks run file-guard
# Expect: permissionDecision: deny

# Purpose: Verify hook allows non-protected files
test_start "Allow regular file access"
echo '{"tool_name":"Read","tool_input":{"file_path":"src/index.js"}}' | \
  claudekit-hooks run file-guard
# Expect: permissionDecision: allow

# Purpose: Test glob pattern matching for nested files
test_start "Block nested secret files"
echo '{"tool_name":"Edit","tool_input":{"file_path":"config/secrets/api.json"}}' | \
  claudekit-hooks run file-guard
# Expect: permissionDecision: deny

# Purpose: Test negation patterns work correctly
test_start "Allow negated patterns"
# With .agentsignore containing: .env\n!.env.example
echo '{"tool_name":"Read","tool_input":{"file_path":".env.example"}}' | \
  claudekit-hooks run file-guard
# Expect: permissionDecision: allow
```

### Integration Tests

```bash
# tests/integration/sensitive-file-protection.test.sh

# Purpose: Test pattern merging from multiple ignore files
test_start "Pattern merging from multiple files"
create_test_project
echo ".env" > .agentignore
echo "*.secret" > .cursorignore
echo "*.key" > .aiignore
# Test that ALL patterns are active (.env, *.secret, *.key)

# Purpose: Test duplicate pattern handling
test_start "Duplicate pattern deduplication"
create_test_project
echo ".env" > .agentignore
echo ".env" > .cursorignore
# Test that duplicates are removed

# Purpose: Test default patterns when no ignore files exist
test_start "Default patterns fallback"
create_test_project
# No ignore files
# Test that default patterns are used
```

### Edge Case Testing

```bash
# Purpose: Test symlink handling
test_start "Symlink protection"
ln -s /etc/passwd symlink-to-passwd
# Verify symlinks to sensitive files are blocked

# Purpose: Test relative vs absolute paths
test_start "Path normalization"
# Test ../../../etc/passwd style paths are handled

# Purpose: Test case sensitivity
test_start "Case sensitive patterns"
# Test .ENV vs .env matching behavior

# Purpose: Test empty/malformed ignore files
test_start "Malformed ignore file handling"
echo -e "\n\n#comment\n  \n" > .agentsignore
# Should handle gracefully
```

### Mocking Strategies

- Mock file system for testing without real files
- Mock configuration loading for different scenarios
- Mock tool payloads for various Claude Code tools

## Security Considerations

### Key Security Features

1. **Symlink Resolution**: The hook resolves symlinks to their actual targets and checks both paths
2. **Path Traversal Prevention**: Blocks any file access outside the project root
3. **Generic Error Messages**: Doesn't reveal whether files exist or are protected

### Implementation Notes

- Symlink resolution is handled in `isFileProtected()` using `fs.realpath()`
- Paths starting with `..` are automatically blocked
- Both the symlink and its target are checked against patterns

## Documentation

### Files to Create/Update

1. **Hook Documentation**: `docs/reference/hooks.md`
   - Add file-guard to hook list
   - Document configuration options
   - Provide examples

2. **Security Guide**: `docs/guides/security.md` (new)
   - Explain sensitive file protection
   - Best practices for .agentsignore
   - Common patterns to protect

3. **README Updates**: `README.md`
   - Add to features list
   - Quick start example
   - Link to detailed docs

4. **AGENTS.md Updates**: `AGENTS.md`
   - Note about respecting .agentsignore
   - Security considerations for AI assistants

### Example Documentation

```markdown
## Sensitive File Protection

ClaudeKit includes built-in protection for sensitive files using ignore files.

### Quick Start

1. Create any of these files in your project root (patterns are merged from all):
   - `.agentignore` (OpenAI Codex CLI)
   - `.aiignore` (JetBrains AI Assistant)
   - `.aiexclude` (Gemini Code Assist)
   - `.geminiignore` (Gemini CLI)
   - `.codeiumignore` (Codeium)
   - `.cursorignore` (Cursor IDE)

```
# Protect environment files
.env
.env.*

# Protect credentials
*.key
*.pem
.aws/credentials

# Allow specific files with negation
!.env.example
```

2. Files matching these patterns will be inaccessible to AI assistants

### Pattern Syntax

Uses the same syntax as `.gitignore`:
- `*.ext` - Match by extension
- `dir/` - Match directories
- `!pattern` - Negate a pattern (allow exceptions)
- `**/file` - Match in any directory

### Compatibility

The hook merges patterns from multiple ignore file formats for comprehensive protection across AI tools:
- `.agentignore` - OpenAI Codex CLI
- `.aiignore` - JetBrains AI Assistant
- `.aiexclude` - Gemini Code Assist
- `.geminiignore` - Gemini CLI
- `.codeiumignore` - Codeium
- `.cursorignore` - Cursor IDE

**Note**: Unlike other tools that use only one ignore file, ClaudeKit merges patterns from ALL available ignore files to ensure maximum protection.
```

## Implementation Phases

### Phase 1: Complete Implementation

**Deliverables:**
- Full hook implementation with Read/Edit/MultiEdit/Write blocking
- Support for all ignore files (`.agentignore`, `.aiignore`, `.aiexclude`, `.geminiignore`, `.codeiumignore`, `.cursorignore`)
- Pattern merging from all available ignore files
- Glob pattern matching with negation support
- Symlink resolution and path traversal protection
- Minimal default patterns for essential files
- Complete test suite

**Key Files:**
- `cli/hooks/file-guard.ts`
- `tests/unit/hooks/file-guard.test.sh`
- `tests/integration/sensitive-file-protection.test.sh`
- Update `cli/hooks/index.ts` to export new hook

### Phase 2: Documentation and Adoption (Future)

**Deliverables:**
- Comprehensive documentation
- Migration guides from other AI tools
- Community feedback integration
- Pattern library/examples

**Key Files:**
- `docs/guides/security.md`
- `docs/guides/migration-from-cursor.md`
- Example ignore files

### Phase 3: Optimization (If Needed)

**Deliverables:**
- Performance profiling
- Caching if bottlenecks identified
- Advanced pattern features based on usage

**Note:** Phase 3 only if performance issues arise in production

## Open Questions

1. **Write Tool Handling**: Should Write tool block creating new files that match patterns?
   - Recommendation: Yes, deny creating new files matching patterns

2. **Directory Patterns**: How to handle directory-level patterns?
   - Recommendation: Block all files within matched directories

3. **Error Message Detail**: Balance between helpful and secure error messages
   - Current approach: Show which ignore file was used but not full path

4. **Default Patterns**: Should we have defaults or require explicit configuration?
   - Current approach: Minimal defaults for critical files only

## References

### External Documentation
- [Gitignore Specification](https://git-scm.com/docs/gitignore)
- [Cursor Ignore Files Documentation](https://cursordocs.com/en/docs/context/ignore-files)
- [Minimatch Pattern Matching](https://github.com/isaacs/minimatch)
- [Node.js Path Security](https://nodejs.org/en/docs/guides/security/)

### Related Issues and PRs
- ClaudeKit Hook System: `cli/hooks/base.ts`
- Existing validation hooks for reference patterns
- Configuration system: `cli/types/claudekit-config.ts`

### Design Patterns
- **Strategy Pattern**: For switching between ignore file sources
- **Chain of Responsibility**: For pattern matching precedence
- **Observer Pattern**: For file change detection and cache invalidation
- **Factory Pattern**: For creating matchers based on tool type

### Industry Standards
- `.gitignore` syntax (de facto standard for pattern matching)
- `.cursorignore` (Cursor IDE)
- `.aiignore` (JetBrains AI Assistant)
- `.aiexclude` (Gemini Code Assist)
- `.geminiignore` (Gemini CLI)
- `.codeiumignore` (Codeium)
- `.agentignore` (OpenAI Codex CLI)