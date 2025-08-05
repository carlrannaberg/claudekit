# Task Breakdown: Migrate claudekit Setup to Embedded Hooks System
Generated: 2025-07-31
Source: specs/feat-migrate-to-embedded-hooks.md

## Overview
This task breakdown implements the migration from bash hook files to the embedded TypeScript hooks system (`claudekit-hooks` executable). The migration eliminates all bash hook files and updates the setup command to generate configurations using the new embedded hooks.

## Phase 1: Core Migration (MVP)

### Task 1.1: Update createProjectSettings to Generate Embedded Hook Commands
**Description**: Modify the settings generation function to use claudekit-hooks commands instead of bash script paths
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2

**Technical Requirements**:
- Update `createProjectSettings` function in `cli/commands/setup.ts`
- Replace bash script paths with embedded hook commands
- Maintain existing hook ID to command mapping
- Preserve all matcher patterns and hook configurations

**Implementation Details**:
Change all hook command generation from:
```typescript
hooks: [{
  type: 'command',
  command: '.claude/hooks/typecheck.sh'
}]
```

To:
```typescript
hooks: [{
  type: 'command',
  command: 'claudekit-hooks run typecheck'
}]
```

**Hook ID Mapping Table**:
| Hook ID | Old Command | New Command |
|---------|-------------|-------------|
| typecheck | `.claude/hooks/typecheck.sh` | `claudekit-hooks run typecheck` |
| eslint | `.claude/hooks/eslint.sh` | `claudekit-hooks run eslint` |
| prettier | `.claude/hooks/prettier.sh` | `claudekit-hooks run prettier` |
| no-any | `.claude/hooks/no-any.sh` | `claudekit-hooks run no-any` |
| run-related-tests | `.claude/hooks/run-related-tests.sh` | `claudekit-hooks run run-related-tests` |
| auto-checkpoint | `.claude/hooks/auto-checkpoint.sh` | `claudekit-hooks run auto-checkpoint` |
| validate-todo-completion | `.claude/hooks/validate-todo-completion.sh` | `claudekit-hooks run validate-todo-completion` |
| project-validation | `.claude/hooks/project-validation.sh` | `claudekit-hooks run project-validation` |

**Example Generated Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run typecheck"
          },
          {
            "type": "command",
            "command": "claudekit-hooks run no-any"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run auto-checkpoint"
          }
        ]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] All hook commands use `claudekit-hooks run <hook-name>` format
- [ ] Existing matcher patterns are preserved
- [ ] Hook groupings remain the same
- [ ] Generated settings.json structure is unchanged except for command values
- [ ] Tests verify correct command generation

### Task 1.2: Remove Hook File Copying Logic from Setup Command
**Description**: Delete all code that copies hook files during setup installation
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1

**Technical Requirements**:
- Remove hook file operations from `performInstallation()` in `cli/commands/setup.ts`
- Delete hook directory creation logic
- Remove any references to `.claude/hooks/` directory

**Code to Remove**:
```typescript
// Delete this entire block from performInstallation()
if (component.type === 'hook') {
  // DELETE THIS ENTIRE BLOCK - hooks are handled by settings generation only
}
```

**Additional Removals**:
- Hook directory creation (e.g., `fs.ensureDir('.claude/hooks')`)
- Hook file copying operations
- Executable permission setting for hooks
- Any validation of hook file existence

**Acceptance Criteria**:
- [ ] No hook files are copied during setup
- [ ] No `.claude/hooks/` directory is created
- [ ] Setup completes successfully without hook file operations
- [ ] Integration tests verify no hook directories are created

### Task 1.3: Delete All Bash Hook Files
**Description**: Remove all bash script hook files from the repository
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2 (to ensure no code references them)
**Can run parallel with**: Task 1.4

**Files to Delete**:
From `src/hooks/` directory:
- `auto-checkpoint.sh`
- `eslint.sh`
- `project-validation.sh`
- `run-related-tests.sh`
- `typecheck.sh`
- `validate-todo-completion.sh`

