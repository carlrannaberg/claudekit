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
- Maintain backward compatibility through migration support
- Improve user understanding of hook behavior through descriptive names
- Enable granular configuration of validation steps
- Preserve all existing functionality while improving organization

## Non-Goals

- Changing hook functionality or behavior (only renaming and reorganizing)
- Modifying the hook execution architecture or base classes
- Altering the settings.json structure or matcher patterns
- Breaking existing configurations without migration path
- Adding new validation types or tools

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
| `-related` | Finds and operates on related files | `test-related` |
| Action verbs | Non-validation actions | `create-checkpoint` |

### 2. Hook Renaming Map

| Current Name | New Name | Scope | Purpose |
|--------------|----------|-------|---------|
| `eslint` | `lint-changed` | Modified files | Runs ESLint on created/modified files |
| `no-any` | `check-any-changed` | Modified files | Checks for 'any' in created/modified TypeScript files |
| `typecheck` | `typecheck-changed` | Modified files | Runs TypeScript checking on created/modified files |
| `run-related-tests` | `test-related` | Related files | Runs tests related to created/modified files |
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
  'test-related': TestRelatedHook,
  
  // Project-wide hooks
  'typecheck-project': TypecheckProjectHook,
  'lint-project': LintProjectHook,
  'test-project': TestProjectHook,
  
  // Action hooks
  'create-checkpoint': CreateCheckpointHook,
  'check-todos': CheckTodosHook,
  
  // Legacy names for backward compatibility
  'typecheck': TypecheckChangedHook,
  'no-any': CheckAnyChangedHook,
  'eslint': LintChangedHook,
  'run-related-tests': TestRelatedHook,
  'auto-checkpoint': CreateCheckpointHook,
  'validate-todo-completion': CheckTodosHook,
  'project-validation': ProjectValidationHook, // Deprecated, will warn
};
```

#### 3.3 Migration Support

1. **Backward Compatibility**: Keep old names in registry pointing to new implementations
2. **Deprecation Warnings**: Log warnings when old names are used
3. **Migration Command**: Add `claudekit migrate-hooks` command to update settings.json
4. **Grace Period**: Support old names for 3 months with deprecation notices

### 4. File Renaming

Rename hook implementation files to match new names:
```bash
cli/hooks/eslint.ts → cli/hooks/lint-changed.ts
cli/hooks/no-any.ts → cli/hooks/check-any-changed.ts
cli/hooks/typecheck.ts → cli/hooks/typecheck-changed.ts
cli/hooks/run-related-tests.ts → cli/hooks/test-related.ts
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
  □ test-related       - Run tests related to modified files

On Stop/Save Session:
  □ create-checkpoint  - Create git checkpoint of changes
  □ check-todos       - Ensure all todos are completed
  
Project-Wide Validations:
  □ typecheck-project  - Full project TypeScript validation
  □ lint-project      - Full project ESLint validation
  □ test-project      - Run entire test suite
```

### Migration Experience

Users with existing configurations will see:
```
████ Hook Name Migration Available ████

claudekit has updated hook names for clarity. Your hooks still work but 
we recommend updating to the new names.

Run: claudekit migrate-hooks

This will update your .claude/settings.json to use the new hook names.
Your hooks will continue to function identically.

Old → New name mappings:
  eslint → lint-changed
  typecheck → typecheck-changed
  no-any → check-any-changed
  ...
```

## Testing Strategy

### Unit Tests

**Hook Renaming Tests**
```typescript
// Purpose: Verify renamed hooks maintain identical functionality
// This ensures the renaming doesn't break existing behavior
describe('Hook renaming compatibility', () => {
  it('should execute same logic for old and new hook names', async () => {
    const oldResult = await runHook('eslint', payload);
    const newResult = await runHook('lint-changed', payload);
    expect(oldResult).toEqual(newResult);
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
- Verify migration command updates settings correctly
- Test backward compatibility with old names
- Ensure split hooks can be configured independently
- Verify error formatting matches current behavior

### Manual Testing Checklist

1. Run setup wizard and verify new hook descriptions
2. Test each renamed hook functions identically
3. Run migration command on existing project
4. Verify deprecation warnings appear for old names
5. Test granular configuration of project validations
6. Ensure error messages are clear and actionable

## Performance Considerations

- **No Performance Impact**: Renaming doesn't affect execution
- **Improved Granularity**: Users can disable expensive validations
- **Reduced Overhead**: Split hooks avoid unnecessary checks
- **Selective Execution**: Better control over what runs when

## Security Considerations

- **No New Attack Surface**: Only renaming and reorganizing
- **Command Injection**: Names are hardcoded, no user input
- **Backward Compatibility**: Old names don't bypass validation
- **Configuration Safety**: Migration preserves existing security

## Documentation

### Updates Required

1. **README.md**: Update all hook references to new names
2. **Hook Reference**: Create comprehensive hook documentation
3. **Configuration Guide**: Update examples with new names
4. **Migration Guide**: Document upgrade process
5. **API Documentation**: Update hook name references

### New Documentation

1. **Hook Naming Convention**: Document the `-changed`, `-project`, `-related` pattern
2. **Hook Scope Guide**: Explain when to use each type
3. **Performance Guide**: Document impact of project-wide hooks

## Implementation Phases

### Phase 1: Core Implementation (2 days)

1. Create three new project-wide hook implementations
2. Rename existing hook files and classes
3. Update hook registry with new names and aliases
4. Implement deprecation warnings
5. Update component metadata

### Phase 2: Migration Support (1 day)

1. Implement `claudekit migrate-hooks` command
2. Add backward compatibility aliases
3. Create migration documentation
4. Update setup wizard UI

### Phase 3: Testing and Polish (1 day)

1. Comprehensive unit and integration tests
2. Update all documentation
3. Test migration scenarios
4. Performance validation

## Open Questions

1. Should we keep the old `project-validation` hook as a meta-hook that runs all three?
2. How long should we maintain backward compatibility (suggested: 3 months)?
3. Should migration be automatic or require user confirmation?
4. Should we add a `--force-old-names` flag for compatibility?

## References

- [Embedded Hooks System](feat-embedded-hooks-system.md)
- [Migration to Embedded Hooks](feat-migrate-to-embedded-hooks.md)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [Setup Command Modernization](feat-modernize-setup-installer.md)