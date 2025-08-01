# Refactor Hook Naming Convention and Split Project Validation

**Status**: Draft  
**Authors**: Claude Code Assistant  
**Date**: 2025-08-01  

## Overview

Refactor the hook naming convention across claudekit to provide clearer, more descriptive names that immediately communicate their scope (changed files vs. project-wide). Additionally, split the monolithic `project-validation` hook into three focused, single-purpose hooks for better configurability and adherence to single responsibility principle.

## Background/Problem Statement

The current hook naming system has several clarity issues:

1. **Ambiguous Scope**: Names like `eslint`, `typecheck`, and `no-any` don't indicate whether they run on modified files or the entire project
2. **Inconsistent Naming**: Mix of simple names (`eslint`), kebab-case compounds (`auto-checkpoint`), and descriptive names (`validate-todo-completion`)
3. **Monolithic Validation**: The `project-validation` hook combines TypeScript checking, ESLint, and test running into a single hook, violating single responsibility principle
4. **Configuration Limitations**: Users cannot selectively enable/disable specific project-wide validations

This lack of clarity leads to:
- User confusion about hook behavior and performance implications
- Difficulty in configuring appropriate hooks for different workflows
- Inability to run specific validations independently
- Unclear error messages when project validation fails

## Goals

- Establish a clear, consistent naming convention that indicates hook scope
- Split `project-validation` into three focused, single-purpose hooks
- Improve user understanding of hook behavior through descriptive names
- Enable granular configuration of validation steps
- Create a clean, maintainable hook system without legacy baggage

## Non-Goals

- Changing hook functionality or behavior (only renaming and reorganizing)
- Modifying the hook execution architecture or base classes
- Altering the settings.json structure or matcher patterns
- Adding new validation types or tools
- Maintaining backward compatibility with old hook names

## Technical Dependencies

- **TypeScript**: Existing build system and type checking
- **Node.js**: Runtime environment (existing requirement)
- **Commander.js**: CLI framework (existing dependency)
- No new external dependencies required

## Detailed Design

### 1. New Naming Convention

**Principle**: Use descriptive suffixes that clearly indicate scope

| Suffix | Meaning | Example |
|--------|---------|---------|
| `-changed` | Operates on created/modified files only | `lint-changed` |
| `-project` | Operates on entire project | `lint-project` |
| Action verbs | Non-validation actions | `create-checkpoint` |

### 2. Hook Renaming Map

| Current Name | New Name | Scope | Purpose |
|--------------|----------|-------|---------|
| `eslint` | `lint-changed` | Modified files | Runs ESLint on created/modified files |
| `no-any` | `check-any-changed` | Modified files | Checks for 'any' in created/modified TypeScript files |
| `typecheck` | `typecheck-changed` | Modified files | Runs TypeScript checking on created/modified files |
| `run-related-tests` | `test-changed` | Modified files | Runs tests for created/modified files |
| `auto-checkpoint` | `create-checkpoint` | N/A | Creates git checkpoint |
| `validate-todo-completion` | `check-todos` | N/A | Validates todo completion |
| `project-validation` | Split into 3 hooks: | | |
| | `typecheck-project` | Entire project | Project-wide TypeScript validation |
| | `lint-project` | Entire project | Project-wide ESLint validation |
| | `test-project` | Entire project | Run full test suite |

### 3. Implementation Details

#### 3.1 New Project-Wide Hooks

**typecheck-project.ts**
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

**lint-project.ts**
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

**test-project.ts**
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

#### 3.2 Registry Updates

Update `/cli/hooks/registry.ts`:
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

#### 3.3 Clean Implementation

1. **No Legacy Support**: Old hook names are completely removed
2. **Fresh Start**: New installations get only the new hook names
3. **Clear Documentation**: All docs use only the new naming convention
4. **No Migration Needed**: Users reinstall to get the new system

### 4. File Renaming

Rename hook implementation files to match new names:
```bash
cli/hooks/eslint.ts → cli/hooks/lint-changed.ts
cli/hooks/no-any.ts → cli/hooks/check-any-changed.ts
cli/hooks/typecheck.ts → cli/hooks/typecheck-changed.ts
cli/hooks/run-related-tests.ts → cli/hooks/test-changed.ts
cli/hooks/auto-checkpoint.ts → cli/hooks/create-checkpoint.ts
cli/hooks/validate-todo.ts → cli/hooks/check-todos.ts
# New files:
cli/hooks/typecheck-project.ts
cli/hooks/lint-project.ts
cli/hooks/test-project.ts
```

