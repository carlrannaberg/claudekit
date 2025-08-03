# Task Breakdown: Refactor Hook Naming Convention and Split Project Validation

Generated: 2025-08-01
Source: specs/refactor-hook-naming-and-split-validation.md

## Overview

Refactor claudekit's hook naming convention to provide clearer, descriptive names that communicate scope (changed files vs. project-wide). Split the monolithic project-validation hook into three focused, single-purpose hooks for better configurability.

## Phase 1: Core Implementation

### Task 1.1: Create typecheck-project hook
**Description**: Implement new project-wide TypeScript validation hook
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.2, 1.3

**Technical Requirements**:
- Extends BaseHook class
- Checks for TypeScript availability using checkToolAvailable
- Runs tsc --noEmit on entire project
- Supports custom typescriptCommand from config
- Formats errors using formatTypeScriptErrors helper

**Implementation**:
```typescript
export class TypecheckProjectHook extends BaseHook {
  name = 'typecheck-project';

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;
    
    if (!await checkToolAvailable('tsc', 'tsconfig.json', projectRoot)) {
      return { exitCode: 0 }; // Skip if TypeScript not available
    }

    this.progress('Running project-wide TypeScript validation...');
    
    const tsCommand = (this.config['typescriptCommand'] as string) 
      || `${packageManager.exec} tsc --noEmit`;
    
    const result = await this.execCommand(tsCommand, [], { cwd: projectRoot });
    
    if (result.exitCode === 0) {
      this.success('TypeScript validation passed!');
      return { exitCode: 0 };
    }
    
    // Format error output similar to current project-validation
    const errorOutput = formatTypeScriptErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }
}
```

**Acceptance Criteria**:
- [ ] Hook extends BaseHook class properly
- [ ] Checks for tsconfig.json before running
- [ ] Uses packageManager.exec for command execution
- [ ] Respects custom typescriptCommand from config
- [ ] Returns exitCode 0 on success, 2 on validation errors
- [ ] Shows progress message during execution
- [ ] Formats TypeScript errors clearly

### Task 1.2: Create lint-project hook
**Description**: Implement new project-wide ESLint validation hook
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.3

**Technical Requirements**:
- Extends BaseHook class
- Checks for ESLint availability using checkToolAvailable
- Runs ESLint on entire project with common extensions
- Supports custom eslintCommand from config
- Formats errors using formatESLintErrors helper

**Implementation**:
```typescript
export class LintProjectHook extends BaseHook {
  name = 'lint-project';

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;
    
    if (!await checkToolAvailable('eslint', '.eslintrc.json', projectRoot)) {
      return { exitCode: 0 }; // Skip if ESLint not available
    }

    this.progress('Running project-wide ESLint validation...');
    
    const eslintCommand = (this.config['eslintCommand'] as string)
      || `${packageManager.exec} eslint . --ext .js,.jsx,.ts,.tsx`;
    
    const result = await this.execCommand(eslintCommand, [], { cwd: projectRoot });
    
    if (result.exitCode === 0 && !result.stdout.includes('error')) {
      this.success('ESLint validation passed!');
      return { exitCode: 0 };
    }
    
    // Format error output
    const errorOutput = formatESLintErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }
}
```

**Acceptance Criteria**:
- [ ] Hook extends BaseHook class properly
- [ ] Checks for .eslintrc.json before running
- [ ] Uses packageManager.exec for command execution
- [ ] Respects custom eslintCommand from config
- [ ] Returns exitCode 0 on success, 2 on lint errors
- [ ] Checks both exitCode and stdout for errors
- [ ] Formats ESLint errors clearly

### Task 1.3: Create test-project hook
**Description**: Implement new project-wide test suite runner hook
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.2

**Technical Requirements**:
- Extends BaseHook class
- Checks if test script exists in package.json
- Runs full test suite using package manager
- Supports custom testCommand from config
- Formats errors using formatTestErrors helper

