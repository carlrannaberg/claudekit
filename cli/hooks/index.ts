/**
 * Hook exports and registration
 * Central place to export all available hooks
 */

// Export all hook classes
export { TypecheckChangedHook } from './typecheck-changed.js';
export { CheckAnyChangedHook } from './check-any-changed.js';
export { LintChangedHook } from './lint-changed.js';
export { CreateCheckpointHook } from './create-checkpoint.js';
export { TestChangedHook } from './test-changed.js';
export { CheckTodosHook } from './check-todos.js';
export { TypecheckProjectHook } from './typecheck-project.js';
export { LintProjectHook } from './lint-project.js';
export { TestProjectHook } from './test-project.js';
export { CheckCommentReplacementHook } from './check-comment-replacement.js';

// Export base and utils
export { BaseHook } from './base.js';
export type { HookContext, HookResult, HookConfig, ClaudePayload } from './base.js';
export * from './utils.js';

// Export hook registry
export { HOOK_REGISTRY, type HookName } from './registry.js';
