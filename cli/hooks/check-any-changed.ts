import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class CheckAnyChangedHook extends BaseHook {
  name = 'check-any-changed';

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath } = context;

    // Skip if no file or wrong extension
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }

    this.progress(`🚫 Checking for 'any' types in ${filePath}`);

    if (filePath === undefined) {
      return { exitCode: 0 };
    }
    const content = await this.readFile(filePath);
    const lines = content.split('\n');
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === undefined || line === '') {
        continue;
      } // Handle undefined from noUncheckedIndexedAccess

      const lineNum = i + 1;

      // Skip comments and test utilities
      if (
        line.trim().startsWith('//') ||
        line.trim().startsWith('*') ||
        line.includes('expect.any(') ||
        line.includes('.any(')
      ) {
        continue;
      }

      // Check for forbidden 'any' patterns
      const anyPattern = /:\s*any\b|:\s*any\[\]|<any>|as\s+any\b|=\s*any\b/;
      if (anyPattern.test(line)) {
        errors.push(`Line ${lineNum}: ${line.trim()}`);
      }
    }

    if (errors.length > 0) {
      const errorCount = errors.length;
      const plural = errorCount > 1 ? 's' : '';
      this.error(
        "Forbidden 'any' types detected",
        `❌ File contains ${errorCount} forbidden 'any' type${plural}:\n\n${errors.join('\n')}`,
        [
          "Replace ALL 'any' types with proper types",
          "Use specific interfaces, union types, or generics instead of 'any'",
          'Examples of fixes:',
          '  - Instead of: data: any → Define: interface Data { ... }',
          '  - Instead of: items: any[] → Use: items: Item[] or items: Array<{id: string, name: string}>',
          '  - Instead of: value: any → Use: value: string | number | boolean',
          '  - Instead of: response: any → Use: response: unknown (then add type guards)',
        ]
      );
      return { exitCode: 2 };
    }

    this.success("No forbidden 'any' types found!");
    return { exitCode: 0 };
  }
}
