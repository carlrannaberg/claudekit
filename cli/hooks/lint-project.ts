/**
 * Lint Project Hook
 * Runs ESLint validation on the entire project
 */

import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable, formatESLintErrors } from './utils.js';
import { getHookConfig } from '../utils/claudekit-config.js';

interface LintProjectConfig {
  command?: string | undefined;
  timeout?: number | undefined;
}

export class LintProjectHook extends BaseHook {
  name = 'lint-project';

  static metadata = {
    id: 'lint-project',
    displayName: 'ESLint Project Validation',
    description: 'ESLint validation on entire project',
    category: 'validation' as const,
    triggerEvent: 'Stop' as const,
    matcher: '*',
    dependencies: ['eslint'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;

    if (!(await checkToolAvailable('eslint', '.eslintrc.json', projectRoot))) {
      return { exitCode: 0 }; // Skip if ESLint not available
    }

    this.progress('Running project-wide ESLint validation...');

    const config = this.loadConfig();
    const eslintCommand =
      config.command ?? `${packageManager.exec} eslint . --ext .js,.jsx,.ts,.tsx`;

    const execOptions: { cwd: string; timeout?: number } = { cwd: projectRoot };
    if (config.timeout !== undefined) {
      execOptions.timeout = config.timeout;
    }

    const result = await this.execCommand(eslintCommand, [], execOptions);

    if (result.exitCode === 0 && !result.stdout.includes('error')) {
      this.success('ESLint validation passed!');
      return { exitCode: 0 };
    }

    // Format error output
    const errorOutput = formatESLintErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }

  private loadConfig(): LintProjectConfig {
    return getHookConfig<LintProjectConfig>('lint-project') || {};
  }
}
