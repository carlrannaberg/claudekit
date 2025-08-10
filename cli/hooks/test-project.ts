/**
 * Test Project Hook
 * Runs the full test suite for the project
 */

import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { formatTestErrors } from './utils.js';

export class TestProjectHook extends BaseHook {
  name = 'test-project';

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;

    // Check if test script exists
    const { stdout: pkgJson } = await this.execCommand('cat', ['package.json'], {
      cwd: projectRoot,
    });

    if (!pkgJson.includes('"test"')) {
      return { exitCode: 0 }; // Skip if no test script
    }

    this.progress('Running project test suite...');

    const testCommand = (this.config['testCommand'] as string) || packageManager.test;

    // Use a timeout just under Claude Code's 60s limit
    const result = await this.execCommand(testCommand, [], {
      cwd: projectRoot,
      timeout: 55000, // 55 seconds (under Claude Code's 60s limit)
    });

    if (result.exitCode === 0) {
      this.success('All tests passed!');
      return { exitCode: 0 };
    }

    // Robust timeout handling: rely on exec metadata instead of output heuristics
    if (result.timedOut === true) {
      console.error('████ Test Suite Timeout ████\n');
      const durationText = result.durationMs !== undefined ? ` after ${result.durationMs}ms` : '';
      console.error(
        `The test suite was terminated${durationText} due to the hook timeout limit.\n`
      );

      const customCommand = this.config['testCommand'] as string;
      if (customCommand) {
        console.error(`Current command: ${customCommand}\n`);
        console.error('RECOMMENDED ACTIONS:');
        console.error('1. Use a faster test command in .claudekit/config.json:');
        console.error('   Example: "testCommand": "npm run test:unit"  (skip integration tests)\n');
      } else {
        console.error(`Current command: ${packageManager.test}\n`);
        console.error('RECOMMENDED ACTIONS:');
        console.error('1. Configure a faster test command in .claudekit/config.json:\n');
        console.error('   {');
        console.error('     "hooks": {');
        console.error('       "test-project": {');
        console.error('         "testCommand": "npm run test:fast"');
        console.error('       }');
        console.error('     }');
        console.error('   }\n');
      }

      console.error('2. Disable test-project hook in .claude/settings.json');
      console.error('3. Increase the timeout if supported by your environment');
      console.error('4. Run tests manually when needed: npm test');
      return { exitCode: 0 }; // Don't block on timeout
    }

    // Format test failure output
    const errorOutput = formatTestErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }
}
