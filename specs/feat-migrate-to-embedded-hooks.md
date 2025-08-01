# Migrate claudekit Setup to Embedded Hooks System

**Status**: Draft  
**Authors**: Claude Code Assistant  
**Date**: 2025-07-31  

## Overview

Update the claudekit setup command to use the new TypeScript-based embedded hooks system (`claudekit-hooks` executable) instead of copying individual bash hook files. This migration will eliminate the need for bash hook files in the `src/hooks/` directory and modernize the hook configuration system.

## Background/Problem Statement

Currently, claudekit maintains two parallel hook systems:
1. **Legacy bash hooks**: Individual `.sh` files in `src/hooks/` that are copied to project directories
2. **New embedded hooks**: TypeScript-based hooks compiled into the `claudekit-hooks` executable

This dual system creates maintenance overhead and confusion. The setup command still installs bash hooks, requiring file copying and making updates difficult. The new embedded hooks system is already implemented and tested but not integrated into the setup workflow.

## Goals

- Remove all bash hook files from `src/hooks/` directory
- Update setup command to generate settings.json with `claudekit-hooks run <hook>` commands
- Eliminate hook file copying during setup
- Maintain the same user experience and hook selection interface
- Remove all legacy hook-related code and dependencies

## Non-Goals

- Changing the hook selection UI/UX in the setup wizard
- Modifying hook functionality or behavior
- Changing the settings.json structure or matcher patterns
- Maintaining any backward compatibility with bash hooks

## Technical Dependencies

- **claudekit-hooks**: Already implemented TypeScript hooks executable
- **Commander.js**: CLI framework (existing dependency)
- **Node.js**: Runtime environment (existing requirement)
- No new external dependencies required

## Detailed Design

### 1. Remove Bash Hook Files and Legacy Code

Delete all `.sh` files from `src/hooks/`:
- `auto-checkpoint.sh`
- `eslint.sh`
- `project-validation.sh`
- `run-related-tests.sh`
- `typecheck.sh`
- `validate-todo-completion.sh`

Remove legacy setup script:
- `setup.sh` - entire file

Remove from `.claude/` directory:
- Any symlinks in `.claude/hooks/`
- Remove the `.claude/hooks/` directory itself

### 2. Update Settings Generation

Modify the `createProjectSettings` function in `cli/commands/setup.ts` to generate embedded hook commands:

```typescript
// Before (current implementation)
hooks: [{
  type: 'command',
  command: '.claude/hooks/typecheck.sh'
}]

// After (new implementation)
hooks: [{
  type: 'command',
  command: 'claudekit-hooks run typecheck'
}]
```

### 3. Remove Hook Copying Logic

Remove all hook-related file operations from the setup command:

```typescript
// Delete entirely from performInstallation()
if (component.type === 'hook') {
  // DELETE THIS ENTIRE BLOCK - hooks are handled by settings generation only
}
```

Also remove:
- Hook file discovery logic in `discoverComponents()`
- Hook directory creation in setup
- Any references to `.claude/hooks/` directory
- Legacy `setup.sh` script entirely

### 4. Hook Mapping

Maintain the existing hook ID to command mapping:

| Hook ID | Embedded Command |
|---------|------------------|
| typecheck | `claudekit-hooks run typecheck` |
| eslint | `claudekit-hooks run eslint` |
| prettier | `claudekit-hooks run prettier` |
| no-any | `claudekit-hooks run no-any` |
| run-related-tests | `claudekit-hooks run run-related-tests` |
| auto-checkpoint | `claudekit-hooks run auto-checkpoint` |
| validate-todo-completion | `claudekit-hooks run validate-todo-completion` |
| project-validation | `claudekit-hooks run project-validation` |

### 5. Configuration Structure

The generated settings.json structure remains unchanged, only the command values change:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "tools:Write AND file_paths:**/*.ts",
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

## User Experience

Users will experience no change in the setup workflow:
1. Run `claudekit setup`
2. Select installation type (project/user/both)
3. Choose hook groups or individual hooks
4. Settings are generated with embedded hook commands
5. No hook files are copied to the project

The only visible difference is that `.claude/hooks/` directory is no longer created or populated.

## Testing Strategy

### Unit Tests
- Test `createProjectSettings` generates correct embedded hook commands
- Verify no hook file operations are attempted
- Test hook ID to command mapping

### Integration Tests
- Full setup flow with hook selection
- Verify generated settings.json contains correct commands
- Ensure no `.claude/hooks/` directory is created
- Test that claudekit-hooks commands work with generated settings

### Manual Testing
- Run setup wizard with various hook selections
- Verify hooks execute correctly in Claude Code
- Test with existing projects to ensure no regression

### Test Documentation
Each test should include purpose comments:
```typescript
// Purpose: Verify embedded hook commands are generated instead of bash paths
// This ensures the migration from bash hooks to embedded hooks is complete
it('should generate embedded hook commands in settings', () => {
  // Test implementation
});
```

## Performance Considerations

- **Improved startup time**: No file I/O for hook copying
- **Faster hook execution**: Single binary vs individual script launches
- **Reduced disk usage**: No duplicate hook files in each project
- **Update efficiency**: Hook updates via npm package update

## Security Considerations

- **Command injection**: Commands are hardcoded, no user input in command generation
- **Path traversal**: No file operations, eliminating path-based vulnerabilities
- **Permissions**: No need to set executable permissions on hook files
- **Global binary**: Requires claudekit-hooks to be globally installed
- **Reduced attack surface**: Removing bash scripts eliminates shell injection risks

## Documentation

### Updates Required
1. **README.md**: Update hooks section to reflect embedded system
2. **Hook documentation**: Update to show new command format
3. **Setup guide**: Remove references to hook file copying
4. **Migration guide**: Document upgrade path for existing projects

### New Documentation
1. **Embedded hooks reference**: Document all available hooks
2. **Troubleshooting**: Common issues with global binary

## Implementation Phases

### Phase 1: Core Migration (MVP)
1. Update `createProjectSettings` to generate embedded commands
2. Remove hook copying logic from setup command
3. Delete all bash hook files from `src/hooks/`
4. Remove `setup.sh` script
5. Update component metadata for hooks
6. Basic testing

### Phase 2: Cleanup and Documentation
1. Remove hook file discovery from `discoverComponents()`
2. Delete any legacy hook-related utilities
3. Update all documentation
4. Remove references to bash hooks from codebase
5. Comprehensive testing

### Phase 3: Final Polish
1. Verify no legacy code remains
2. Performance benchmarking
3. Update examples to use embedded hooks

## Open Questions

1. Should the setup verify claudekit-hooks is installed before proceeding?
2. Should we add a pre-installation check for the embedded hooks binary?
3. What error message should users see if claudekit-hooks is not found?

## References

- [Embedded Hooks System Implementation](feat-embedded-hooks-system.md)
- [Claude Code Hooks Documentation](https://docs.anthropic.com/en/docs/claude-code/hooks)
- [TypeScript Hooks PR](#embedded-hooks)
- [Setup Command Modernization](feat-modernize-setup-installer.md)