/**
 * Hook exports - SINGLE SOURCE OF TRUTH
 * To add a new hook: Just export it here
 */

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
export { CheckUnusedParametersHook } from './check-unused-parameters.js';
export { SelfReviewHook } from './self-review.js';
export { CodebaseMapHook, CodebaseMapUpdateHook } from './codebase-map.js';
export { FileGuardHook } from './file-guard.js';

// Export base and utils
export { BaseHook } from './base.js';
export type { HookContext, HookResult, HookConfig, ClaudePayload, HookMetadata } from './base.js';
export * from './utils.js';
