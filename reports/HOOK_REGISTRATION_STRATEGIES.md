# Hook Registration Simplification - IMPLEMENTED SOLUTION

## Current Problem (SOLVED)
Adding a new hook previously required changes in 8 different places:
1. Hook Implementation (`cli/hooks/[hook-name].ts`)
2. Hook Registry (`cli/hooks/registry.ts`)
3. Hook Index (`cli/hooks/index.ts`)
4. Hook Runner (`cli/hooks/runner.ts`)
5. CLI List Command (`cli/hooks-cli.ts` - 2 places)
6. Setup Command (`cli/commands/setup.ts`)
7. Component Registry (`cli/lib/components.ts`)
8. Tests (`tests/lib/components.test.ts`)

## Strategy 1: Auto-Discovery Pattern (RECOMMENDED)
**Steps reduced to: 2**

### Implementation
Create an auto-discovery system that scans the hooks directory and automatically registers hooks based on their exports.

#### Step 1: Add static metadata to hook classes
```typescript
// cli/hooks/typecheck-changed.ts
export class TypecheckChangedHook extends BaseHook {
  static metadata = {
    id: 'typecheck-changed',
    name: 'TypeScript Type Checking (Changed Files)',
    description: 'Run TypeScript type checking on file changes',
    category: 'validation',
    triggerEvent: 'PostToolUse',
    dependencies: ['typescript', 'tsc'],
    platforms: ['all'],
  };
  
  name = TypecheckChangedHook.metadata.id;
  // ... rest of implementation
}
```

#### Step 2: Create auto-discovery registry
```typescript
// cli/hooks/auto-registry.ts
import * as fs from 'fs';
import * as path from 'path';
import { BaseHook } from './base.js';

export async function discoverHooks(): Promise<Map<string, typeof BaseHook>> {
  const hooks = new Map();
  const hooksDir = path.dirname(import.meta.url.replace('file://', ''));
  
  const files = fs.readdirSync(hooksDir);
  for (const file of files) {
    if (file.endsWith('.ts') && !file.includes('base') && !file.includes('registry')) {
      const module = await import(`./${file}`);
      for (const exported of Object.values(module)) {
        if (exported?.prototype instanceof BaseHook) {
          const metadata = exported.metadata;
          if (metadata?.id) {
            hooks.set(metadata.id, exported);
          }
        }
      }
    }
  }
  return hooks;
}
```

### Benefits
- Add new hook = Create file with metadata
- No manual registration needed
- All hook info in one place

## Strategy 2: Code Generation Pattern
**Steps reduced to: 2**

### Implementation
Create a generator that updates all necessary files when a new hook is added.

#### Step 1: Create hook manifest
```json
// cli/hooks/hooks.manifest.json
{
  "hooks": [
    {
      "id": "typecheck-changed",
      "className": "TypecheckChangedHook",
      "file": "./typecheck-changed.js",
      "name": "TypeScript Type Checking (Changed Files)",
      "description": "Run TypeScript type checking on file changes",
      "category": "validation",
      "triggerEvent": "PostToolUse"
    }
  ]
}
```

#### Step 2: Generate registry files
```typescript
// cli/hooks/generate-registry.ts
import manifest from './hooks.manifest.json';

function generateRegistry() {
  // Generate registry.ts
  const registryCode = `
    ${manifest.hooks.map(h => `import { ${h.className} } from '${h.file}';`).join('\n')}
    
    export const HOOK_REGISTRY = {
      ${manifest.hooks.map(h => `'${h.id}': ${h.className}`).join(',\n')}
    };
  `;
  
  // Generate components.ts entries
  const componentsCode = manifest.hooks.map(h => `{
    path: 'embedded:${h.id}',
    type: 'hook',
    metadata: ${JSON.stringify(h)}
  }`);
  
  // Update all files...
}
```

### Benefits
- Single source of truth
- Easy to maintain
- Can regenerate anytime

## Strategy 3: Runtime Reflection Pattern
**Steps reduced to: 1**

### Implementation
Use runtime reflection to discover and register hooks automatically.

#### Step 1: Enhanced BaseHook with self-registration
```typescript
// cli/hooks/base.ts
const GLOBAL_HOOK_REGISTRY = new Map();

export abstract class BaseHook {
  static register(hookClass: typeof BaseHook) {
    const instance = new hookClass({});
    GLOBAL_HOOK_REGISTRY.set(instance.name, hookClass);
  }
  
  constructor(config: HookConfig = {}) {
    // Auto-register on instantiation
    if (new.target !== BaseHook) {
      BaseHook.register(new.target as typeof BaseHook);
    }
  }
}

// Each hook self-registers
export class TypecheckChangedHook extends BaseHook {
  static { BaseHook.register(this); } // Static initializer
}
```

### Benefits
- Zero configuration
- Hooks self-register
- No build step needed

