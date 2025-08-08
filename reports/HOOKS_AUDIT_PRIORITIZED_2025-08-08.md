# Hooks Implementation Audit - Prioritized Report

## Executive Summary

This audit identifies critical security vulnerabilities requiring immediate attention, high-priority stability issues that can break Claude Code workflows, and medium-priority improvements for long-term maintainability. Command injection and path traversal vulnerabilities must be fixed first, followed by error handling to prevent workflow disruptions.

## 🔴 CRITICAL - Security Vulnerabilities (Fix Immediately)

### 1. Command Injection
**Severity: CRITICAL - Allows arbitrary code execution**

**Vulnerable Locations:**
- **utils.ts:85**: `args.join(' ')` concatenated into shell command
  ```typescript
  const fullCommand = `${command} ${args.join(' ')}`;
  await execAsync(fullCommand, ...)  // VULNERABLE
  ```

- **utils.ts:176**: Direct interpolation in find command
  ```typescript
  await executeCommand(`find . -name "${pattern}"`, directory)  // VULNERABLE
  ```

- **lint-changed.ts:79**: File path in quotes still vulnerable
  ```typescript
  eslintArgs.push(`"${filePath}"`)  // VULNERABLE to quotes in filename
  ```

- **test-changed.ts:44**: Test files concatenated to command
  ```typescript
  await this.execCommand(testCommand, ['--', ...testFiles])  // VULNERABLE
  ```

- **All project hooks**: Unvalidated config commands
  ```typescript
  const command = this.config.command ?? defaultCommand;
  await this.execCommand(command, ...)  // Config could contain arbitrary commands
  ```

**Required Fix:**
```typescript
// Replace exec with spawn using array arguments
import { spawn } from 'child_process';
const child = spawn(command, args, { shell: false });

// Never concatenate strings for shell commands
// Validate and whitelist commands from config
```

### 2. Path Traversal
**Severity: CRITICAL - Can access files outside project**

**Vulnerable Locations:**
- **utils.ts:180**: Unvalidated path joining
  ```typescript
  .map((file) => path.join(directory, file))  // No validation
  ```

- **check-todos.ts:23**: Incomplete tilde expansion
  ```typescript
  transcriptPath.replace(/^~/, process.env['HOME'] ?? '')  // Doesn't handle ~user
  ```

- **All hooks**: No validation that filePath is inside projectRoot

**Required Fix:**
```typescript
// Validate all paths are within projectRoot
function validatePath(filePath: string, projectRoot: string): boolean {
  const resolved = path.resolve(filePath);
  const root = path.resolve(projectRoot);
  return resolved.startsWith(root + path.sep) || resolved === root;
}

// Complete path expansion
import * as os from 'os';
function expandPath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  // Handle ~user format if needed
  return filePath;
}
```

## 🟠 HIGH - Stability Issues (Fix to Prevent Workflow Breaks)

### Error Handling Gaps
**Impact: Crashes during hooks break Claude Code workflows and confuse users**

**Critical Gaps:**
- **runner.ts:97**: No try-catch around hook execution
  ```typescript
  const result = await hook.run(payload);  // Can throw and crash process
  ```

- **base.ts:51**: No error boundary in main run method
  ```typescript
  async run(payload: ClaudePayload): Promise<HookResult> {
    // No try-catch wrapper - async errors crash
  ```

- **utils.ts:17-24**: readStdin has no error handling
  ```typescript
  export async function readStdin(): Promise<string> {
    return new Promise((resolve) => {
      // No reject path, no timeout, no error handling
  ```

- **Multiple empty catch blocks** hiding real errors:
  ```typescript
  } catch {
    // Return empty stats if file doesn't exist or is corrupted
  }  // User never knows what went wrong
  ```

**Required Fix:**
```typescript
// Add comprehensive error boundaries
async run(payload: ClaudePayload): Promise<HookResult> {
  try {
    // ... existing logic
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    this.error('Hook execution failed', message, [
      'Check the error message above',
      'Verify your configuration',
      'Report persistent issues'
    ]);
    return { exitCode: 1, error: message };
  }
}

// Replace empty catches with proper logging
} catch (error) {
  if (this.debug) {
    console.error('[DEBUG] Config load failed:', error);
  }
  return { hooks: {} };  // Still return default but log the issue
}
```

