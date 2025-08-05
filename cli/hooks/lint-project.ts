/**
 * Lint Project Hook
 * Runs ESLint validation on the entire project
 */

import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable, formatESLintErrors } from './utils.js';

export class LintProjectHook extends BaseHook {
  name = 'lint-project';

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;

    if (!(await checkToolAvailable('eslint', '.eslintrc.json', projectRoot))) {
      return { exitCode: 0 }; // Skip if ESLint not available
    }

    this.progress('Running project-wide ESLint validation...');

    const eslintCommand =
      (this.config['eslintCommand'] as string) ||
      `${packageManager.exec} eslint . --ext .js,.jsx,.ts,.tsx`;

    const result = await this.execCommand(eslintCommand, [], { cwd: projectRoot });

    if (result.exitCode === 0 && !result.stdout.includes('error')) {
      this.success('ESLint validation passed!');
      return { exitCode: 0 };
    }

    // Format error output
    const errorOutput = formatESLintErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }
}
