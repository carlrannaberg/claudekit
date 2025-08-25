import fs from 'fs-extra';
import * as path from 'node:path';
import { setImmediate } from 'node:timers';
import { z } from 'zod';
import { readStdin } from './utils.js';
import type { BaseHook, HookConfig } from './base.js';
import { appendHookExecution, getHookStats } from './logging.js';
import { HOOK_REGISTRY } from './registry.js';

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

    // Register all hooks from the registry
    for (const [id, HookClass] of Object.entries(HOOK_REGISTRY)) {
      this.hooks.set(id, HookClass);
    }
  }

  async run(hookName: string): Promise<number> {
    const startTime = Date.now();

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

    // Log hook execution
    const executionTime = Date.now() - startTime;
    await appendHookExecution({
      hookName,
      timestamp: new Date().toISOString(),
      executionTime,
      exitCode: result.exitCode,
      payload: this.debug ? payload : undefined,
      result: this.debug ? result : undefined,
    });

    if (this.debug) {
      console.error('[DEBUG] Hook result:', JSON.stringify(result, null, 2));
      console.error('[DEBUG] Execution time:', executionTime, 'ms');

      // Show hook stats
      const stats = await getHookStats();
      const hookStats = stats[hookName];
      if (hookStats) {
        console.error('[DEBUG] Hook stats:', {
          totalExecutions: hookStats.totalExecutions,
          successCount: hookStats.successCount,
          failureCount: hookStats.failureCount,
          avgExecutionTime: Math.round(hookStats.avgExecutionTime),
          lastExecution: hookStats.lastExecution,
        });
      }
    }

    // Output JSON response if provided
    if (result.jsonResponse !== undefined) {
      console.log(JSON.stringify(result.jsonResponse));
    }

    // Ensure all async operations complete before returning
    await new Promise((resolve) => setImmediate(resolve));

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

/**
 * Standalone function to run a hook and return stdout
 * Used by the profiling system
 */
export async function runHook(hookName: string): Promise<{ stdout: string }> {
  const runner = new HookRunner('.claudekit/config.json', false);
  
  // Create a temporary stdout capture with memory limit
  const MAX_OUTPUT_SIZE = 10 * 1024 * 1024; // 10MB limit
  let capturedOutput = '';
  let totalBytesWritten = 0;
  let truncated = false;
  const originalWrite = process.stdout.write;
  
  // Capture stdout with size limit
  process.stdout.write = function(chunk: string | Uint8Array): boolean {
    const chunkStr = typeof chunk === 'string' ? chunk : chunk.toString();
    const chunkSize = Buffer.byteLength(chunkStr, 'utf8');
    
    if (totalBytesWritten + chunkSize > MAX_OUTPUT_SIZE) {
      if (!truncated) {
        capturedOutput += '\n[Output truncated - exceeded 10MB limit]';
        truncated = true;
      }
      // Still return true to avoid breaking the hook execution
      return true;
    }
    
    capturedOutput += chunkStr;
    totalBytesWritten += chunkSize;
    return true;
  };
  
  try {
    await runner.run(hookName);
    return { stdout: capturedOutput };
  } finally {
    // Restore original stdout
    process.stdout.write = originalWrite;
  }
}
