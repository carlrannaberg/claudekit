# Adding New Hooks to ClaudeKit

## Current Process (2 Steps Only!)

Adding a new hook to ClaudeKit now requires just **2 simple steps**:

### Step 1: Create Your Hook Implementation

Create a new file in `cli/hooks/` with your hook class:

```typescript
// cli/hooks/my-new-hook.ts
import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class MyNewHook extends BaseHook {
  name = 'my-new-hook';

  static metadata = {
    id: 'my-new-hook',
    displayName: 'My New Hook',
    description: 'What this hook does',
    category: 'validation' as const,  // or 'testing', 'git', 'project-management', 'utility'
    triggerEvent: 'PostToolUse' as const,  // or 'Stop'
    matcher: 'Write|Edit|MultiEdit',  // Tool patterns that trigger this hook
    dependencies: ['tool1', 'tool2'],  // optional
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;
    
    // Your hook logic here
    
    return { exitCode: 0 };
  }
}
```

### Step 2: Export Your Hook

Add one export line to `cli/hooks/index.ts`:

```typescript
// cli/hooks/index.ts
export { MyNewHook } from './my-new-hook.js';
```

## That's It! 🎉

Everything else is handled automatically:
- ✅ Hook registry is built from exports
- ✅ Runner automatically discovers hooks via registry
- ✅ CLI commands (`list`, `run`) work immediately
- ✅ Setup command includes it automatically
- ✅ Settings are generated from hook metadata
- ✅ Component discovery happens automatically

## Optional Steps

For a production-ready hook, you may also want to:

3. **Add tests** in `tests/unit/hooks/my-new-hook.test.sh`
4. **Update documentation** in `docs/hooks-documentation.md`

## Hook Metadata Fields

### Required Fields

- `id`: Unique identifier for the hook (should match the `name` property)
- `displayName`: Human-readable name shown in UI
- `description`: Brief description of what the hook does
- `category`: One of: `'validation'`, `'testing'`, `'git'`, `'project-management'`, `'utility'`
- `triggerEvent`: When the hook runs - either `'PostToolUse'` (after file edits) or `'Stop'` (when Claude stops)
- `matcher`: Tool patterns that trigger this hook (e.g., `'Write|Edit|MultiEdit'` for file modifications)

### Optional Fields

- `dependencies`: Array of tool names this hook requires (e.g., `['typescript', 'tsc']`)

## Hook Context

Your hook receives a context object with:

- `filePath`: The file being edited (may be undefined)
- `projectRoot`: The project root directory
- `payload`: The full Claude payload
- `packageManager`: Detected package manager with utilities

## Hook Results

Return an object with:

- `exitCode`: 
  - `0` for success
  - `2` to block the operation with an error
- `suppressOutput`: Optional boolean to suppress output
- `jsonResponse`: Optional JSON data to return

## Utility Methods

BaseHook provides these utilities:

- `this.progress(message)`: Show progress message
- `this.success(message)`: Show success message
- `this.warning(message)`: Show warning message
- `this.error(title, details, instructions)`: Show formatted error
- `this.shouldSkipFile(filePath, extensions)`: Check if file should be skipped
- `this.execCommand(command, args, options)`: Execute shell commands
- `this.fileExists(path)`: Check if file exists
- `this.readFile(path)`: Read file contents

## Testing Your Hook

1. Build the project: `npm run build`
2. Test directly: `echo '{"tool_input": {"file_path": "/path/to/file.ts"}}' | claudekit-hooks run my-new-hook`
3. Test in Claude Code by triggering the appropriate event

## Example: TypeScript Validation Hook

```typescript
export class TypecheckChangedHook extends BaseHook {
  name = 'typecheck-changed';

  static metadata = {
    id: 'typecheck-changed',
    displayName: 'TypeScript Type Checking (Changed Files)',
    description: 'Run TypeScript type checking on file changes',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['typescript', 'tsc'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;

    // Skip non-TypeScript files
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }

    // Check if TypeScript is available
    if (!(await checkToolAvailable('tsc', 'tsconfig.json', projectRoot))) {
      this.warning('No TypeScript configuration found, skipping check');
      return { exitCode: 0 };
    }

    this.progress(`📘 Type-checking ${filePath}`);

    // Run TypeScript compiler
    const command = this.config.command ?? `${packageManager.exec} tsc --noEmit`;
    const result = await this.execCommand(command, [], { cwd: projectRoot });

    if (result.exitCode !== 0) {
      this.error('TypeScript compilation failed', result.stderr || result.stdout, [
        'Fix ALL TypeScript errors shown above',
        'Run the type check command to verify',
      ]);
      return { exitCode: 2 };
    }

    this.success('TypeScript check passed!');
    return { exitCode: 0 };
  }
}
```

## Previous Process (Historical Reference)

Previously, adding a hook required changes in 8 different places:
1. Hook Implementation
2. Hook Registry  
3. Hook Index
4. Hook Runner
5. CLI List Command (2 places)
6. Setup Command  
7. Component Registry
8. Tests

This has been simplified to just **2 required steps** as shown above!