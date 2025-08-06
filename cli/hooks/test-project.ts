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
    
    const testCommand = (this.config['testCommand'] as string) 
      || packageManager.test;
    
    const result = await this.execCommand(testCommand, [], { cwd: projectRoot });
    
    if (result.exitCode === 0) {
      this.success('All tests passed!');
      return { exitCode: 0 };
    }
    
    // Format test failure output
    const errorOutput = formatTestErrors(result);
    console.error(errorOutput);
    return { exitCode: 2 };
  }
}