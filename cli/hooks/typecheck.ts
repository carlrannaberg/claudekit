import { BaseHook, HookContext, HookResult } from './base.js';
import { checkToolAvailable } from './utils.js';

export class TypecheckHook extends BaseHook {
  name = 'typecheck';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;
    
    // Skip if no file or wrong extension
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }
    
    // Check if TypeScript is available
    if (!await checkToolAvailable('tsc', 'tsconfig.json', projectRoot)) {
      this.warning('No TypeScript configuration found, skipping check');
      return { exitCode: 0 };
    }
    
    this.progress('📘 Type-checking ' + filePath);
    
    // Run TypeScript compiler
    const command = this.config.command || packageManager.exec + ' tsc --noEmit';
    const result = await this.execCommand(command, [], {
      cwd: projectRoot
    });
    
    if (result.exitCode !== 0) {
      this.error(
        'TypeScript compilation failed',
        result.stderr || result.stdout,
        [
          'Fix ALL TypeScript errors shown above',
          'Run the project\'s type check command to verify all errors are resolved',
          '(Check AGENT.md/CLAUDE.md or package.json scripts for the exact command)'
        ]
      );
      return { exitCode: 2 };
    }
    
    this.success('TypeScript check passed!');
    return { exitCode: 0 };
  }
}