## 🟡 MEDIUM - Important Improvements

### 1. Memory Management
**Impact: Can cause issues with large projects but rarely user-impacting**

**Issues:**
- **utils.ts:90**: 10MB buffer limit for command output
- **check-todos.ts:64**: Reads entire transcript into memory
- **logging.ts:176**: Loads entire log file for last N entries

**Solutions:**
- Implement streaming for files >1MB
- Add bounded window search from end
- Set configurable buffer limits

### 2. Race Conditions
**Impact: Can cause data corruption in edge cases**

**Issues:**
- **create-checkpoint.ts:27-41**: Git state could change between operations
- **logging.ts:68-75**: Concurrent processes could corrupt stats file

**Solutions:**
- Use atomic git operations
- Implement file locking for shared resources

### 3. Performance Optimizations
**Impact: Slower operations but functional**

**Meaningful Optimizations:**
- Cache package manager detection per session
- Cache tool availability checks
- Parallelize test file discovery
- Compile regexes once outside loops

### 4. Configuration Management
**Impact: Limited extensibility**

**Improvements:**
- Consolidate config schemas
- Support local config overrides
- Allow dynamic hook registration
- Expose per-hook options

## 🟢 LOW - Minor Issues

### Low Priority Items
- **ESLint config file checks** - Only ~6 files, sequential is fine
- **Floating-point precision in averages** - Negligible impact
- **O(n) shift() operation** - Only on 10-item arrays
- **Double undefined checks** - Redundant but harmless

## Testing Priority

### Critical Tests Needed First
1. **Security Tests:**
   - Filenames with shell metacharacters
   - Path traversal attempts
   - Command injection via config

2. **Stability Tests:**
   - Error propagation and handling
   - Malformed JSON payloads
   - Missing/corrupt configuration

3. **Core Functionality:**
   - Quoted paths (spaces in filenames)
   - Staged set preservation
   - Basic monorepo support

## Implementation Plan

### Week 1: Security Critical
- [ ] Replace all exec with spawn
- [ ] Add path validation utilities
- [ ] Validate all user inputs
- [ ] Add command whitelisting

### Week 2: Stability
- [ ] Add error boundaries to all async functions
- [ ] Replace empty catches with logging
- [ ] Add timeout handling
- [ ] Improve error messages

### Week 3: Testing & Performance
- [ ] Add security test suite
- [ ] Implement caching layer
- [ ] Add file locking where needed
- [ ] Optimize hot paths only

### Week 4: Features & UX
- [ ] Monorepo support
- [ ] Better CLI output
- [ ] Configuration improvements
- [ ] Documentation

## Quick Wins (Can Do Immediately)

1. **Add CLAUDEKIT_SKIP_HOOKS env variable** - Emergency escape hatch
2. **Replace `cat` with `fs.readFile`** in test-project.ts
3. **Add `--no-color` flag** to tool commands for cleaner logs
4. **Fix stash index bug** in create-checkpoint.ts (indices change after drop)
5. **Document exit codes** in README

## Validation Checklist

After implementing fixes, verify:
- [ ] No string concatenation in shell commands
- [ ] All paths validated against projectRoot
- [ ] All async operations have try-catch
- [ ] No empty catch blocks without logging
- [ ] Error messages guide users to solutions
- [ ] Tests pass with files containing spaces and special characters
- [ ] Hooks can be skipped via environment variable
- [ ] Concurrent hook executions don't corrupt data

## Summary

Focus on **CRITICAL** security fixes first (command injection, path traversal), then **HIGH** priority error handling to prevent workflow disruptions. The **MEDIUM** priority items improve robustness but aren't blocking users today. Skip the **LOW** priority items unless you're doing general cleanup.

The most important principle: **Never trust user input** - validate, sanitize, and use safe APIs (spawn over exec, parameterized commands over string concatenation).