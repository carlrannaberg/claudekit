import * as path from 'path';
import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import type { ExecResult, PackageManager } from './utils.js';

export class LintChangedHook extends BaseHook {
  name = 'lint-changed';

  static metadata = {
    id: 'lint-changed',
    displayName: 'ESLint Validation (Changed Files)',
    description: 'Run ESLint validation on changed files',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['eslint'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;

    // Skip if no file path or not JavaScript/TypeScript file
    if (filePath === undefined || filePath === '' || !filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0 };
    }

    // Check if ESLint is configured
    if (!(await this.hasEslint(projectRoot))) {
      this.progress('ESLint not configured, skipping lint check');
      return { exitCode: 0 };
    }

    this.progress(`🔍 Running ESLint on ${filePath}...`);

    // Run ESLint
    const eslintResult = await this.runEslint(filePath, projectRoot, packageManager);
    if (eslintResult.exitCode !== 0 || this.hasEslintErrors(eslintResult.stdout)) {
      const errorMessage = this.formatEslintErrors(eslintResult.stdout || eslintResult.stderr);
      this.error('ESLint check failed', errorMessage, []);
      return { exitCode: 2 };
    }

    this.success('ESLint check passed!');
    return { exitCode: 0 };
  }

  private async hasEslint(projectRoot: string): Promise<boolean> {
    // Check for ESLint config files
    const configFiles = [
      '.eslintrc.json',
      '.eslintrc.js',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'eslint.config.js',
      'eslint.config.mjs',
    ];

    for (const configFile of configFiles) {
      if (await this.fileExists(path.join(projectRoot, configFile))) {
        return true;
      }
    }

    return false;
  }

  private async runEslint(
    filePath: string,
    projectRoot: string,
    packageManager: PackageManager
  ): Promise<ExecResult> {
    const eslintCommand = this.config.command ?? `${packageManager.exec} eslint`;

    // Build ESLint arguments
    const eslintArgs: string[] = [];

    // Add file extensions if configured
    const extensions = this.config['extensions'];
    if (extensions !== undefined && extensions !== null) {
      eslintArgs.push('--ext', (extensions as string[]).join(','));
    }

    // Add fix flag if configured
    if (this.config['fix'] === true) {
      eslintArgs.push('--fix');
    }

    // Add the file path
    eslintArgs.push(`"${filePath}"`);

    return await this.execCommand(eslintCommand, eslintArgs, {
      cwd: projectRoot,
      timeout: (this.config.timeout as number) || 30000,
    });
  }

  private hasEslintErrors(output: string): boolean {
    return output.includes('error') || output.includes('warning');
  }

  private formatEslintErrors(output: string): string {
    const instructions = [
      'You MUST fix ALL lint errors and warnings shown above.',
      '',
      'REQUIRED ACTIONS:',
      '1. Fix all errors shown above',
      "2. Run the project's lint command to verify all issues are resolved",
      '   (Check AGENT.md/CLAUDE.md or package.json scripts for the exact command)',
      '3. Common fixes:',
      '   - Missing semicolons or trailing commas',
      '   - Unused variables (remove or use them)',
      '   - Console.log statements (remove from production code)',
      '   - Improper indentation or spacing',
    ];

    return `${output}\n\nMANDATORY INSTRUCTIONS:\n${instructions.join('\n')}`;
  }
}
