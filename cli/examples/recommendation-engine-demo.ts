#!/usr/bin/env node

/**
 * Recommendation Engine Demo
 *
 * Demonstrates how the ClaudeKit recommendation engine analyzes projects
 * and suggests appropriate components based on detected tools and frameworks.
 */

import chalk from 'chalk';
import ora from 'ora';
import {
  detectProjectContext,
  discoverComponents,
  recommendComponents,
  formatRecommendationSummary,
} from '../lib/index.js';

async function main() {
  console.log(chalk.bold.blue('\n🚀 ClaudeKit Recommendation Engine Demo\n'));

  // Get project path from command line or use current directory
  const projectPath = process.argv[2] || process.cwd();

  const spinner = ora('Analyzing project...').start();

  try {
    // Step 1: Detect project context
    spinner.text = 'Detecting project characteristics...';
    const projectInfo = await detectProjectContext(projectPath);

    // Step 2: Discover available components
    spinner.text = 'Discovering available components...';
    // Look for components in the claudekit source directory
    let claudekitRoot = projectPath;
    while (claudekitRoot !== '/' && !claudekitRoot.endsWith('/claudekit')) {
      claudekitRoot = claudekitRoot.substring(0, claudekitRoot.lastIndexOf('/'));
    }
    if (!claudekitRoot.endsWith('/claudekit')) {
      claudekitRoot = process.cwd();
    }
    const srcPath = `${claudekitRoot}/src`;
    console.log(chalk.dim(`  Looking for components in: ${srcPath}`));
    const registry = await discoverComponents(srcPath);

    // Step 3: Generate recommendations
    spinner.text = 'Generating recommendations...';
    const recommendations = await recommendComponents(projectInfo, registry);

    spinner.succeed('Analysis complete!');

    // Display project information
    console.log(chalk.bold('\n📁 Project Information:'));
    console.log(`  Path: ${chalk.cyan(projectInfo.projectPath)}`);
    if (projectInfo.projectName) {
      console.log(`  Name: ${chalk.cyan(projectInfo.projectName)}`);
    }
    if (projectInfo.projectVersion) {
      console.log(`  Version: ${chalk.cyan(projectInfo.projectVersion)}`);
    }

    console.log(chalk.bold('\n🔍 Detected Technologies:'));
    if (projectInfo.hasTypeScript) {
      console.log(`  ${chalk.green('✓')} TypeScript`);
    }
    if (projectInfo.hasESLint) {
      console.log(`  ${chalk.green('✓')} ESLint`);
    }
    if (projectInfo.hasPrettier) {
      console.log(`  ${chalk.green('✓')} Prettier`);
    }
    if (projectInfo.hasJest) {
      console.log(`  ${chalk.green('✓')} Jest`);
    }
    if (projectInfo.hasVitest) {
      console.log(`  ${chalk.green('✓')} Vitest`);
    }
    if (projectInfo.isGitRepository) {
      console.log(`  ${chalk.green('✓')} Git Repository`);
    }
    if (projectInfo.packageManager) {
      console.log(`  ${chalk.green('✓')} Package Manager: ${projectInfo.packageManager}`);
    }
    if (projectInfo.frameworks?.length) {
      console.log(`  ${chalk.green('✓')} Frameworks: ${projectInfo.frameworks.join(', ')}`);
    }

    // Display recommendations
    console.log(chalk.bold('\n📋 Component Recommendations:\n'));
    console.log(formatRecommendationSummary(recommendations));

    // Summary statistics
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(`  Essential: ${chalk.green(recommendations.essential.length)} components`);
    console.log(`  Recommended: ${chalk.yellow(recommendations.recommended.length)} components`);
    console.log(`  Optional: ${chalk.blue(recommendations.optional.length)} components`);
    console.log(`  Total Score: ${chalk.magenta(recommendations.totalScore)}`);

    // Installation hint
    if (recommendations.essential.length > 0) {
      console.log(
        chalk.dim('\n💡 Tip: Run "claudekit init" to initialize with these recommendations')
      );
    }
  } catch (error) {
    spinner.fail('Analysis failed');
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);