### 5. Configuration Examples

Updated settings.json patterns:
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run check-any-changed"}
        ]
      },
      {
        "matcher": "tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}",
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

## User Experience

### Setup Wizard Updates

Update hook selection UI to show new names with clear descriptions:
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

### Installation Experience

New installations will show clear, descriptive hook names:
```
Select validation hooks:

On File Changes:
  □ typecheck-changed   - TypeScript checking on modified files
  □ lint-changed       - ESLint validation on modified files  
  □ check-any-changed  - Check for 'any' types in modified TypeScript files
  □ test-changed       - Run tests for modified files

On Stop/Save:
  □ create-checkpoint  - Create git checkpoint of changes
  □ check-todos       - Ensure all todos are completed
  □ typecheck-project  - Full project TypeScript validation
  □ lint-project      - Full project ESLint validation
  □ test-project      - Run entire test suite
```

## Testing Strategy

### Unit Tests

**New Hook Tests**
```typescript
// Purpose: Verify new hooks work correctly with clear names
// This ensures the new naming provides expected functionality
describe('New hook functionality', () => {
  it('should run lint-changed only on modified files', async () => {
    const result = await runHook('lint-changed', payload);
    expect(mockExecCommand).toHaveBeenCalledWith(
      expect.stringContaining('eslint'),
      expect.arrayContaining(modifiedFiles)
    );
  });
});
```

**Split Validation Tests**
```typescript
// Purpose: Verify each split hook runs independently
// This ensures project validation can be configured granularly
describe('Split project validation hooks', () => {
  it('should run only TypeScript checking with typecheck-project', async () => {
    const result = await runHook('typecheck-project', {});
    expect(mockExecCommand).toHaveBeenCalledWith(expect.stringContaining('tsc'));
    expect(mockExecCommand).not.toHaveBeenCalledWith(expect.stringContaining('eslint'));
  });
});
```

### Integration Tests

- Test complete setup flow with new hook names
- Verify fresh installation creates correct settings
- Ensure split hooks can be configured independently
- Verify error formatting is clear and actionable
- Test all hook combinations work correctly

### Manual Testing Checklist

1. Run setup wizard and verify new hook descriptions
2. Test each new hook functions correctly
3. Test fresh installation creates proper configuration
4. Test granular configuration of project validations
5. Ensure error messages are clear and actionable
6. Verify all hook combinations work as expected

## Performance Considerations

- **No Performance Impact**: Renaming doesn't affect execution
- **Improved Granularity**: Users can disable expensive validations
- **Reduced Overhead**: Split hooks avoid unnecessary checks
- **Selective Execution**: Better control over what runs when

## Security Considerations

- **No New Attack Surface**: Clean implementation without legacy code
- **Command Injection**: Names are hardcoded, no user input
- **Clear Boundaries**: Each hook has single responsibility
- **Configuration Safety**: Simple, predictable hook behavior

## Documentation

### Updates Required

1. **README.md**: Update all hook references to new names
2. **Hook Reference**: Create comprehensive hook documentation
3. **Configuration Guide**: Update examples with new names
4. **Migration Guide**: Document upgrade process
5. **API Documentation**: Update hook name references

### Documentation Structure

1. **Hook Naming Convention**: Document the `-changed` and `-project` suffixes
2. **Hook Scope Guide**: Explain when to use each type
3. **Performance Guide**: Document impact of project-wide hooks
4. **Hook Reference**: Complete list with descriptions and examples

## Implementation Phases

### Phase 1: Core Implementation (2 days)

1. Create three new project-wide hook implementations
2. Rename existing hook files and classes
3. Update hook registry with new names and aliases
4. Implement deprecation warnings
5. Update component metadata

### Phase 2: Documentation and UI (1 day)

1. Update all documentation to use new names
2. Update setup wizard UI with clear descriptions
3. Create comprehensive hook reference guide
4. Update example configurations

### Phase 3: Testing and Polish (1 day)

1. Comprehensive unit and integration tests
2. Update all documentation
3. Test migration scenarios
4. Performance validation

## Decisions Made

1. **No meta-hook**: Each validation runs independently for maximum flexibility
2. **No backward compatibility**: Clean implementation without legacy support
3. **No compatibility flags**: Single, clear implementation path
4. **No migration detection**: Fresh installations only

## References

- [Embedded Hooks System](feat-embedded-hooks-system.md)
- [Embedded Hooks Implementation](feat-embedded-hooks-system.md)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Setup Command Modernization](feat-modernize-setup-installer.md)