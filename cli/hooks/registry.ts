/**
 * Hook Registry
 * Builds registry from hooks exported in index.ts
 */

import * as Hooks from './index.js';
import type { BaseHook, HookConfig, HookMetadata } from './base.js';

// Type for hook constructors with optional metadata
export interface HookConstructor {
  new (config: HookConfig): BaseHook;
  metadata?: HookMetadata;
}

// Build registry from all exported hooks in index.ts
export const HOOK_REGISTRY: Record<string, HookConstructor> = {};

// Get all exports from index.ts and register hooks
for (const [exportName, exported] of Object.entries(Hooks)) {
  // Filter for hook classes (end with 'Hook' and are constructors)
  if (
    exportName.endsWith('Hook') &&
    typeof exported === 'function' &&
    exported !== Hooks.BaseHook
  ) {
    const HookClass = exported as HookConstructor;
    // Get ID from metadata or instance
    const id = HookClass.metadata?.id ?? new HookClass({}).name;
    HOOK_REGISTRY[id] = HookClass;
  }
}

export type HookName = keyof typeof HOOK_REGISTRY;
