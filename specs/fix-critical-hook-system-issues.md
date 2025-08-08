# Fix Critical Hook System Issues

**Status**: Draft  
**Authors**: Claude Assistant, 2025-08-08  
**Priority**: HIGH - Critical production issues affecting all users

## Overview

This specification addresses critical bugs in the claudekit hook system that cause data loss, process hangs, and command failures. These issues affect core functionality including git checkpoint creation, stdin handling, and command argument processing across all hooks.

## Background/Problem Statement

The claudekit hook system has several critical issues that severely impact user experience and system reliability:

1. **Data Loss**: The create-checkpoint hook destroys users' carefully staged git selections
2. **Process Hangs**: CLI tools hang indefinitely when run without piped input
3. **Command Failures**: File paths with spaces break command execution
4. **Inconsistent Detection**: ESLint and test detection logic varies between hooks and misses common configurations
5. **Type Conflicts**: Duplicate type definitions create import confusion

These issues combine to create an unreliable system that can lose work, hang processes, and fail on common use cases.

## Goals

- Preserve git staging state through checkpoint operations
- Prevent CLI hangs by implementing TTY-aware stdin handling
- Support file paths with spaces and special characters reliably
- Unify tool detection logic across all hooks
- Improve error detection and timeout handling
- Consolidate type definitions to avoid conflicts
- Enhance cross-platform compatibility

## Non-Goals

- Complete rewrite of the hook system architecture
- Breaking changes to the public API
- Migration to a different command execution library
- Performance optimizations beyond bug fixes
- Additional feature development

## Technical Dependencies

### External Libraries
- Node.js built-in: `child_process`, `fs`, `path`, `tty`
- `fs-extra`: ^11.2.0 - Enhanced file operations
- `zod`: ^3.23.8 - Runtime validation
- `commander`: ^12.1.0 - CLI interface

### Internal Dependencies
- `cli/hooks/base.ts` - BaseHook abstract class
- `cli/hooks/utils.ts` - Shared utility functions
- `cli/types/hooks.ts` - Type definitions

## Detailed Design

### 1. Staging State Preservation in create-checkpoint

**Problem**: Current implementation runs `git add -A` then `git reset`, destroying any pre-existing staged selection.

**Solution**: Snapshot staged files before checkpoint, then restore after.

```typescript
// cli/hooks/create-checkpoint.ts
class CreateCheckpointHook extends BaseHook {
  async execute(context: HookContext): Promise<HookResult> {
    const projectRoot = context.projectRoot || process.cwd();
    
    // Step 1: Capture current staging state
    const stagedFiles = await this.getStagedFiles(projectRoot);
    
    // Step 2: Check for changes
    const { stdout: status } = await this.execCommand('git', ['status', '--porcelain'], { cwd: projectRoot });
    if (!status.trim()) {
      return this.success('No changes to checkpoint');
    }
    
    // Step 3: Stage all changes temporarily
    await this.execCommand('git', ['add', '-A'], { cwd: projectRoot });
    
    // Step 4: Create stash
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const message = `claude-checkpoint-${timestamp}`;
    await this.execCommand('git', ['stash', 'push', '-u', '-m', message], { cwd: projectRoot });
    
    // Step 5: Restore original staging state
    await this.execCommand('git', ['reset'], { cwd: projectRoot });
    if (stagedFiles.length > 0) {
      // Use -- to safely handle files starting with dash
      await this.execCommand('git', ['add', '--', ...stagedFiles], { cwd: projectRoot });
    }
    
    // Step 6: Clean up old checkpoints
    await this.cleanupOldCheckpoints(projectRoot);
    
    return this.success(`Created checkpoint: ${message}`);
  }
  
  private async getStagedFiles(projectRoot: string): Promise<string[]> {
    const { stdout } = await this.execCommand('git', ['diff', '--name-only', '--cached'], { cwd: projectRoot });
    return stdout.trim().split('\n').filter(Boolean);
  }
}
```

### 2. TTY-Aware stdin Handling

**Problem**: readStdin waits forever when TTY with no piped input, causing CLI hangs.

**Solution**: Detect TTY and handle appropriately with timeout fallback.