**Additional Cleanup**:
From `.claude/` directory:
- Remove any symlinks in `.claude/hooks/`
- Delete the `.claude/hooks/` directory itself

**Git Commands**:
```bash
git rm src/hooks/*.sh
git rm -rf .claude/hooks
```

**Acceptance Criteria**:
- [ ] All `.sh` files removed from `src/hooks/`
- [ ] `.claude/hooks/` directory removed
- [ ] No broken references in codebase
- [ ] Git history shows clean removal

### Task 1.4: Remove Legacy setup.sh Script
**Description**: Delete the bash-based setup script entirely
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.3

**File to Delete**:
- `setup.sh` - entire file from project root

**Verification Steps**:
1. Ensure no other scripts or documentation reference `setup.sh`
2. Update any installation instructions that mention the script
3. Remove from package.json scripts if listed

**Git Command**:
```bash
git rm setup.sh
```

**Acceptance Criteria**:
- [ ] setup.sh file removed from repository
- [ ] No references to setup.sh remain in documentation
- [ ] Package.json doesn't reference the script
- [ ] README updated if it mentions setup.sh

### Task 1.5: Update Component Metadata for Hooks
**Description**: Modify hook component definitions to reflect embedded hooks system
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: None

**Technical Requirements**:
- Update hook component metadata in setup command
- Remove file path references
- Update descriptions to mention embedded hooks
- Ensure hook IDs remain consistent

**Implementation Areas**:
- Component discovery/registration
- Hook metadata definitions
- Component type handling

**Example Update**:
```typescript
// Before
{
  id: 'typecheck',
  name: 'TypeScript Type Checking',
  type: 'hook',
  path: '.claude/hooks/typecheck.sh',
  description: 'Run TypeScript type checking on file changes'
}

// After
{
  id: 'typecheck',
  name: 'TypeScript Type Checking',
  type: 'hook',
  command: 'claudekit-hooks run typecheck',
  description: 'Run TypeScript type checking on file changes (embedded hook)'
}
```

**Acceptance Criteria**:
- [ ] All hook components updated to embedded format
- [ ] No file path references remain
- [ ] Hook IDs unchanged for compatibility
- [ ] Component selection UI works correctly

### Task 1.6: Create Unit Tests for Embedded Hook Settings Generation
**Description**: Write comprehensive unit tests for the updated settings generation
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1
**Can run parallel with**: Task 1.7

**Test Requirements**:
```typescript
// Purpose: Verify embedded hook commands are generated instead of bash paths
// This ensures the migration from bash hooks to embedded hooks is complete
describe('createProjectSettings with embedded hooks', () => {
  it('should generate embedded hook commands in settings', () => {
    const components = [
      { id: 'typecheck', type: 'hook' },
      { id: 'eslint', type: 'hook' }
    ];
    
    const settings = createProjectSettings(components);
    
    // Verify typecheck hook
    const typecheckHook = settings.hooks.PostToolUse
      .find(h => h.matcher.includes('**/*.ts'))
      .hooks[0];
    expect(typecheckHook.command).toBe('claudekit-hooks run typecheck');
    
    // Verify no bash paths
    expect(JSON.stringify(settings)).not.toContain('.sh');
    expect(JSON.stringify(settings)).not.toContain('.claude/hooks/');
  });
  
  it('should handle all hook types correctly', () => {
    // Test each hook ID maps to correct command
  });
  
  it('should preserve matcher patterns', () => {
    // Verify matchers remain unchanged
  });
});
```

**Test Cases**:
- Generate settings with single hook
- Generate settings with multiple hooks
- Verify all hook IDs map correctly
- Ensure no bash script references
- Test hook grouping logic
- Verify matcher patterns preserved

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] 100% coverage of settings generation for hooks
- [ ] Tests document the embedded hook migration
- [ ] No references to bash hooks in tests

### Task 1.7: Create Integration Tests for Setup Flow
**Description**: Write integration tests verifying the complete setup flow with embedded hooks
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1, Task 1.2
**Can run parallel with**: Task 1.6

