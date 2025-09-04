import { getHookConfig } from '../utils/claudekit-config.js';
import { detectBiome, detectESLint } from '../lib/project-detection.js';
import { checkToolAvailable, formatBiomeErrors, formatESLintErrors } from './utils.js';
import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import type { ExecResult, PackageManager } from './utils.js';

interface LintChangedConfig {
  command?: string | undefined;
  extensions?: string[] | undefined;
  fix?: boolean | undefined;
  timeout?: number | undefined;
}

export class LintChangedHook extends BaseHook {
  name = 'lint-changed';

  static metadata = {
    id: 'lint-changed',
    displayName: 'Lint Validation (Changed Files)',
    description: 'Run linting validation on changed files (Biome, ESLint, etc)',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['linter'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;

    // Skip if no file path or not JavaScript/TypeScript file
    if (filePath === undefined || filePath === '' || !filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0 };
    }

    const results: Array<{ tool: string; result: ExecResult }> = [];
    const errors: string[] = [];

    // Run Biome if configured
    if ((await detectBiome(projectRoot)) === true) {
      if (await checkToolAvailable('biome', 'biome.json', projectRoot)) {
        this.progress(`🔍 Running Biome on ${filePath}...`);
        const biomeResult = await this.runBiome(filePath, projectRoot, packageManager);
        results.push({ tool: 'Biome', result: biomeResult });
        
        if (biomeResult.exitCode === 0) {
          this.success('Biome check passed!');
        } else {
          const errorMessage = formatBiomeErrors(biomeResult);
          errors.push(`Biome check failed:\n${errorMessage}`);
        }
      }
    }

    // Run ESLint if configured
    if ((await detectESLint(projectRoot)) === true) {
      if (await checkToolAvailable('eslint', '.eslintrc.json', projectRoot)) {
        this.progress(`🔍 Running ESLint on ${filePath}...`);
        const eslintResult = await this.runEslint(filePath, projectRoot, packageManager);
        results.push({ tool: 'ESLint', result: eslintResult });
        
        if (eslintResult.exitCode === 0 && !this.hasEslintErrors(eslintResult.stdout)) {
          this.success('ESLint check passed!');
        } else {
          const errorMessage = formatESLintErrors(eslintResult);
          errors.push(`ESLint check failed:\n${errorMessage}`);
        }
      }
    }

    // If no linters configured, skip
    if (results.length === 0) {
      this.progress('No linters configured, skipping lint check');
      return { exitCode: 0 };
    }

    // Report all errors at the end
    if (errors.length > 0) {
      const combinedErrors = errors.join(`\n\n${'='.repeat(80)}\n\n`);
      this.error('Linting failed', combinedErrors, []);
      return { exitCode: 2 };
    }

    return { exitCode: 0 };
  }

  private loadConfig(): LintChangedConfig {
    return getHookConfig<LintChangedConfig>('lint-changed') || {};
  }


  private async runBiome(
    filePath: string,
    projectRoot: string,
    packageManager: PackageManager
  ): Promise<ExecResult> {
    const config = this.loadConfig();
    const biomeCommand = config.command ?? `${packageManager.exec} biome`;

    // Build Biome arguments
    const biomeArgs = ['check', `"${filePath}"`];

    // Add fix flag if configured
    if (config.fix === true) {
      biomeArgs.push('--write');
    }

    return await this.execCommand(biomeCommand, biomeArgs, {
      cwd: projectRoot,
      timeout: config.timeout ?? 30000,
    });
  }

  private async runEslint(
    filePath: string,
    projectRoot: string,
    packageManager: PackageManager
  ): Promise<ExecResult> {
    const config = this.loadConfig();
    const eslintCommand = config.command ?? `${packageManager.exec} eslint`;

    // Build ESLint arguments
    const eslintArgs: string[] = [];

    // Add file extensions if configured
    if (config.extensions !== undefined) {
      eslintArgs.push('--ext', config.extensions.join(','));
    }

    // Add fix flag if configured
    if (config.fix === true) {
      eslintArgs.push('--fix');
    }

    // Add the file path
    eslintArgs.push(`"${filePath}"`);

    return await this.execCommand(eslintCommand, eslintArgs, {
      cwd: projectRoot,
      timeout: config.timeout ?? 30000,
    });
  }

  private hasEslintErrors(output: string): boolean {
    return output.includes('error') || output.includes('warning');
  }


}
