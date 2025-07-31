import { TypecheckHook } from './typecheck.js';
import { NoAnyHook } from './no-any.js';
import { EslintHook } from './eslint.js';
import { AutoCheckpointHook } from './auto-checkpoint.js';
import { RunRelatedTestsHook } from './run-related-tests.js';
import { ProjectValidationHook } from './project-validation.js';
import { ValidateTodoCompletionHook } from './validate-todo.js';

export const HOOK_REGISTRY = {
  'typecheck': TypecheckHook,
  'no-any': NoAnyHook,
  'eslint': EslintHook,
  'auto-checkpoint': AutoCheckpointHook,
  'run-related-tests': RunRelatedTestsHook,
  'project-validation': ProjectValidationHook,
  'validate-todo-completion': ValidateTodoCompletionHook,
};

export type HookName = keyof typeof HOOK_REGISTRY;