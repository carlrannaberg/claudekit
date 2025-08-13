import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable } from './utils.js';
import { getHookConfig } from '../utils/claudekit-config.js';

interface TypecheckConfig {
  command?: string | undefined;
  timeout?: number | undefined;
}

export class TypecheckChangedHook extends BaseHook {
  name = 'typecheck-changed';

  static metadata = {
    id: 'typecheck-changed',
    displayName: 'TypeScript Type Checking (Changed Files)',
    description: 'Run TypeScript type checking on file changes',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['typescript', 'tsc'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;

    // Skip if no file or wrong extension
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }

    // Check if TypeScript is available
    if (!(await checkToolAvailable('tsc', 'tsconfig.json', projectRoot))) {
      this.warning('No TypeScript configuration found, skipping check');
      return { exitCode: 0 };
    }

    this.progress(`📘 Type-checking ${filePath}`);

    // Run TypeScript compiler
    const config = this.loadConfig();
    const command = config.command ?? `${packageManager.exec} tsc --noEmit`;
    const result = await this.execCommand(command, [], {
      cwd: projectRoot,
    });

    if (result.exitCode !== 0) {
      this.error('TypeScript compilation failed', result.stderr || result.stdout, [
        'Fix ALL TypeScript errors shown above',
        `Run '${command}' to verify all errors are resolved`,
      ]);
      return { exitCode: 2 };
    }

    this.success('TypeScript check passed!');
    return { exitCode: 0 };
  }

  private loadConfig(): TypecheckConfig {
    return getHookConfig<TypecheckConfig>('typecheck-changed') ?? {};
  }
}