```typescript
// cli/hooks/utils.ts
export async function readStdin(timeoutMs: number = 100): Promise<string> {
  // Fast path: if TTY and no data available, return empty
  if (process.stdin.isTTY) {
    return '';
  }
  
  return new Promise((resolve) => {
    let data = '';
    let timeoutId: NodeJS.Timeout | null = null;
    
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      process.stdin.removeAllListeners('data');
      process.stdin.removeAllListeners('end');
      process.stdin.removeAllListeners('error');
    };
    
    // Set up timeout for non-TTY cases with no input
    timeoutId = setTimeout(() => {
      cleanup();
      resolve(data);
    }, timeoutMs);
    
    process.stdin.on('data', (chunk) => {
      data += chunk;
      // Reset timeout on data received
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          cleanup();
          resolve(data);
        }, timeoutMs);
      }
    });
    
    process.stdin.on('end', () => {
      cleanup();
      resolve(data);
    });
    
    process.stdin.on('error', () => {
      cleanup();
      resolve('');
    });
  });
}
```

### 3. Safe Command Argument Handling

**Problem**: Building shell strings with unescaped arguments breaks on spaces and special characters.

**Solution**: Use child_process.spawn with proper argv array or implement robust shell escaping.

```typescript
// cli/hooks/utils.ts
import { spawn } from 'child_process';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
  timedOut?: boolean;
}

export async function execCommand(
  command: string,
  args: string[] = [],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { cwd = process.cwd(), timeout = 30000, env = process.env } = options;
  
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false, // Use direct execution, not shell
      windowsHide: true,
    });
    
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let timeoutId: NodeJS.Timeout | null = null;
    
    // Set up timeout
    if (timeout > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL');
          }
        }, 1000);
      }, timeout);
    }
    
    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code, signal) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      resolve({
        stdout,
        stderr,
        exitCode: code ?? (signal ? 1 : 0),
        signal: signal ?? undefined,
        timedOut,
      });
    });
    
    child.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId);
      
      resolve({
        stdout,
        stderr: stderr + '\n' + error.message,
        exitCode: 1,
        timedOut,
      });
    });
  });
}

// For cases where shell features are needed
export function shellEscape(arg: string): string {
  // Handle empty string
  if (arg === '') return "''";
  
  // If no special characters, return as-is
  if (!/[^a-zA-Z0-9_\-./]/.test(arg)) {
    return arg;
  }
  
  // Use single quotes and escape single quotes
  return "'" + arg.replace(/'/g, "'\\''") + "'";
}

export async function execShellCommand(
  command: string,
  options: ExecOptions = {}
): Promise<ExecResult> {
  // Use shell for complex commands
  return execCommand('sh', ['-c', command], options);
}
```

### 4. Unified ESLint Detection

**Problem**: Different hooks use different detection methods, missing common configurations.

**Solution**: Create unified detection supporting all ESLint config formats.

```typescript
// cli/hooks/utils.ts
export interface ToolDetectionResult {
  available: boolean;
  configPath?: string;
  binaryPath?: string;
}

export async function detectESLint(projectRoot: string): Promise<ToolDetectionResult> {
  // Comprehensive config file list
  const configFiles = [
    // Flat config (ESLint 9+)
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.cjs',
    'eslint.config.ts',
    'eslint.config.mts',
    'eslint.config.cts',
    
    // Legacy config (ESLint 8 and below)
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
    '.eslintrc',
  ];
  
  // Check for config files
  for (const configFile of configFiles) {
    const configPath = path.join(projectRoot, configFile);
    if (await fs.pathExists(configPath)) {
      // Verify binary is available
      const { exitCode } = await execCommand('which', ['eslint']);
      if (exitCode === 0) {
        return { available: true, configPath };
      }
      
      // Check node_modules
      const localBinary = path.join(projectRoot, 'node_modules', '.bin', 'eslint');
      if (await fs.pathExists(localBinary)) {
        return { available: true, configPath, binaryPath: localBinary };
      }
    }
  }
  
  // Check package.json for eslintConfig field
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      if (packageJson.eslintConfig) {
        const { exitCode } = await execCommand('which', ['eslint']);
        if (exitCode === 0) {
          return { available: true, configPath: 'package.json' };
        }
        
        const localBinary = path.join(projectRoot, 'node_modules', '.bin', 'eslint');
        if (await fs.pathExists(localBinary)) {
          return { available: true, configPath: 'package.json', binaryPath: localBinary };
        }
      }
    } catch {
      // Invalid package.json
    }
  }
  
  return { available: false };
}
```

