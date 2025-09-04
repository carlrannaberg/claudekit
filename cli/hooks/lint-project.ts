/**
 * Lint Project Hook
 * Runs linting validation on the entire project (Biome, ESLint, etc)
 */

import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable, formatESLintErrors, formatBiomeErrors } from './utils.js';
import { detectBiome, detectESLint } from '../lib/project-detection.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import type { ExecResult } from './utils.js';

interface LintProjectConfig {
  command?: string | undefined;
  timeout?: number | undefined;
}

export class LintProjectHook extends BaseHook {
  name = 'lint-project';

  static metadata = {
    id: 'lint-project',
    displayName: 'Lint Project Validation',
    description: 'Linting validation on entire project (Biome, ESLint, etc)',
    category: 'validation' as const,
    triggerEvent: ['Stop', 'SubagentStop'] as const,
    matcher: '*',
    dependencies: ['linter'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;

    const results: Array<{ tool: string; result: ExecResult }> = [];
    const errors: string[] = [];

    // Run Biome if configured
    if (await detectBiome(projectRoot)) {
      if (await checkToolAvailable('biome', 'biome.json', projectRoot)) {
        this.progress('Running project-wide Biome validation...');
        const config = this.loadConfig();
        const biomeResult = await this.runBiome(projectRoot, packageManager, config);
        results.push({ tool: 'Biome', result: biomeResult });
        
        if (biomeResult.exitCode === 0) {
          this.success('Biome validation passed!');
        } else {
          const errorMessage = formatBiomeErrors(biomeResult);
          errors.push(`Biome validation failed:\n${errorMessage}`);
        }
      }
    }

    // Run ESLint if configured
    if (await detectESLint(projectRoot)) {
      if (await checkToolAvailable('eslint', '.eslintrc.json', projectRoot)) {
        this.progress('Running project-wide ESLint validation...');
        const eslintResult = await this.runEslint(projectRoot, packageManager);
        results.push({ tool: 'ESLint', result: eslintResult });
        
        if (eslintResult.exitCode === 0 && eslintResult.stdout.includes('error') === false) {
          this.success('ESLint validation passed!');
        } else {
          const errorOutput = formatESLintErrors(eslintResult);
          errors.push(`ESLint validation failed:\n${errorOutput}`);
        }
      }
    }

    // If no linters configured, skip
    if (results.length === 0) {
      this.progress('No linters configured, skipping lint validation');
      return { exitCode: 0 };
    }

    // Report all errors at the end
    if (errors.length > 0) {
      const combinedErrors = errors.join(`\n\n${'='.repeat(80)}\n\n`);
      console.error(combinedErrors);
      return { exitCode: 2 };
    }

    return { exitCode: 0 };
  }

  private loadConfig(): LintProjectConfig {
    return getHookConfig<LintProjectConfig>('lint-project') || {};
  }

  private async runBiome(
    projectRoot: string,
    packageManager: { exec: string },
    config: LintProjectConfig
  ): Promise<ExecResult> {
    const biomeCommand = config.command ?? `${packageManager.exec} biome`;
    const biomeArgs = ['check', '.'];

    return await this.execCommand(biomeCommand, biomeArgs, {
      cwd: projectRoot,
      timeout: config.timeout ?? 60000,
    });
  }

  private async runEslint(
    projectRoot: string,
    packageManager: { exec: string }
  ): Promise<ExecResult> {
    const config = this.loadConfig();
    const eslintCommand = config.command ?? `${packageManager.exec} eslint . --ext .js,.jsx,.ts,.tsx`;

    return await this.execCommand(eslintCommand, [], {
      cwd: projectRoot,
      timeout: config.timeout ?? 60000,
    });
  }

}
