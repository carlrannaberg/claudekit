#!/usr/bin/env node

/**
 * Example usage of the ClaudeKit Installer module
 *
 * Demonstrates various installation scenarios including:
 * - Basic installation
 * - Dry run mode
 * - Progress tracking
 * - Custom installation paths
 * - Error handling and rollback
 */

import { Installer, installComponents } from '../lib/installer.js';
import { discoverComponents, registryToComponents } from '../lib/components.js';
import type { Component, InstallProgress } from '../types/config.js';

// ============================================================================
// Example 1: Basic Installation with Progress Tracking
// ============================================================================

async function basicInstallationExample(): Promise<void> {
  console.log('=== Basic Installation Example ===\n');

  // Create installer with progress tracking
  const installer = new Installer({
    onProgress: (progress: InstallProgress): void => {
      console.log(`[${progress.phase}] ${progress.message}`);
      if (progress.completedSteps > 0) {
        const percentage = Math.round((progress.completedSteps / progress.totalSteps) * 100);
        console.log(`Progress: ${percentage}% (${progress.completedSteps}/${progress.totalSteps})`);
      }
    },
  });

  try {
    // Create default installation (auto-detects project and selects components)
    const installation = await installer.createDefaultInstallation('project');

    console.log(`\nDetected project configuration:`);
    console.log(`- TypeScript: ${installation.projectInfo?.hasTypeScript === true ? 'Yes' : 'No'}`);
    console.log(`- ESLint: ${installation.projectInfo?.hasESLint === true ? 'Yes' : 'No'}`);
    console.log(`- Package Manager: ${installation.projectInfo?.packageManager ?? 'None'}`);
    console.log(`\nSelected ${installation.components.length} components for installation\n`);

    // Run installation
    const result = await installer.install(installation);

    if (result.success) {
      console.log('\n✅ Installation completed successfully!');
      console.log(`- Installed ${result.installedComponents.length} components`);
      console.log(`- Created ${result.createdDirectories.length} directories`);
      console.log(`- Modified ${result.modifiedFiles.length} files`);
      if (result.backupFiles.length > 0) {
        console.log(`- Created ${result.backupFiles.length} backups`);
      }
    } else {
      console.error('\n❌ Installation failed!');
      result.errors.forEach((error) => console.error(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach((warning) => console.log(`  - ${warning}`));
    }
  } catch (error) {
    console.error('Installation error:', error);
  }
}

// ============================================================================
// Example 2: Dry Run Mode
// ============================================================================

async function dryRunExample(): Promise<void> {
  console.log('\n=== Dry Run Example ===\n');

  const installer = new Installer({
    dryRun: true,
    onProgress: (progress: InstallProgress): void => {
      console.log(`[DRY RUN] ${progress.message}`);
    },
  });

  // Discover available components
  const sourceDir = process.cwd();
  const registry = await discoverComponents(sourceDir);
  const allComponents = registryToComponents(registry);

  // Select specific components
  const selectedComponents = allComponents.filter((c) =>
    ['typecheck', 'eslint', 'auto-checkpoint'].includes(c.id)
  );

  console.log(`Found ${allComponents.length} total components`);
  console.log(`Selected ${selectedComponents.length} components for dry run\n`);

  const result = await installer.install({
    components: selectedComponents,
    target: 'project',
    backup: true,
    dryRun: true,
    installDependencies: true,
  });

  console.log('\n=== Dry Run Results ===');
  console.log('Would have performed the following actions:');
  console.log(`- Create ${result.createdDirectories.length} directories`);
  console.log(`- Install ${result.installedComponents.length} components`);
  console.log(`- Modify ${result.modifiedFiles.length} files`);
  console.log(`- Create ${result.backupFiles.length} backups`);
}

// ============================================================================
// Example 3: Custom Installation with Specific Components
// ============================================================================

async function customInstallationExample(): Promise<void> {
  console.log('\n=== Custom Installation Example ===\n');

  // Create custom components list
  const customComponents: Component[] = [
    {
      id: 'custom-hook',
      type: 'hook',
      name: 'Custom Validation Hook',
      description: 'Custom validation for our project',
      path: './custom-hooks/validate.sh',
      dependencies: ['node', 'eslint'],
      category: 'validation',
    },
  ];

  // Use the convenience function with options
  const result = await installComponents(
    customComponents,
    'both', // Install to both user and project
    {
      backup: true,
      force: true, // Force installation even with validation warnings
      installDependencies: false, // Don't auto-install dependencies
      onProgress: (progress): void => {
        const icon = progress.phase === 'complete' ? '✅' : '🔄';
        console.log(`${icon} ${progress.message}`);
      },
    }
  );

  console.log(`\nCustom installation ${result.success ? 'succeeded' : 'failed'}`);
}

// ============================================================================
// Example 4: Interactive Installation Flow
// ============================================================================

async function interactiveInstallationExample(): Promise<void> {
  console.log('\n=== Interactive Installation Example ===\n');

  // This example shows how to build an interactive installation flow
  const installer = new Installer({
    interactive: true,
    onProgress: (progress: InstallProgress): void => {
      // In a real interactive flow, you might update a UI here
      switch (progress.phase) {
        case 'planning':
          console.log('📋 Planning installation...');
          break;
        case 'validating':
          console.log('✓ Validating requirements...');
          break;
        case 'installing':
          if (progress.currentStep) {
            console.log(`📦 ${progress.currentStep.description}`);
          }
          break;
        case 'complete':
          console.log('🎉 Installation complete!');
          break;
        case 'failed':
          console.log('❌ Installation failed');
          break;
      }
    },
  });

  // In a real interactive flow, you would:
  // 1. Show available components and let user select
  // 2. Show project detection results and let user confirm
  // 3. Let user choose installation target (user/project/both)
  // 4. Show installation plan and get confirmation
  // 5. Execute installation

  // For this example, we'll just use defaults
  const installation = await installer.createDefaultInstallation();

  console.log('\nInstallation Plan:');
  console.log(`- Target: ${installation.target}`);
  console.log(`- Components: ${installation.components.map((c) => c.name).join(', ')}`);
  console.log(`- Backup enabled: ${installation.backup === true}`);

  // Simulate user confirmation
  console.log('\n[Simulating user confirmation...]\n');

  const result = await installer.install(installation);

  if (!result.success) {
    console.error('\nInstallation failed. Errors:');
    result.errors.forEach((err) => console.error(`  - ${err}`));
  }
}

// ============================================================================
// Example 5: Error Handling and Rollback
// ============================================================================

async function errorHandlingExample(): Promise<void> {
  console.log('\n=== Error Handling Example ===\n');

  const installer = new Installer({
    onProgress: (progress): void => {
      if (progress.errors.length > 0) {
        console.error('Errors detected:', progress.errors);
      }
    },
  });

  try {
    // Try to install to a directory without write permissions
    const result = await installer.install({
      components: [],
      target: 'project',
      backup: true,
      dryRun: false,
      installDependencies: true,
      customPath: '/root/no-permission', // This will likely fail
    });

    if (!result.success) {
      console.log('\nInstallation failed as expected.');
      console.log('The installer automatically rolled back any partial changes.');
      console.log('\nErrors encountered:');
      result.errors.forEach((err) => console.log(`  - ${err}`));
    }
  } catch (error) {
    console.error('Caught installation error:', error);
    console.log('\nThe installer handles errors gracefully and performs automatic rollback.');
  }
}

// ============================================================================
// Main execution
// ============================================================================

async function main(): Promise<void> {
  console.log('ClaudeKit Installer Usage Examples\n');
  console.log('This demonstrates various installation scenarios.\n');

  // Run examples based on command line argument
  const example = process.argv[2];

  switch (example) {
    case 'basic':
      await basicInstallationExample();
      break;
    case 'dry-run':
      await dryRunExample();
      break;
    case 'custom':
      await customInstallationExample();
      break;
    case 'interactive':
      await interactiveInstallationExample();
      break;
    case 'error':
      await errorHandlingExample();
      break;
    default:
      console.log('Available examples:');
      console.log('  npm run example:installer basic       - Basic installation with progress');
      console.log('  npm run example:installer dry-run     - Dry run simulation');
      console.log('  npm run example:installer custom      - Custom component installation');
      console.log('  npm run example:installer interactive - Interactive installation flow');
      console.log('  npm run example:installer error       - Error handling and rollback');
      console.log('\nRunning basic example by default...\n');
      await basicInstallationExample();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
