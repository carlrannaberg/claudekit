import * as path from 'node:path';
import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import { shouldProcessFileByExtension, createExtensionPattern, type ExtensionConfigurable } from './utils.js';

interface TestChangedConfig extends ExtensionConfigurable {
  command?: string | undefined;
  timeout?: number | undefined;
}

export class TestChangedHook extends BaseHook {
  name = 'test-changed';

  private loadConfig(): TestChangedConfig {
    return getHookConfig<TestChangedConfig>('test-changed') ?? {};
  }

  static metadata = {
    id: 'test-changed',
    displayName: 'Run Related Tests',
    description: 'Run tests for changed files',
    category: 'testing' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;
    const config = this.loadConfig();

    // Check if file should be processed based on extensions
    if (!shouldProcessFileByExtension(filePath, config)) {
      return { exitCode: 0 };
    }

    // filePath is guaranteed to be defined here due to shouldProcessFileByExtension check
    const validFilePath = filePath as string;

    // Skip test files themselves using the same extensions pattern
    const allowedExtensions = config.extensions || ['js', 'jsx', 'ts', 'tsx'];
    const testPattern = createExtensionPattern(allowedExtensions.map(ext => `test.${ext}`).concat(allowedExtensions.map(ext => `spec.${ext}`)));
    if (testPattern.test(validFilePath)) {
      return { exitCode: 0 };
    }

    this.progress(`🧪 Running tests related to: ${validFilePath}...`);

    // Find related test files
    const testFiles = await this.findRelatedTestFiles(validFilePath);

    if (testFiles.length === 0) {
      this.warning(`No test files found for ${path.basename(validFilePath)}`);
      const baseName = path.basename(validFilePath, path.extname(validFilePath));
      const dirName = path.dirname(validFilePath);
      const ext = path.extname(validFilePath);
      this.warning(`Consider creating tests in: ${dirName}/${baseName}.test${ext}`);
      return { exitCode: 0 };
    }

    this.progress(`Found related test files: ${testFiles.join(', ')}`);

    // Run tests
    const testCommand = config.command ?? packageManager.test;
    const result = await this.execCommand(testCommand, ['--', ...testFiles], {
      cwd: projectRoot,
    });

    if (result.exitCode !== 0) {
      this.error(`Tests failed for ${validFilePath}`, result.stdout + result.stderr, [
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
