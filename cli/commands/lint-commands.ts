import CClint from '@carlrannaberg/cclint';
import chalk from 'chalk';
import * as path from 'node:path';

interface LintCommandsOptions {
  root?: string;
  quiet?: boolean;
  verbose?: boolean;
}

/**
 * CLI command to lint slash command markdown files
 */
export async function lintCommands(options: LintCommandsOptions): Promise<void> {
  const root = options.root ?? process.cwd();

  if (options.quiet !== true) {
    console.log(chalk.bold('\n🔍 Slash Command Linter\n'));
    console.log(chalk.gray(`Directory: ${root}`));
  }

  const linter = new CClint();
  // Use lintCommands with followSymlinks option
  const results = await linter.lintCommands(root, { followSymlinks: true });

  if (results.length === 0) {
    console.log(chalk.yellow('No command files found (markdown files with frontmatter)'));
    return;
  }

  if (options.quiet !== true) {
    console.log(chalk.gray(`Found ${results.length} command files to lint\n`));
  }

  // Process each file result
  const allUnusedFields = new Set<string>();
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalUnusedFields = 0;
  let totalSuggestions = 0;
  
  for (const fileResult of results) {
    const relativePath = path.relative(root, fileResult.file);

    // Count totals
    totalErrors += fileResult.errors.length;
    totalWarnings += fileResult.warnings.length;
    totalSuggestions += fileResult.suggestions.length;
    
    // Handle unusedFields if it exists (may be optional in SDK)
    // Check if unusedFields property exists on the result
    const hasUnusedFields = 'unusedFields' in fileResult && Array.isArray((fileResult as Record<string, unknown>)['unusedFields']);
    const unusedFields: string[] = hasUnusedFields ? (fileResult as { unusedFields: string[] }).unusedFields : [];
    totalUnusedFields += unusedFields.length;

    // Skip files that were valid and had no issues
    if (
      fileResult.errors.length === 0 &&
      fileResult.warnings.length === 0 &&
      unusedFields.length === 0 &&
      fileResult.suggestions.length === 0
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
    for (const error of fileResult.errors) {
      console.log(chalk.red(`  ✗ ${error}`));
    }

    // Show warnings
    for (const warning of fileResult.warnings) {
      console.log(chalk.yellow(`  ⚠ ${warning}`));
    }

    // Show unused fields
    if (unusedFields.length > 0) {
      console.log(chalk.yellow(`  ⚠ Unused fields: ${unusedFields.join(', ')}`));
      unusedFields.forEach((field: string) => allUnusedFields.add(field));
    }

    // Show suggestions
    if (options.quiet !== true) {
      for (const suggestion of fileResult.suggestions) {
        console.log(chalk.gray(`  💡 ${suggestion}`));
      }
    }
  }

  // Summary
  console.log(chalk.bold('\n📊 Summary:\n'));
  console.log(`  Files checked: ${results.length}`);
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
    if (allUnusedFields.has('category')) {
      console.log(
        chalk.cyan('\n  Note: "category" is a claudekit-specific field for organizing commands')
      );
    }
  }

  if (totalErrors > 0 || totalWarnings > 0 || totalUnusedFields > 0) {
    console.log(chalk.cyan('\n💡 Review the issues above and fix them manually'));
    throw new Error('Linting failed with errors or warnings');
  } else if (options.quiet !== true) {
    if (totalSuggestions > 0) {
      console.log(chalk.cyan('\n✨ All files are valid! (with suggestions for improvements)'));
    } else {
      console.log(chalk.green('\n✨ All command files are valid!'));
    }
  }
}