**Implementation**:
```typescript
export class TestProjectHook extends BaseHook {
  name = 'test-project';

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;
    
    // Check if test script exists
    const { stdout: pkgJson } = await this.execCommand('cat', ['package.json'], {
      cwd: projectRoot,
    });
    
    if (!pkgJson.includes('"test"')) {
      return { exitCode: 0 }; // Skip if no test script
    }

    this.progress('Running project test suite...');
    
    const testCommand = (this.config['testCommand'] as string) 
      || packageManager.test;
    
    const result = await this.execCommand(testCommand, [], { cwd: projectRoot });
    
    if (result.exitCode === 0) {
      this.success('All tests passed!');
      return { exitCode: 0 };
    }
    
    // Format test failure output
    const errorOutput = formatTestErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }
}
```

**Acceptance Criteria**:
- [ ] Hook extends BaseHook class properly
- [ ] Checks for test script in package.json
- [ ] Uses packageManager.test for command execution
- [ ] Respects custom testCommand from config
- [ ] Returns exitCode 0 on success, 2 on test failures
- [ ] Shows appropriate progress messages
- [ ] Formats test failures clearly

### Task 1.4: Rename existing hook files
**Description**: Rename all existing hook implementation files to match new naming convention
**Size**: Small
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 1.1, 1.2, 1.3

**File Renames**:
```bash
cli/hooks/eslint.ts → cli/hooks/lint-changed.ts
cli/hooks/no-any.ts → cli/hooks/check-any-changed.ts
cli/hooks/typecheck.ts → cli/hooks/typecheck-changed.ts
cli/hooks/run-related-tests.ts → cli/hooks/test-changed.ts
cli/hooks/auto-checkpoint.ts → cli/hooks/create-checkpoint.ts
cli/hooks/validate-todo.ts → cli/hooks/check-todos.ts
```

**Class Renames**:
- `EslintHook` → `LintChangedHook`
- `NoAnyHook` → `CheckAnyChangedHook`
- `TypecheckHook` → `TypecheckChangedHook`
- `RunRelatedTestsHook` → `TestChangedHook`
- `AutoCheckpointHook` → `CreateCheckpointHook`
- `ValidateTodoCompletionHook` → `CheckTodosHook`

**Acceptance Criteria**:
- [ ] All files renamed correctly
- [ ] All class names updated to match new file names
- [ ] Import statements updated throughout codebase
- [ ] No references to old file names remain
- [ ] Build still passes after renaming

### Task 1.5: Update hook registry
**Description**: Update the hook registry to use new names without any backward compatibility
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1, 1.2, 1.3, 1.4
**Can run parallel with**: None

**Implementation**:
```typescript
export const HOOK_REGISTRY = {
  // Changed file hooks
  'typecheck-changed': TypecheckChangedHook,
  'check-any-changed': CheckAnyChangedHook,
  'lint-changed': LintChangedHook,
  'test-changed': TestChangedHook,
  
  // Project-wide hooks
  'typecheck-project': TypecheckProjectHook,
  'lint-project': LintProjectHook,
  'test-project': TestProjectHook,
  
  // Action hooks
  'create-checkpoint': CreateCheckpointHook,
  'check-todos': CheckTodosHook,
};
```

**Acceptance Criteria**:
- [ ] Registry contains only new hook names
- [ ] No legacy names or aliases present
- [ ] All hooks properly imported
- [ ] Registry exports correctly
- [ ] TypeScript compilation succeeds

### Task 1.6: Remove project-validation hook
**Description**: Delete the monolithic project-validation hook implementation
**Size**: Small
**Priority**: High
**Dependencies**: Task 1.1, 1.2, 1.3
**Can run parallel with**: Task 1.4

**Actions**:
- Delete `cli/hooks/project-validation.ts`
- Remove all imports of ProjectValidationHook
- Remove from hook registry
- Update any references in tests

**Acceptance Criteria**:
- [ ] project-validation.ts file deleted
- [ ] No imports of ProjectValidationHook remain
- [ ] Hook not present in registry
- [ ] No test failures due to missing hook
- [ ] Build passes after removal

## Phase 2: Documentation and UI

### Task 2.1: Update setup wizard UI
**Description**: Update the interactive setup wizard to show new hook names with clear descriptions
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.5
**Can run parallel with**: Task 2.2, 2.3, 2.4

