import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';
import { readStdin } from './utils.js';
import type { BaseHook, HookConfig } from './base.js';

// Import all hooks
import { TypecheckHook } from './typecheck.js';
import { NoAnyHook } from './no-any.js';
import { EslintHook } from './eslint.js';
import { AutoCheckpointHook } from './auto-checkpoint.js';
import { RunRelatedTestsHook } from './run-related-tests.js';
import { ProjectValidationHook } from './project-validation.js';
import { ValidateTodoCompletionHook } from './validate-todo.js';

// Configuration schema
const HookConfigSchema = z
  .object({
    command: z.string().optional(),
    timeout: z.number().optional().default(30000),
  })
  .passthrough();

const ConfigSchema = z.object({
  hooks: z.record(z.string(), HookConfigSchema).optional().default({}),
});

export class HookRunner {
  private hooks: Map<string, new (config: HookConfig) => BaseHook> = new Map();
  private configPath: string;

  constructor(configPath: string = '.claudekit/config.json') {
    this.configPath = configPath;

    // Register all hooks
    this.hooks.set('typecheck', TypecheckHook);
    this.hooks.set('no-any', NoAnyHook);
    this.hooks.set('eslint', EslintHook);
    this.hooks.set('auto-checkpoint', AutoCheckpointHook);
    this.hooks.set('run-related-tests', RunRelatedTestsHook);
    this.hooks.set('project-validation', ProjectValidationHook);
    this.hooks.set('validate-todo-completion', ValidateTodoCompletionHook);
  }

  async run(hookName: string): Promise<number> {
    // Get hook class
    const HookClass = this.hooks.get(hookName);
    if (!HookClass) {
      console.error(`Unknown hook: ${hookName}`);
      return 1;
    }

    // Load configuration
    const config = await this.loadConfig();
    const hookConfig = config.hooks[hookName] || {};

    // Read Claude payload from stdin
    const input = await readStdin();
    let payload;
    try {
      payload = JSON.parse(input || '{}');
    } catch {
      payload = {};
    }

    // Create and run hook
    const hook = new HookClass(hookConfig);
    const result = await hook.run(payload);

    // Handle different result types
    if (result.jsonResponse !== undefined) {
      console.log(JSON.stringify(result.jsonResponse));
    }

    return result.exitCode;
  }

  private async loadConfig(): Promise<z.infer<typeof ConfigSchema>> {
    try {
      const configPath = path.resolve(this.configPath);
      const configData = await fs.readJson(configPath);
      return ConfigSchema.parse(configData);
    } catch {
      // Return default config if file doesn't exist or is invalid
      return { hooks: {} };
    }
  }
}