**Test Scenarios**:
```typescript
// Purpose: Verify complete setup flow uses embedded hooks without file operations
// This ensures no hook files are copied and settings use embedded commands
describe('Setup command with embedded hooks integration', () => {
  it('should complete setup without creating hook directories', async () => {
    // Run setup with hook selection
    await runSetup(['--hooks', 'typecheck,eslint']);
    
    // Verify no hook directory created
    expect(fs.existsSync('.claude/hooks')).toBe(false);
    
    // Verify settings contain embedded commands
    const settings = JSON.parse(fs.readFileSync('.claude/settings.json'));
    const hookCommands = extractHookCommands(settings);
    
    expect(hookCommands).toContain('claudekit-hooks run typecheck');
    expect(hookCommands).toContain('claudekit-hooks run eslint');
  });
  
  it('should handle all hook selection methods', async () => {
    // Test group selection
    // Test individual selection
    // Test --all flag
  });
});
```

**Test Coverage**:
- Full setup flow with hooks
- Verify no file operations
- Check generated settings
- Test various selection methods
- Verify no `.claude/hooks/` directory
- Ensure claudekit-hooks commands work

**Acceptance Criteria**:
- [ ] Integration tests pass
- [ ] No hook files or directories created
- [ ] Settings contain correct commands
- [ ] Setup completes successfully

## Phase 2: Cleanup and Documentation

### Task 2.1: Remove Hook File Discovery Logic
**Description**: Delete code that discovers hook files from the filesystem
**Size**: Medium
**Priority**: Medium
**Dependencies**: Task 1.3
**Can run parallel with**: Task 2.2

**Technical Requirements**:
- Remove hook discovery from `discoverComponents()` function
- Delete filesystem scanning for `.sh` files in hooks directory
- Update component discovery to use predefined hook list

**Code to Remove**:
```typescript
// Remove hook file discovery logic like:
const hookFiles = await fs.readdir('src/hooks');
const hooks = hookFiles
  .filter(file => file.endsWith('.sh'))
  .map(file => ({
    id: path.basename(file, '.sh'),
    type: 'hook',
    path: `src/hooks/${file}`
  }));
```

**Replacement Implementation**:
```typescript
// Predefined hook list
const AVAILABLE_HOOKS = [
  { id: 'typecheck', name: 'TypeScript Type Checking' },
  { id: 'eslint', name: 'ESLint Code Validation' },
  { id: 'prettier', name: 'Prettier Code Formatting' },
  { id: 'no-any', name: 'Forbid Any Types' },
  { id: 'run-related-tests', name: 'Run Related Tests' },
  { id: 'auto-checkpoint', name: 'Auto Checkpoint' },
  { id: 'validate-todo-completion', name: 'Validate Todo Completion' },
  { id: 'project-validation', name: 'Project Validation' }
];
```

**Acceptance Criteria**:
- [ ] No filesystem scanning for hooks
- [ ] Predefined hook list used instead
- [ ] All hooks still available in setup
- [ ] No broken references to discovery logic

### Task 2.2: Remove Legacy Hook-Related Utilities
**Description**: Delete any utility functions or modules specific to bash hooks
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 1 completion
**Can run parallel with**: Task 2.1

**Areas to Check**:
- Hook file validation utilities
- Hook path resolution functions
- Hook executable permission setters
- Bash hook specific helpers

**Example Removals**:
```typescript
// Remove functions like:
function getHookPath(hookId: string): string {
  return path.join('.claude/hooks', `${hookId}.sh`);
}

function setHookExecutable(hookPath: string): void {
  fs.chmodSync(hookPath, '755');
}

function validateHookFile(hookPath: string): boolean {
  return fs.existsSync(hookPath) && hookPath.endsWith('.sh');
}
```

**Acceptance Criteria**:
- [ ] All bash hook utilities removed
- [ ] No unused imports remain
- [ ] Code compiles without errors
- [ ] Tests updated to remove hook utility tests

### Task 2.3: Update README.md Hooks Section
**Description**: Rewrite the hooks section to document embedded hooks system
**Size**: Small
**Priority**: Medium
**Dependencies**: Phase 1 completion
**Can run parallel with**: Task 2.4, 2.5

