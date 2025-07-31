import { BaseHook, HookContext, HookResult } from './base.js';
import { checkToolAvailable } from './utils.js';

export class ProjectValidationHook extends BaseHook {
  name = 'project-validation';
  
  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot, packageManager } = context;
    
    this.progress('Running project-wide validation...');
    
    let hasFailures = false;
    let validationOutput = '';
    
    // Run TypeScript check if available
    if (await checkToolAvailable('tsc', 'tsconfig.json', projectRoot)) {
      validationOutput += '📘 Running TypeScript validation...\n';
      const tsCommand = this.config['typescriptCommand'] || packageManager.exec + ' tsc --noEmit';
      const tsResult = await this.execCommand(tsCommand, [], { cwd: projectRoot });
      
      if (tsResult.exitCode === 0) {
        validationOutput += '✅ TypeScript validation passed\n\n';
      } else {
        hasFailures = true;
        validationOutput += '❌ TypeScript validation failed:\n';
        validationOutput += this.indent(tsResult.stderr || tsResult.stdout) + '\n\n';
      }
    }
    
    // Run ESLint if available
    if (await checkToolAvailable('eslint', '.eslintrc.json', projectRoot)) {
      validationOutput += '🔍 Running ESLint validation...\n';
      const eslintCommand = this.config['eslintCommand'] || packageManager.exec + ' eslint . --ext .js,.jsx,.ts,.tsx';
      const eslintResult = await this.execCommand(eslintCommand, [], { cwd: projectRoot });
      
      if (eslintResult.exitCode === 0 && !eslintResult.stdout.includes('error')) {
        validationOutput += '✅ ESLint validation passed\n\n';
      } else {
        hasFailures = true;
        validationOutput += '❌ ESLint validation failed:\n';
        validationOutput += this.indent(eslintResult.stdout) + '\n\n';
      }
    }
    
    // Run tests if available
    const { stdout: pkgJson } = await this.execCommand('cat', ['package.json'], { cwd: projectRoot });
    if (pkgJson.includes('"test"')) {
      validationOutput += '🧪 Running test suite...\n';
      const testCommand = this.config['testCommand'] || packageManager.test;
      const testResult = await this.execCommand(testCommand, [], { cwd: projectRoot });
      
      if (testResult.exitCode === 0 && !testResult.stdout.match(/FAIL|failed|Error:|failing/)) {
        validationOutput += '✅ Test suite passed\n\n';
      } else {
        hasFailures = true;
        validationOutput += '❌ Test suite failed:\n';
        validationOutput += this.indent(testResult.stdout + testResult.stderr) + '\n\n';
      }
    }
    
    // Output results
    if (hasFailures) {
      // Build list of failed checks
      const failedChecks: string[] = [];
      if (validationOutput.includes('❌ TypeScript validation failed')) {
        failedChecks.push('Type checking command');
      }
      if (validationOutput.includes('❌ ESLint validation failed')) {
        failedChecks.push('Lint command');
      }
      if (validationOutput.includes('❌ Test suite failed')) {
        failedChecks.push('Test command');
      }
      
      const header = '████ Project Validation Failed ████\n\n';
      const message = 'Your implementation has validation errors that must be fixed:\n\n';
      const actions = '\n\nREQUIRED ACTIONS:\n' +
        '1. Fix all errors shown above\n' +
        '2. Run the failed validation commands to verify fixes:\n' +
        failedChecks.map(check => '   - ' + check).join('\n') + '\n' +
        '   (Check AGENT.md/CLAUDE.md or package.json scripts for exact commands)\n' +
        '3. Make necessary corrections\n' +
        '4. The validation will run again automatically';
      
      console.error(header + message + validationOutput + actions);
      
      return { exitCode: 2 };
    }
    
    this.success('All validations passed! Great work!');
    return { exitCode: 0 };
  }
  
  private indent(text: string, spaces: number = 2): string {
    return text.split('\n').map(line => ' '.repeat(spaces) + line).join('\n');
  }
}