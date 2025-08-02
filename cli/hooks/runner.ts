import * as fs from 'fs-extra';
import * as path from 'path';
import { z } from 'zod';
import { readStdin } from './utils.js';
import type { BaseHook, HookConfig } from './base.js';

// Import all hooks
import { TypecheckChangedHook } from './typecheck-changed.js';
import { CheckAnyChangedHook } from './check-any-changed.js';
import { LintChangedHook } from './lint-changed.js';
import { CreateCheckpointHook } from './create-checkpoint.js';
import { TestChangedHook } from './test-changed.js';
import { CheckTodosHook } from './check-todos.js';
import { TypecheckProjectHook } from './typecheck-project.js';
import { LintProjectHook } from './lint-project.js';
import { TestProjectHook } from './test-project.js';

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
  private debug: boolean;

  constructor(configPath: string = '.claudekit/config.json', debug: boolean = false) {
    this.configPath = configPath;
    this.debug = debug;

    // Register all hooks
    this.hooks.set('typecheck-changed', TypecheckChangedHook);
    this.hooks.set('check-any-changed', CheckAnyChangedHook);
    this.hooks.set('lint-changed', LintChangedHook);
    this.hooks.set('create-checkpoint', CreateCheckpointHook);
    this.hooks.set('test-changed', TestChangedHook);
    this.hooks.set('check-todos', CheckTodosHook);
    this.hooks.set('typecheck-project', TypecheckProjectHook);
    this.hooks.set('lint-project', LintProjectHook);
    this.hooks.set('test-project', TestProjectHook);
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
    
    if (this.debug) {
      console.error('[DEBUG] Raw stdin input:', JSON.stringify(input));
      console.error('[DEBUG] Input length:', input.length);
    }
    
    let payload;
    try {
      payload = JSON.parse(input || '{}');
      if (this.debug) {
        console.error('[DEBUG] Parsed payload:', JSON.stringify(payload, null, 2));
      }
    } catch (error) {
      if (this.debug) {
        console.error('[DEBUG] Failed to parse JSON:', error);
      }
      payload = {};
    }

    // Create and run hook
    const hook = new HookClass(hookConfig);
    
    if (this.debug) {
      console.error('[DEBUG] Running hook:', hookName);
      console.error('[DEBUG] Hook config:', JSON.stringify(hookConfig, null, 2));
      // Set environment variable for the hook to detect debug mode
      process.env['CLAUDEKIT_DEBUG'] = 'true';
    }
    
    const result = await hook.run(payload);
    
    // Clean up environment variable
    if (this.debug) {
      delete process.env['CLAUDEKIT_DEBUG'];
    }
    
    if (this.debug) {
      console.error('[DEBUG] Hook result:', JSON.stringify(result, null, 2));
    }

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