## Strategy 4: Hybrid Approach (BEST BALANCE)
**Steps reduced to: 2-3**

### Implementation
Combine auto-discovery with build-time optimization.

#### Step 1: Create hook with inline metadata
```typescript
// cli/hooks/my-new-hook.ts
import { defineHook } from './define-hook.js';

export default defineHook({
  id: 'my-new-hook',
  name: 'My New Hook',
  description: 'Description here',
  category: 'validation',
  triggerEvent: 'PostToolUse',
  async execute(context) {
    // Implementation here
  }
});
```

#### Step 2: Build-time scanning
```typescript
// build/scan-hooks.ts
// Scans all hooks at build time and generates:
// - registry.ts
// - components definitions
// - CLI help text
// - Setup options
```

#### Step 3: Runtime uses pre-built registry
```typescript
// cli/hooks/runner.ts
import { GENERATED_HOOK_REGISTRY } from './generated/registry.js';
// Everything is pre-computed at build time
```

### Benefits
- Clean API
- Build-time optimization
- Type safety
- Fast runtime

## Recommended Implementation Plan

### Phase 1: Implement Auto-Discovery (Strategy 1)
1. Add static metadata to all existing hooks
2. Create auto-discovery function
3. Replace manual registries with auto-discovered ones

### Phase 2: Add Build-Time Generation
1. Create build script to generate registry files
2. Add to npm build process
3. Cache discovered hooks for performance

### Phase 3: Simplify Hook Creation
1. Create `defineHook` helper function
2. Add CLI command: `claudekit create-hook <name>`
3. Auto-generate boilerplate

### Final Result
**Creating a new hook becomes:**
1. Run: `claudekit create-hook my-hook`
2. Edit: `cli/hooks/my-hook.ts` (already has boilerplate)
3. Run: `npm run build`

Or even simpler with auto-discovery:
1. Create: `cli/hooks/my-hook.ts` with metadata
2. Done! (auto-discovered at runtime)

## Implementation Priority

1. **Start with Strategy 1** (Auto-Discovery)
   - Easiest to implement
   - Immediate benefit
   - No breaking changes

2. **Add Strategy 2** (Code Generation) 
   - For build-time optimization
   - Better performance
   - Type safety

3. **Consider Strategy 3** (Runtime Reflection)
   - If performance isn't critical
   - For maximum simplicity

## IMPLEMENTED SOLUTION

### What Was Built
We implemented a **Centralized Metadata + Code Generation** approach that reduces hook registration from 8 steps to just 2:

1. **`cli/hooks/hook-metadata.ts`** - Single source of truth for all hook definitions
2. **`cli/hooks/generate-registry.ts`** - Code generator that updates all necessary files

### How It Works

#### Step 1: Add Hook Implementation
Create your hook file as normal:
```typescript
// cli/hooks/my-new-hook.ts
export class MyNewHook extends BaseHook {
  name = 'my-new-hook';
  
  async execute(context: HookContext): Promise<HookResult> {
    // Implementation
  }
}
```

#### Step 2: Add to Central Metadata
Add one entry to `HOOK_DEFINITIONS` in `cli/hooks/hook-metadata.ts`:
```typescript
{
  id: 'my-new-hook',
  className: 'MyNewHook',
  name: 'My New Hook',
  description: 'Description of what it does',
  category: 'validation',
  triggerEvent: 'PostToolUse',
  dependencies: [],
  platforms: ['all'],
  enabled: true,
}
```

#### Step 3: Generate Everything
Run the build which automatically generates all registrations:
```bash
npm run build
```

This runs `npm run generate-hooks` which updates:
- `registry.ts` - Hook registry mappings
- `index.ts` - Hook exports
- `runner.ts` - Hook registrations
- `hooks-cli.ts` - CLI help text (both places)
- `setup.ts` - Setup command options
- `components.ts` - Embedded component definitions

### Benefits Achieved

✅ **From 8 steps to 2** - Just add implementation and metadata
✅ **Single source of truth** - All hook info in one place
✅ **Type-safe** - TypeScript ensures consistency
✅ **Automatic updates** - All files stay in sync
✅ **Build-time generation** - No runtime overhead
✅ **Easy to maintain** - Clear separation of concerns

### Files Created

1. **`cli/hooks/hook-metadata.ts`** - Central metadata definitions
2. **`cli/hooks/generate-registry.ts`** - Code generation script
3. **`package.json`** - Added `generate-hooks` script to build process

### Next Steps (Optional Enhancements)

1. **Create Hook CLI Command**
   ```bash
   claudekit create-hook my-hook
   ```
   - Generate boilerplate implementation
   - Add metadata entry
   - Run generator

2. **Runtime Discovery** (Future)
   - Scan hooks directory at runtime
   - Extract metadata from decorators
   - Zero configuration needed

3. **Hook Testing Framework**
   - Generate test stubs
   - Mock context helpers
   - Assertion utilities