**Documentation Updates**:
```markdown
## Hooks System

Claudekit includes a dedicated hooks system for Claude Code integration.

### Installation

When you install claudekit globally, you get two binaries:
- `claudekit` - Main CLI for commands and project management
- `claudekit-hooks` - Dedicated hooks execution system

### Available Hooks

- `typecheck` - TypeScript type checking
- `no-any` - Forbid any types in TypeScript
- `eslint` - ESLint code validation
- `auto-checkpoint` - Git auto-checkpoint on stop
- `run-related-tests` - Run tests for changed files
- `project-validation` - Full project validation
- `validate-todo-completion` - Validate todo completions

### Claude Code Integration

Update your `.claude/settings.json` to use claudekit hooks:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck"}
        ]
      }
    ]
  }
}
```
```

**Key Changes**:
- Remove references to hook file copying
- Remove `.claude/hooks/` directory mentions
- Update command examples to embedded format
- Add troubleshooting for missing claudekit-hooks

**Acceptance Criteria**:
- [ ] README reflects embedded hooks only
- [ ] All examples use new command format
- [ ] No bash hook references remain
- [ ] Installation instructions updated

### Task 2.4: Update Hook Documentation Files
**Description**: Update all hook-specific documentation to reflect embedded system
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 1 completion
**Can run parallel with**: Task 2.3, 2.5

**Files to Update**:
- `docs/hooks-documentation.md`
- `docs/hooks-reference.md`
- Any hook-specific guides

**Documentation Changes**:
- Change all command examples from `.claude/hooks/*.sh` to `claudekit-hooks run *`
- Remove sections about hook file permissions
- Remove hook file copying instructions
- Add troubleshooting for global binary issues
- Update configuration examples

**Example Update**:
```markdown
<!-- Before -->
Hook files are copied to `.claude/hooks/` in your project directory.
Make sure they have executable permissions: `chmod +x .claude/hooks/*.sh`

<!-- After -->
Hooks are provided by the `claudekit-hooks` executable, which must be globally installed.
No files are copied to your project - hooks run directly from the global installation.
```

**Acceptance Criteria**:
- [ ] All documentation uses embedded commands
- [ ] No references to hook files or copying
- [ ] Troubleshooting section for missing binary
- [ ] Configuration examples updated

### Task 2.5: Remove Bash Hook References from Codebase
**Description**: Find and remove all remaining references to bash hooks
**Size**: Medium
**Priority**: Medium
**Dependencies**: Phase 1 completion
**Can run parallel with**: Task 2.3, 2.4

**Search Patterns**:
```bash
# Find bash hook references
grep -r "\.sh" --include="*.ts" --include="*.js" --include="*.md"
grep -r "\.claude/hooks" --include="*.ts" --include="*.js" --include="*.md"
grep -r "bash.*hook" --include="*.ts" --include="*.js" --include="*.md"
```

**Common Locations**:
- Comments in code
- Error messages
- Test fixtures
- Example configurations
- Migration guides

**Replacement Examples**:
```typescript
// Before
throw new Error('Hook file not found: .claude/hooks/typecheck.sh');

// After
throw new Error('Hook not available: claudekit-hooks run typecheck');
```

**Acceptance Criteria**:
- [ ] No `.sh` references for hooks
- [ ] No `.claude/hooks` paths remain
- [ ] All error messages updated
- [ ] Comments reflect embedded system

### Task 2.6: Comprehensive Testing of Migration
**Description**: Run full test suite and manual testing to verify complete migration
**Size**: Large
**Priority**: High
**Dependencies**: Tasks 2.1-2.5
**Can run parallel with**: None

**Test Plan**:
1. **Unit Test Suite**
   ```bash
   npm test -- --grep "hook"
   ```

2. **Integration Test Suite**
   ```bash
   npm test -- --grep "setup"
   ```

3. **Manual Testing Checklist**:
   - [ ] Fresh claudekit installation
   - [ ] Run `claudekit setup` with various options
   - [ ] Select different hook combinations
   - [ ] Verify generated settings.json
   - [ ] Test hooks in Claude Code
   - [ ] Verify no `.claude/hooks/` directory

4. **Regression Testing**:
   - [ ] Existing projects still work
   - [ ] All hook functionality preserved
   - [ ] No breaking changes in API

**Acceptance Criteria**:
- [ ] All automated tests pass
- [ ] Manual testing checklist complete
- [ ] No regressions identified
- [ ] Performance benchmarks acceptable

## Phase 3: Final Polish

### Task 3.1: Verify No Legacy Code Remains
**Description**: Final audit to ensure complete removal of bash hook system
**Size**: Small
**Priority**: Low
**Dependencies**: Phase 2 completion
**Can run parallel with**: None

**Verification Checklist**:
```bash
# Verify no bash hooks remain
find . -name "*.sh" -path "*/hooks/*" | wc -l  # Should be 0

# Verify no hook file references
grep -r "\.claude/hooks" --include="*.ts" --include="*.js" | wc -l  # Should be 0

# Verify no bash hook utilities
grep -r "setExecutablePermission.*hook" --include="*.ts" | wc -l  # Should be 0

# Check for setup.sh references
grep -r "setup\.sh" --exclude-dir=".git" | wc -l  # Should be 0
```

**Code Review Areas**:
- Setup command implementation
- Component discovery
- Settings generation
- Test files
- Documentation

**Acceptance Criteria**:
- [ ] All verification commands return 0
- [ ] Code review finds no legacy code
- [ ] No TODO comments about migration
- [ ] Clean git history

### Task 3.2: Performance Benchmarking
**Description**: Measure performance improvements from embedded hooks
**Size**: Medium
**Priority**: Low
**Dependencies**: Phase 2 completion
**Can run parallel with**: Task 3.3

**Benchmark Tests**:
```typescript
// Benchmark setup time
describe('Setup Performance', () => {
  it('should complete setup faster without file operations', async () => {
    const startTime = Date.now();
    await runSetup(['--hooks', 'all']);
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should be under 1 second
  });
});

// Benchmark hook execution
describe('Hook Execution Performance', () => {
  it('should execute embedded hooks faster than bash scripts', async () => {
    // Measure claudekit-hooks execution time
    const startTime = Date.now();
    await exec('claudekit-hooks run typecheck');
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100); // Should be under 100ms
  });
});
```

**Metrics to Capture**:
- Setup time with hooks
- Individual hook execution time
- Memory usage
- Startup overhead

**Acceptance Criteria**:
- [ ] Benchmarks show improvement
- [ ] No performance regressions
- [ ] Results documented
- [ ] Metrics added to documentation

### Task 3.3: Update Examples to Use Embedded Hooks
**Description**: Update all example configurations and scripts to use embedded hooks
**Size**: Small
**Priority**: Low
**Dependencies**: Phase 2 completion
**Can run parallel with**: Task 3.2

**Files to Update**:
- Example settings.json files
- Tutorial documentation
- Quick start guides
- Blog posts or articles

**Example Update**:
```json
// examples/settings.complete.json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck"},
          {"type": "command", "command": "claudekit-hooks run no-any"}
        ]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] All examples use embedded format
- [ ] Examples are tested and working
- [ ] No bash hook examples remain
- [ ] Documentation links updated

## Summary

**Total Tasks**: 17
**Phase 1 (MVP)**: 7 tasks
**Phase 2 (Cleanup)**: 6 tasks  
**Phase 3 (Polish)**: 3 tasks

**Estimated Complexity**:
- Small: 6 tasks
- Medium: 10 tasks
- Large: 1 task

**Parallel Execution Opportunities**:
- Phase 1: Tasks 1.1 & 1.2 can run in parallel, Tasks 1.3 & 1.4 can run in parallel
- Phase 2: Tasks 2.1 & 2.2 in parallel, Tasks 2.3, 2.4, 2.5 in parallel
- Phase 3: Tasks 3.2 & 3.3 can run in parallel

**Critical Path**:
Task 1.1 → Task 1.5 → Task 1.6/1.7 → Task 2.6 → Task 3.1