**UI Updates**:
```
Select validation hooks by when they run and what they do:

On File Changes:
  □ typecheck-changed   - TypeScript checking on modified files
  □ lint-changed       - ESLint validation on modified files  
  □ check-any-changed  - Check for 'any' types in modified TypeScript files
  □ test-changed       - Run tests for modified files

On Stop/Save Session:
  □ create-checkpoint  - Create git checkpoint of changes
  □ check-todos       - Ensure all todos are completed
  
Project-Wide Validations:
  □ typecheck-project  - Full project TypeScript validation
  □ lint-project      - Full project ESLint validation
  □ test-project      - Run entire test suite
```

**Acceptance Criteria**:
- [ ] Hook selection shows new names
- [ ] Descriptions clearly indicate scope
- [ ] Hooks grouped by execution trigger
- [ ] Selection UI remains interactive
- [ ] Generated settings.json uses new names

### Task 2.2: Update README and documentation
**Description**: Update all documentation files to use new hook names
**Size**: Medium
**Priority**: High
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.3, 2.4

**Files to Update**:
- README.md
- docs/hooks-documentation.md
- docs/configuration.md
- AGENT.md hook configuration section
- Any example configurations

**Changes**:
- Replace all old hook names with new ones
- Update configuration examples
- Update hook descriptions
- Add note about hook naming convention

**Acceptance Criteria**:
- [ ] All documentation uses new hook names
- [ ] Configuration examples are correct
- [ ] Hook naming convention documented
- [ ] No references to old names remain
- [ ] Examples work when copy-pasted

### Task 2.3: Create comprehensive hook reference
**Description**: Create a complete hook reference guide with all hooks documented
**Size**: Large
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2, 2.4

**Content Structure**:
```markdown
# Hook Reference Guide

## Hook Naming Convention
- `-changed` suffix: Operates on modified files only
- `-project` suffix: Operates on entire project
- Action verbs: Non-validation actions (create, check)

## Changed File Hooks

### typecheck-changed
- **Purpose**: Run TypeScript type checking on modified files
- **Trigger**: PostToolUse event when .ts/.tsx files change
- **Config**: `typescriptCommand` to customize tsc invocation
...

## Project-Wide Hooks

### typecheck-project
- **Purpose**: Run TypeScript validation on entire project
- **Trigger**: Stop event or manual execution
- **Config**: `typescriptCommand` to customize tsc invocation
...

## Action Hooks

### create-checkpoint
- **Purpose**: Create git checkpoint of current changes
- **Trigger**: Stop event
- **Config**: `prefix` for checkpoint naming
...
```

**Acceptance Criteria**:
- [ ] All hooks documented with purpose, trigger, and config
- [ ] Naming convention clearly explained
- [ ] Examples provided for each hook
- [ ] Configuration options documented
- [ ] Performance implications noted

### Task 2.4: Update example configurations
**Description**: Update all example settings.json files to use new hook names
**Size**: Small
**Priority**: Medium
**Dependencies**: None
**Can run parallel with**: Task 2.1, 2.2, 2.3

