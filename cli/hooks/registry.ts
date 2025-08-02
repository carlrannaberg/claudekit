import { TypecheckChangedHook } from './typecheck-changed.js';
import { CheckAnyChangedHook } from './check-any-changed.js';
import { LintChangedHook } from './lint-changed.js';
import { CreateCheckpointHook } from './create-checkpoint.js';
import { TestChangedHook } from './test-changed.js';
import { CheckTodosHook } from './check-todos.js';
import { TypecheckProjectHook } from './typecheck-project.js';
import { LintProjectHook } from './lint-project.js';
import { TestProjectHook } from './test-project.js';

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

export type HookName = keyof typeof HOOK_REGISTRY;