### 5. Robust Test Script Detection

**Problem**: String searching for "test" in package.json is brittle and error-prone.

**Solution**: Parse JSON properly and validate scripts.test field.

```typescript
// cli/hooks/test-project.ts
private async hasTestScript(projectRoot: string): Promise<boolean> {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!await fs.pathExists(packageJsonPath)) {
    return false;
  }
  
  try {
    const packageJson = await fs.readJson(packageJsonPath);
    
    // Check for test script
    if (packageJson.scripts?.test) {
      // Verify it's not the default npm placeholder
      const testScript = packageJson.scripts.test;
      if (typeof testScript === 'string' && 
          !testScript.includes('Error: no test specified') &&
          testScript !== 'echo "Error: no test specified" && exit 1') {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    // Invalid JSON or read error
    return false;
  }
}
```

### 6. Type Definition Consolidation

**Problem**: Duplicate type names in different files cause import confusion.

**Solution**: Consolidate all hook types in a single module with clear exports.

```typescript
// cli/types/hooks.ts - Single source of truth
export interface HookContext {
  tool?: string;
  filePath?: string;
  projectRoot?: string;
  packageManager?: PackageManager;
  config?: Record<string, any>;
}

export interface HookResult {
  success: boolean;
  message?: string;
  exitCode?: number;
  details?: Record<string, any>;
}

export interface PackageManager {
  name: 'npm' | 'yarn' | 'pnpm';
  exec: string;
  install: string;
  test: string;
  lockFile: string;
}

// Remove duplicate definitions from cli/hooks/base.ts
// Import from cli/types/hooks.ts instead
```

### 7. Cross-Platform File Finding

**Problem**: Shelling out to `find` command has quoting issues and platform dependencies.

**Solution**: Use Node.js glob library for cross-platform file finding.

```typescript
// cli/hooks/utils.ts
import { glob } from 'glob';

export async function findFiles(
  pattern: string,
  directory: string = process.cwd()
): Promise<string[]> {
  try {
    // Convert find-style patterns to glob patterns
    let globPattern = pattern;
    
    // Handle common find patterns
    if (pattern.startsWith('*.')) {
      globPattern = `**/${pattern}`;
    } else if (!pattern.includes('*') && !pattern.includes('/')) {
      globPattern = `**/${pattern}`;
    }
    
    const files = await glob(globPattern, {
      cwd: directory,
      nodir: true,
      ignore: ['**/node_modules/**', '**/.git/**'],
    });
    
    return files.map(f => path.join(directory, f));
  } catch (error) {
    return [];
  }
}
```

## User Experience

Users will experience:

1. **Preserved Git State**: Staged files remain staged after checkpoints
2. **No More Hangs**: CLI tools work correctly whether piped or interactive
3. **Reliable Commands**: File paths with spaces work consistently
4. **Better Detection**: All ESLint config formats are recognized
5. **Clear Errors**: Timeout vs failure is clearly distinguished
6. **Consistent Behavior**: All hooks use the same detection logic

Example workflow:
```bash
# User stages specific files
git add src/important.ts

# Claude Code triggers checkpoint
claudekit-hooks run create-checkpoint
# Checkpoint created, staged files preserved

# User has files with spaces
claudekit-hooks run test-changed '{"file_path": "test/my tests/feature test.spec.ts"}'
# Tests run successfully despite spaces in path

# Direct CLI usage doesn't hang
echo '{"tool": "Write"}' | claudekit-hooks run lint-changed
# Processes immediately, no hang
```

## Testing Strategy

### Unit Tests

