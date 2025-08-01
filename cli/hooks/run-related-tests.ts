import * as path from 'path';
import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class RunRelatedTestsHook extends BaseHook {
  name = 'run-related-tests';

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;

    // Skip if no file path
    if (filePath === undefined || filePath === '') {
      return { exitCode: 0 };
    }

    // Only run tests for source files
    if (!filePath.match(/\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0 };
    }

    // Skip test files themselves
    if (filePath.match(/\.(test|spec)\.(js|jsx|ts|tsx)$/)) {
      return { exitCode: 0 };
    }

    this.progress(`🧪 Running tests related to: ${filePath}...`);

    // Find related test files
    const testFiles = await this.findRelatedTestFiles(filePath);

    if (testFiles.length === 0) {
      this.warning(`No test files found for ${path.basename(filePath)}`);
      const baseName = path.basename(filePath, path.extname(filePath));
      const dirName = path.dirname(filePath);
      const ext = path.extname(filePath);
      this.warning(`Consider creating tests in: ${dirName}/${baseName}.test${ext}`);
      return { exitCode: 0 };
    }

    this.progress(`Found related test files: ${testFiles.join(', ')}`);

    // Run tests
    const testCommand = this.config.command ?? packageManager.test;
    const result = await this.execCommand(testCommand, ['--', ...testFiles], {
      cwd: projectRoot,
    });

    if (result.exitCode !== 0) {
      this.error(`Tests failed for ${filePath}`, result.stdout + result.stderr, [
        'You MUST fix ALL test failures, regardless of whether they seem related to your recent changes',
        "First, examine the failing test output above to understand what's broken",
        `Run the failing tests individually for detailed output: ${testCommand} -- ${testFiles.join(
          ' '
        )}`,
        `Then run ALL tests to ensure nothing else is broken: ${testCommand}`,
        'Fix ALL failing tests by:',
        '  - Reading each test to understand its purpose',
        '  - Determining if the test or the implementation is wrong',
        '  - Updating whichever needs to change to match expected behavior',
        '  - NEVER skip, comment out, or use .skip() to bypass tests',
        'Common fixes to consider:',
        '  - Update mock data to match new types/interfaces',
        '  - Fix async timing issues with proper await/waitFor',
        '  - Update component props in tests to match changes',
        '  - Ensure test database/state is properly reset',
        '  - Check if API contracts have changed',
      ]);
      return { exitCode: 2 };
    }

    this.success('All related tests passed!');
    return { exitCode: 0 };
  }

  private async findRelatedTestFiles(filePath: string): Promise<string[]> {
    const baseName = path.basename(filePath, path.extname(filePath));
    const dirName = path.dirname(filePath);
    const ext = path.extname(filePath);

    // Common test file patterns
    const testPatterns = [
      `${dirName}/${baseName}.test${ext}`,
      `${dirName}/${baseName}.spec${ext}`,
      `${dirName}/__tests__/${baseName}.test${ext}`,
      `${dirName}/__tests__/${baseName}.spec${ext}`,
    ];

    const foundFiles: string[] = [];
    for (const pattern of testPatterns) {
      if (await this.fileExists(pattern)) {
        foundFiles.push(pattern);
      }
    }

    return foundFiles;
  }
}
