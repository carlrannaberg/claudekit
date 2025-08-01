/**
 * Hook exports and registration
 * Central place to export all available hooks
 */

// Export all hook classes
export { TypecheckHook } from './typecheck.js';
export { NoAnyHook } from './no-any.js';
export { EslintHook } from './eslint.js';
export { AutoCheckpointHook } from './auto-checkpoint.js';
export { RunRelatedTestsHook } from './run-related-tests.js';
export { ProjectValidationHook } from './project-validation.js';
export { ValidateTodoCompletionHook } from './validate-todo.js';

// Export base and utils
export { BaseHook } from './base.js';
export type { HookContext, HookResult, HookConfig, ClaudePayload } from './base.js';
export * from './utils.js';

// Export hook registry
export { HOOK_REGISTRY, type HookName } from './registry.js';
