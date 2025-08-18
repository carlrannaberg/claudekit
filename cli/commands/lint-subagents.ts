import { lintSubagentFile, hasFrontmatter } from '../lib/linters/subagents.js';
import { glob } from 'glob';
import chalk from 'chalk';
import * as path from 'path';
import { promises as fs } from 'fs';

interface LintSubagentsOptions {
  root?: string;
  quiet?: boolean;
  verbose?: boolean;
}

/**
 * CLI command to lint subagent markdown files
 */
export async function lintSubagents(options: LintSubagentsOptions): Promise<void> {
  const root = options.root ?? process.cwd();
  const pattern = path.join(root, '**/*.md');

  if (options.quiet !== true) {
    console.log(chalk.bold('\n🔍 Subagent Linter\n'));
    console.log(chalk.gray(`Directory: ${root}`));
  }

  // Find all matching files
  const files = await glob(pattern);

  // Filter to only files with frontmatter
  const agentFiles: string[] = [];
  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (hasFrontmatter(content)) {
        agentFiles.push(file);
      }
    } catch {
      // Skip files that can't be read
    }
  }

  if (agentFiles.length === 0) {
    console.log(chalk.yellow('No subagent files found (markdown files with frontmatter)'));
    return;
  }

  if (options.quiet !== true) {
    console.log(chalk.gray(`Found ${agentFiles.length} subagent files to lint\n`));
  }

  let totalErrors = 0;
  let totalWarnings = 0;
  let totalUnusedFields = 0;
  const allUnusedFields = new Set<string>();

  for (const file of agentFiles) {
    const relativePath = path.relative(root, file);

    const result = await lintSubagentFile(file);

    // Skip files that were valid and had no issues
    if (
      result.valid === true &&
      result.warnings.length === 0 &&
      result.unusedFields.length === 0 &&
      result.suggestions.length === 0
    ) {
      if (options.quiet !== true && options.verbose === true) {
        console.log(chalk.bold(`\n${relativePath}:`));
        console.log(chalk.green('  ✓ Valid'));
      }
      continue;
    }

    // Show file with issues
    console.log(chalk.bold(`\n${relativePath}:`));

    // Show errors
    for (const error of result.errors) {
      console.log(chalk.red(`  ✗ ${error}`));
      totalErrors++;
    }

    // Show warnings
    for (const warning of result.warnings) {
      console.log(chalk.yellow(`  ⚠ ${warning}`));
      totalWarnings++;
    }

    // Show unused fields
    if (result.unusedFields.length > 0) {
      console.log(chalk.yellow(`  ⚠ Unused fields: ${result.unusedFields.join(', ')}`));
      totalUnusedFields += result.unusedFields.length;
      result.unusedFields.forEach((field: string) => allUnusedFields.add(field));
    }

    // Show suggestions
    if (options.quiet !== true) {
      for (const suggestion of result.suggestions) {
        console.log(chalk.gray(`  💡 ${suggestion}`));
      }
    }
  }

  // Count total suggestions
  let totalSuggestions = 0;
  for (const file of agentFiles) {
    const result = await lintSubagentFile(file);
    totalSuggestions += result.suggestions.length;
  }

  // Summary
  console.log(chalk.bold('\n📊 Summary:\n'));
  console.log(`  Files checked: ${agentFiles.length}`);
  console.log(`  Errors: ${totalErrors > 0 ? chalk.red(String(totalErrors)) : chalk.green('0')}`);
  console.log(
    `  Warnings: ${totalWarnings > 0 ? chalk.yellow(String(totalWarnings)) : chalk.green('0')}`
  );
  console.log(
    `  Suggestions: ${totalSuggestions > 0 ? chalk.cyan(String(totalSuggestions)) : chalk.green('0')}`
  );
  console.log(
    `  Unused fields: ${totalUnusedFields > 0 ? chalk.yellow(String(totalUnusedFields)) : chalk.green('0')}`
  );

  if (allUnusedFields.size > 0) {
    console.log(chalk.yellow('\n  All unused fields found:'));
    for (const field of Array.from(allUnusedFields).sort()) {
      console.log(chalk.gray(`    - ${field}`));
    }
  }

  if (totalErrors > 0 || totalWarnings > 0 || totalUnusedFields > 0) {
    console.log(chalk.cyan('\n💡 Review the issues above and fix them manually'));
    throw new Error('Linting failed with errors or warnings');
  } else if (options.quiet !== true) {
    if (totalSuggestions > 0) {
      console.log(chalk.cyan('\n✨ All files are valid! (with suggestions for improvements)'));
    } else {
      console.log(chalk.green('\n✨ All subagent files are valid!'));
    }
  }
}
