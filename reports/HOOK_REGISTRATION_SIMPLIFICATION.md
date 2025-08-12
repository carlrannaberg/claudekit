# Hook Registration Simplification Analysis

## Problem
Adding a new hook currently requires changes in 8 different places:
1. Hook Implementation (`cli/hooks/[hook-name].ts`)
2. Hook Registry (`cli/hooks/registry.ts`)
3. Hook Index (`cli/hooks/index.ts`)
4. Hook Runner (`cli/hooks/runner.ts`)
5. CLI List Command (`cli/hooks-cli.ts` - 2 places)
6. Setup Command (`cli/commands/setup.ts`)
7. Component Registry (`cli/lib/components.ts`)
8. Tests (`tests/lib/components.test.ts`)

## Current Reality

The system already has partial automation:
- **Commands**: Auto-discovered via `scanDirectory()` 
- **Agents**: Auto-discovered via `scanDirectory()`
- **Hooks**: Hardcoded in `EMBEDDED_HOOK_COMPONENTS`

## Why Not Full Auto-Discovery?

1. **Hooks are compiled and bundled** - After esbuild bundles the code, filesystem scanning doesn't work
2. **TypeScript limitations** - Can't reliably reflect on classes at runtime after compilation
3. **Performance** - Static registration is faster than runtime discovery
4. **Type safety** - Explicit imports provide better TypeScript support

## Simplest Viable Solution

### Option 1: Accept the 8 Steps
The current approach is explicit and type-safe. Adding a hook is infrequent enough that 8 manual steps might be acceptable.

### Option 2: Static Metadata in Classes (Partial Solution)
Add metadata to each hook class:
```typescript
export class MyHook extends BaseHook {
  name = 'my-hook';
  
  static metadata = {
    description: 'What it does',
    category: 'validation',
    triggerEvent: 'PostToolUse',
  };
}
```

This could reduce updates needed in CLI and setup files if they read from the metadata.

### Option 3: Single Registration File
Create one file that imports all hooks and exports their metadata:
```typescript
// cli/hooks/all-hooks.ts
export { TypecheckChangedHook } from './typecheck-changed.js';
// ... more exports

export const HOOK_METADATA = {
  'typecheck-changed': {
    description: 'Type checking',
    // ...
  }
};
```

Still requires manual updates but centralizes them.

## Recommendation

**Keep the current system as-is.** 

Why:
1. Adding hooks is infrequent (10 hooks total currently)
2. The explicit registration provides type safety
3. Build-time bundling makes runtime discovery impractical
4. Code generation adds complexity without much benefit

If simplification is needed, Option 2 (static metadata in classes) provides the best balance - hooks are self-documenting while maintaining the explicit registration pattern that works with the build system.