#### Test TTY Detection
```typescript
// tests/hooks/unit/utils.test.ts
describe('readStdin', () => {
  it('returns empty immediately when TTY', async () => {
    const originalIsTTY = process.stdin.isTTY;
    process.stdin.isTTY = true;
    
    const start = Date.now();
    const result = await readStdin();
    const elapsed = Date.now() - start;
    
    expect(result).toBe('');
    expect(elapsed).toBeLessThan(10); // Should be instant
    
    process.stdin.isTTY = originalIsTTY;
  });
  
  it('reads piped input correctly', async () => {
    // Mock stdin as non-TTY with data
    // Test reads complete input
  });
  
  it('times out on non-TTY with no input', async () => {
    // Mock stdin as non-TTY but no data
    // Verify timeout after 100ms
  });
});
```

#### Test Command Escaping
```typescript
describe('execCommand', () => {
  it('handles file paths with spaces', async () => {
    const result = await execCommand('echo', ['file with spaces.txt']);
    expect(result.stdout.trim()).toBe('file with spaces.txt');
  });
  
  it('handles special characters', async () => {
    const result = await execCommand('echo', ["file'with\"quotes.txt"]);
    expect(result.stdout.trim()).toBe("file'with\"quotes.txt");
  });
  
  it('detects timeouts correctly', async () => {
    const result = await execCommand('sleep', ['10'], { timeout: 100 });
    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGTERM');
  });
});
```

#### Test Staging Preservation
```typescript
describe('CreateCheckpointHook', () => {
  it('preserves staged files', async () => {
    // Setup: stage specific files
    await execCommand('git', ['add', 'file1.txt']);
    
    // Execute checkpoint
    const hook = new CreateCheckpointHook();
    await hook.execute({ projectRoot: '/test/repo' });
    
    // Verify: staged files still staged
    const { stdout } = await execCommand('git', ['diff', '--name-only', '--cached']);
    expect(stdout.trim()).toBe('file1.txt');
  });
});
```

### Integration Tests

#### Full Workflow Test
```typescript
describe('Hook System Integration', () => {
  it('handles complete edit-lint-test workflow', async () => {
    // 1. Simulate file edit
    // 2. Run typecheck-changed
    // 3. Run lint-changed
    // 4. Run test-changed
    // 5. Create checkpoint
    // 6. Verify all succeed without hangs or errors
  });
});
```

### Mocking Strategies

- Mock `child_process.spawn` for command execution tests
- Mock `fs-extra` for file system operations
- Mock `process.stdin` for TTY detection tests
- Use temporary git repositories for checkpoint tests

### Edge Case Testing

1. **Empty repositories**: No git history
2. **Binary files**: Non-text file handling
3. **Symbolic links**: Symlinked files and directories
4. **Permission errors**: Read-only files
5. **Large files**: Performance with large outputs
6. **Concurrent execution**: Multiple hooks running simultaneously

## Performance Considerations

### Improvements
- TTY detection is instant (no waiting)
- Spawn is more efficient than exec for simple commands
- Cached detection results reduce repeated file checks

### Potential Impacts
- Spawn requires more setup for shell features
- Additional staging snapshot adds git operations

### Mitigation
- Use spawn for simple commands, shell for complex
- Cache git status between operations
- Implement detection result caching per session

## Security Considerations

### Command Injection Prevention
- Using spawn with argv array prevents injection
- Shell escaping for necessary shell commands
- Never interpolate user input directly into commands

### File Path Validation
- Validate paths are within project root
- Handle symbolic links safely
- Prevent directory traversal attacks

### Sensitive Data
- Never log full command output by default
- Sanitize error messages before display
- Exclude sensitive files from checkpoints

## Documentation

### Updates Required

1. **AGENT.md**: Document new patterns and best practices
2. **Hook Documentation**: Update each hook's documentation
3. **CLI Help**: Update command descriptions
4. **README**: Note breaking changes in changelog
5. **Testing Guide**: Document new test patterns

### Migration Guide

```markdown
## Breaking Changes

### Command Execution
- Commands with file path arguments now properly handle spaces
- Update any custom commands to use the new execCommand signature

### Stdin Handling  
- CLI tools no longer wait for stdin when run interactively
- Pipe input explicitly: `echo '{}' | claudekit-hooks run hook-name`

### Type Imports
- Import hook types from `cli/types/hooks` not `cli/hooks/base`
- Update: `import { HookResult } from 'cli/types/hooks'`
```

## Implementation Phases

