#!/usr/bin/env node

/**
 * Example usage of the Project Detection System
 *
 * Demonstrates how to use the project detection functions
 * to gather project context for smart component recommendations.
 */

import { detectProjectContext, resolveProjectPath } from '../lib/project-detection.js';
import { Logger } from '../utils/logger.js';
import type { ProjectInfo } from '../types/index.js';

const logger = new Logger('ProjectDetection');

async function demonstrateProjectDetection(): Promise<void> {
  logger.info('Project Detection System Demo');
  logger.info('================================\n');

  try {
    // Detect project context from command line argument or current directory
    const targetPath = process.argv[2] ?? process.cwd();
    const currentProjectPath = resolveProjectPath(targetPath);
    logger.info(`Analyzing project: ${currentProjectPath}`);

    const projectInfo = await detectProjectContext(currentProjectPath);

    // Display comprehensive project information
    logger.info('\n📊 Project Analysis Results:');
    logger.info(`Project Path: ${projectInfo.projectPath}`);

    if (projectInfo.projectName !== undefined && projectInfo.projectName !== '') {
      logger.info(`Project Name: ${projectInfo.projectName}`);
    }

    if (projectInfo.projectVersion !== undefined && projectInfo.projectVersion !== '') {
      logger.info(`Project Version: ${projectInfo.projectVersion}`);
    }

    // Language and tooling detection
    logger.info('\n🔧 Development Tools:');
    logger.info(`TypeScript: ${projectInfo.hasTypeScript === true ? '✅' : '❌'}`);
    logger.info(`ESLint: ${projectInfo.hasESLint === true ? '✅' : '❌'}`);
    logger.info(`Prettier: ${projectInfo.hasPrettier === true ? '✅' : '❌'}`);

    // Testing frameworks
    logger.info('\n🧪 Testing Frameworks:');
    logger.info(`Jest: ${projectInfo.hasJest === true ? '✅' : '❌'}`);
    logger.info(`Vitest: ${projectInfo.hasVitest === true ? '✅' : '❌'}`);

    // Package manager
    logger.info('\n📦 Package Manager:');
    if (projectInfo.packageManager !== null && projectInfo.packageManager !== undefined) {
      logger.info(`Package Manager: ${projectInfo.packageManager}`);
    } else {
      logger.info('Package Manager: Not detected');
    }

    // Repository information
    logger.info('\n📂 Repository:');
    logger.info(`Git Repository: ${projectInfo.isGitRepository === true ? '✅' : '❌'}`);
    logger.info(`Claude Config: ${projectInfo.hasClaudeConfig === true ? '✅' : '❌'}`);

    // Runtime environment
    logger.info('\n🚀 Environment:');
    if (projectInfo.nodeVersion !== undefined && projectInfo.nodeVersion !== '') {
      logger.info(`Node.js: v${projectInfo.nodeVersion}`);
    }
    logger.info(`Environment: ${projectInfo.environment}`);

    // Frameworks and libraries
    if (projectInfo.frameworks !== undefined && projectInfo.frameworks.length > 0) {
      logger.info('\n🎯 Frameworks & Libraries:');
      projectInfo.frameworks.forEach((framework) => {
        logger.info(`  • ${framework}`);
      });
    }

    // Smart recommendations based on project context
    logger.info('\n💡 Smart Component Recommendations:');
    const recommendations = generateRecommendations(projectInfo);
    if (recommendations.length > 0) {
      recommendations.forEach((rec) => {
        logger.info(`  • ${rec}`);
      });
    } else {
      logger.info('  No specific recommendations for this project type');
    }
  } catch (error) {
    logger.error(
      `Failed to analyze project: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

/**
 * Generate smart component recommendations based on project context
 */
function generateRecommendations(projectInfo: ProjectInfo): string[] {
  const recommendations: string[] = [];

  // TypeScript-specific recommendations
  if (projectInfo.hasTypeScript === true) {
    recommendations.push('TypeScript validation hook for type checking');
    recommendations.push('Auto-format TypeScript files on save');
  }

  // ESLint recommendations
  if (projectInfo.hasESLint === true) {
    recommendations.push('ESLint validation hook for code quality');
    recommendations.push('Auto-fix ESLint issues on save');
  }

  // Testing framework recommendations
  if (projectInfo.hasJest === true || projectInfo.hasVitest === true) {
    recommendations.push('Auto-run related tests after file changes');
    recommendations.push('Test coverage validation hook');
  }

  // Git repository recommendations
  if (projectInfo.isGitRepository === true) {
    recommendations.push('Auto-commit checkpoint before major changes');
    recommendations.push('Git pre-commit validation hooks');
    recommendations.push('Smart commit message generation');
  }

  // Framework-specific recommendations
  if (projectInfo.frameworks !== undefined && projectInfo.frameworks.includes('React')) {
    recommendations.push('React component validation hooks');
    recommendations.push('JSX/TSX formatting automation');
  }

  if (projectInfo.frameworks !== undefined && projectInfo.frameworks.includes('Next.js')) {
    recommendations.push('Next.js build validation');
    recommendations.push('Page route validation');
  }

  if (projectInfo.frameworks !== undefined && projectInfo.frameworks.includes('Express')) {
    recommendations.push('API endpoint validation');
    recommendations.push('Express middleware testing');
  }

  // Package manager specific recommendations
  if (projectInfo.packageManager !== null && projectInfo.packageManager !== undefined) {
    recommendations.push(`${projectInfo.packageManager}-specific installation hooks`);
    recommendations.push('Dependency security scanning');
  }

  // Claude configuration recommendations
  if (projectInfo.hasClaudeConfig !== true) {
    recommendations.push('Initialize Claude configuration for this project');
    recommendations.push('Set up project-specific AI commands');
  }

  return recommendations;
}

/**
 * Demonstrate path resolution functionality
 */
async function demonstratePathResolution(): Promise<void> {
  logger.info('\n🔍 Path Resolution Examples:');

  const testPaths = ['.', '..', '~', '~/Documents', '/tmp', './src', '../packages'];

  for (const testPath of testPaths) {
    try {
      const resolved = resolveProjectPath(testPath);
      logger.info(`${testPath.padEnd(15)} → ${resolved}`);
    } catch (error) {
      logger.error(`${testPath.padEnd(15)} → Error: ${error}`);
    }
  }
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  Promise.all([demonstrateProjectDetection(), demonstratePathResolution()]).catch((error) => {
    logger.error(`Demo failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