**Example Configuration**:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run check-any-changed"}
        ]
      },
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run lint-changed"}
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run create-checkpoint"},
          {"type": "command", "command": "claudekit-hooks run check-todos"},
          {"type": "command", "command": "claudekit-hooks run typecheck-project"},
          {"type": "command", "command": "claudekit-hooks run lint-project"},
          {"type": "command", "command": "claudekit-hooks run test-project"}
        ]
      }
    ]
  }
}
```

**Acceptance Criteria**:
- [ ] All example files use new hook names
- [ ] Examples cover common use cases
- [ ] Matcher patterns are correct
- [ ] JSON is valid and properly formatted
- [ ] Comments explain hook purposes

## Phase 3: Testing and Polish

### Task 3.1: Write unit tests for new project hooks
**Description**: Create comprehensive unit tests for the three new project-wide hooks
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.1, 1.2, 1.3
**Can run parallel with**: Task 3.2, 3.3

**Test Coverage**:
```typescript
describe('TypecheckProjectHook', () => {
  it('should skip when TypeScript not available', async () => {
    mockCheckToolAvailable.mockResolvedValue(false);
    const result = await hook.execute(context);
    expect(result.exitCode).toBe(0);
    expect(mockExecCommand).not.toHaveBeenCalled();
  });

  it('should run tsc --noEmit on project', async () => {
    mockCheckToolAvailable.mockResolvedValue(true);
    mockExecCommand.mockResolvedValue({ exitCode: 0 });
    await hook.execute(context);
    expect(mockExecCommand).toHaveBeenCalledWith(
      'npm exec tsc --noEmit',
      [],
      { cwd: '/project' }
    );
  });

  it('should respect custom typescriptCommand', async () => {
    hook.config = { typescriptCommand: 'custom-tsc' };
    await hook.execute(context);
    expect(mockExecCommand).toHaveBeenCalledWith('custom-tsc');
  });
});
```

**Acceptance Criteria**:
- [ ] Tests for all three new hooks
- [ ] Tool availability checks tested
- [ ] Custom command configuration tested
- [ ] Success and failure paths tested
- [ ] Error formatting tested
- [ ] All tests pass

### Task 3.2: Update integration tests
**Description**: Update integration tests to use new hook names and test hook combinations
**Size**: Medium
**Priority**: High
**Dependencies**: Task 1.5
**Can run parallel with**: Task 3.1, 3.3

**Test Scenarios**:
- Complete setup flow with new hook names
- Fresh installation creates correct settings
- Split hooks can be configured independently
- Hook combinations work correctly
- Error messages are clear

**Acceptance Criteria**:
- [ ] Setup flow tests updated
- [ ] Settings generation tests updated
- [ ] Hook execution tests use new names
- [ ] Parallel execution tests pass
- [ ] No references to old names in tests

### Task 3.3: Manual testing checklist
**Description**: Perform comprehensive manual testing of all hooks
**Size**: Medium
**Priority**: High
**Dependencies**: All Phase 1 and 2 tasks
**Can run parallel with**: Task 3.1, 3.2

**Testing Steps**:
1. Run `claudekit setup` and verify new hook descriptions
2. Test each new hook functions correctly:
   - `claudekit-hooks run typecheck-changed` on TS file
   - `claudekit-hooks run lint-changed` on JS file
   - `claudekit-hooks run check-any-changed` on TS file with 'any'
   - `claudekit-hooks run test-changed` on test file
   - `claudekit-hooks run create-checkpoint` with changes
   - `claudekit-hooks run check-todos` with incomplete todos
   - `claudekit-hooks run typecheck-project` on full project
   - `claudekit-hooks run lint-project` on full project
   - `claudekit-hooks run test-project` to run all tests
3. Test fresh installation creates proper configuration
4. Test granular configuration of project validations
5. Ensure error messages are clear and actionable
6. Verify all hook combinations work as expected

**Acceptance Criteria**:
- [ ] All hooks execute without errors
- [ ] Error messages are clear
- [ ] Configuration works as expected
- [ ] No references to old hook names
- [ ] Performance is acceptable

### Task 3.4: Performance validation
**Description**: Validate that hook renaming and splitting has no negative performance impact
**Size**: Small
**Priority**: Medium
**Dependencies**: All implementation tasks
**Can run parallel with**: None

**Benchmarks**:
- Time individual hook execution
- Compare split hooks vs old monolithic approach
- Measure startup overhead
- Test with large projects

**Acceptance Criteria**:
- [ ] No performance regression
- [ ] Split hooks allow skipping expensive operations
- [ ] Startup time remains fast
- [ ] Large project performance acceptable
- [ ] Results documented

### Task 3.5: Bug fixes from testing
**Description**: Fix any bugs discovered during testing phases
**Size**: Variable
**Priority**: High
**Dependencies**: Task 3.1, 3.2, 3.3
**Can run parallel with**: None

**Common Issues to Check**:
- Import path errors after renaming
- Registry lookup failures
- Config property mismatches
- Error formatting issues
- Tool detection problems

**Acceptance Criteria**:
- [ ] All discovered bugs fixed
- [ ] Tests added for bug scenarios
- [ ] No regression in functionality
- [ ] Error handling improved
- [ ] Code quality maintained

## Summary

Total Tasks: 15
- Phase 1 (Core): 6 tasks
- Phase 2 (Documentation): 4 tasks  
- Phase 3 (Testing): 5 tasks

Critical Path:
1. Tasks 1.1-1.3 (new hooks) can run in parallel
2. Task 1.4 (renaming) can run in parallel
3. Task 1.5 (registry) depends on 1.1-1.4
4. Phase 2 can mostly run in parallel
5. Phase 3 testing depends on Phase 1-2 completion

Estimated Timeline: 4 days as specified in phases