### Phase 1: Critical Fixes (Immediate)
**Timeline**: 1-2 days

1. Fix staging preservation in create-checkpoint
2. Implement TTY-aware readStdin
3. Fix command argument escaping
4. Add timeout detection to execCommand

**Deliverables**:
- Updated create-checkpoint.ts
- Updated utils.ts with new readStdin and execCommand
- Basic unit tests

### Phase 2: Detection Unification (Week 1)
**Timeline**: 2-3 days

1. Implement unified ESLint detection
2. Fix test script detection with JSON parsing
3. Update all hooks to use unified detection
4. Consolidate type definitions

**Deliverables**:
- New detection utilities in utils.ts
- Updated all hook files
- Consolidated types in cli/types/hooks.ts

### Phase 3: Polish and Testing (Week 2)
**Timeline**: 2-3 days

1. Comprehensive test coverage
2. Cross-platform testing
3. Performance optimization
4. Documentation updates

**Deliverables**:
- Complete test suite
- Updated documentation
- Performance benchmarks
- Migration guide

## Open Questions

1. **Backward Compatibility**: Should we maintain compatibility with shell string commands for custom configs?
   - Recommendation: Support both with deprecation warning

2. **Config Migration**: Should we auto-migrate user configs to new format?
   - Recommendation: Provide migration command

3. **ESLint Flat Config**: How to handle ESLint 9+ flat config completely?
   - Recommendation: Full support with version detection

4. **Windows Support**: Full Windows compatibility or WSL only?
   - Recommendation: WSL minimum, native stretch goal

5. **Hook Timeout Defaults**: What should default timeout be?
   - Recommendation: 30s for most, 5m for tests

## References

### External Documentation
- [Node.js child_process documentation](https://nodejs.org/api/child_process.html)
- [ESLint Configuration Files](https://eslint.org/docs/latest/use/configure/configuration-files)
- [Git Stash Documentation](https://git-scm.com/docs/git-stash)
- [TTY Module Documentation](https://nodejs.org/api/tty.html)

### Related Issues
- Internal bug reports from user feedback
- Performance issues with large repositories
- Cross-platform compatibility requests

### Design Patterns
- [Command Pattern](https://refactoring.guru/design-patterns/command) - Hook execution model
- [Strategy Pattern](https://refactoring.guru/design-patterns/strategy) - Detection strategies
- [Template Method](https://refactoring.guru/design-patterns/template-method) - BaseHook structure

## Appendix: Quick Implementation Checklist

### High Priority (Day 1)
- [ ] Fix staging preservation in create-checkpoint
- [ ] Implement TTY detection in readStdin  
- [ ] Add timeout to readStdin
- [ ] Switch execCommand to use spawn

### Medium Priority (Week 1)
- [ ] Unify ESLint detection
- [ ] Fix test script detection
- [ ] Implement proper argument escaping
- [ ] Add timeout/signal detection

### Low Priority (Week 2)
- [ ] Consolidate type definitions
- [ ] Replace find with glob
- [ ] Add configurable warning levels
- [ ] Improve 'any' detection accuracy

### Testing & Documentation
- [ ] Unit tests for all changes
- [ ] Integration tests for workflows
- [ ] Update AGENT.md
- [ ] Update hook documentation
- [ ] Create migration guide

## Success Metrics

1. **Zero data loss**: No staged files lost during checkpoints
2. **Zero hangs**: CLI never hangs on missing input
3. **100% path support**: All valid file paths work
4. **Unified detection**: Same results across all hooks
5. **Clear errors**: Users understand failures immediately
6. **Backward compatible**: Existing configs continue working

## Risk Assessment

### High Risk
- Breaking existing user configurations
- Introducing new bugs while fixing old ones

### Mitigation
- Comprehensive testing before release
- Gradual rollout with feature flags
- Clear migration documentation
- Ability to rollback changes

## Conclusion

These fixes address critical issues that significantly impact the reliability and usability of the claudekit hook system. The phased implementation approach ensures we can deliver immediate relief for the most critical issues while properly addressing the architectural improvements needed for long-term stability.

The focus on preserving user data (git staging), preventing hangs, and supporting common use cases (spaces in paths) will dramatically improve the user experience while maintaining backward compatibility where possible.