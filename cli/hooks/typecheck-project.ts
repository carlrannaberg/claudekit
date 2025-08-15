/**
 * Typecheck Project Hook
 * Runs TypeScript validation on the entire project
 */

import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable, formatTypeScriptErrors } from './utils.js';
import { getHookConfig } from '../utils/claudekit-config.js';

interface TypecheckConfig {
  command?: string | undefined;
  timeout?: number | undefined;
}

export class TypecheckProjectHook extends BaseHook {
  name = 'typecheck-project';

  static metadata = {
    id: 'typecheck-project',
    displayName: 'TypeScript Project Validation',
    description: 'TypeScript validation on entire project',
    category: 'validation' as const,
    triggerEvent: ['Stop', 'SubagentStop'] as const,
    matcher: '*',
    dependencies: ['typescript', 'tsc'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;

    if (!(await checkToolAvailable('tsc', 'tsconfig.json', projectRoot))) {
      return { exitCode: 0 }; // Skip if TypeScript not available
    }

    this.progress('Running project-wide TypeScript validation...');

    const config = this.loadConfig();
    const tsCommand = config.command ?? `${packageManager.exec} tsc --noEmit`;

    const result = await this.execCommand(tsCommand, [], { cwd: projectRoot });

    if (result.exitCode === 0) {
      this.success('TypeScript validation passed!');
      return { exitCode: 0 };
    }

    // Format error output similar to current project-validation
    const errorOutput = formatTypeScriptErrors(result, tsCommand);
    console.error(errorOutput);
    return { exitCode: 2 };
  }

  private loadConfig(): TypecheckConfig {
    return getHookConfig<TypecheckConfig>('typecheck-project') ?? {};
  }
}
