import { promises as fs } from 'fs';
import path from 'path';
// import os from 'os'; // Unused
import { Logger } from '../utils/logger.js';
import {
  copyFileWithBackup,
  ensureDirectoryExists,
  setExecutablePermission,
  checkWritePermission,
  pathExists,
  safeRemove,
  normalizePath,
  expandHomePath,
} from './filesystem.js';
import {
  discoverComponents,
  // getComponent,
  // resolveDependencyOrder,
  resolveAllDependencies,
  getMissingDependencies,
  registryToComponents,
  // getComponentsByType
} from './components.js';
import { findComponentsDirectory } from './paths.js';
import { detectProjectContext as detectProjectInfo } from './project-detection.js';
import type {
  Installation,
  Component,
  // ComponentType,
  InstallTarget,
  ProjectInfo,
  TemplateType,
  Platform,
} from '../types/config.js';

/**
 * Installation Orchestrator Module
 *
 * Manages the complete installation lifecycle including:
 * - Planning and validation
 * - Transaction-based installation with rollback
 * - Progress tracking and reporting
 * - Dry-run simulation
 * - Error handling and recovery
 */

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface InstallStep {
  id: string;
  type: 'create-dir' | 'copy-file' | 'set-permission' | 'install-dependency' | 'configure';
  description: string;
  source?: string;
  target: string;
  component?: Component;
  metadata?: Record<string, unknown>;
}

export interface InstallPlan {
  steps: InstallStep[];
  components: Component[];
  target: InstallTarget;
  directories: string[];
  backupPaths: string[];
  estimatedDuration: number;
  warnings: string[];
}

export interface InstallProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep?: InstallStep;
  phase: 'planning' | 'validating' | 'installing' | 'configuring' | 'complete' | 'failed';
  message: string;
  warnings: string[];
  errors: string[];
}

export interface InstallResult {
  success: boolean;
  installedComponents: Component[];
  modifiedFiles: string[];
  createdDirectories: string[];
  backupFiles: string[];
  warnings: string[];
  errors: string[];
  duration: number;
}

export interface InstallOptions {
  dryRun?: boolean;
  force?: boolean;
  backup?: boolean;
  interactive?: boolean;
  installDependencies?: boolean;
  template?: TemplateType;
  customPath?: string;
  onProgress?: (progress: InstallProgress) => void;
}

// ============================================================================
// Installation Transaction Management
// ============================================================================

class InstallTransaction {
  private completedSteps: InstallStep[] = [];
  private createdFiles: string[] = [];
  private createdDirs: string[] = [];
  private backupFiles: string[] = [];
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  recordFileCreated(filePath: string): void {
    this.createdFiles.push(filePath);
  }

  recordDirCreated(dirPath: string): void {
    this.createdDirs.push(dirPath);
  }

  recordBackupCreated(backupPath: string): void {
    this.backupFiles.push(backupPath);
  }

  recordStepCompleted(step: InstallStep): void {
    this.completedSteps.push(step);
  }

  async rollback(): Promise<void> {
    this.logger.warn('Rolling back installation...');

    // Remove created files
    for (const file of this.createdFiles.reverse()) {
      try {
        await safeRemove(file);
        this.logger.debug(`Removed file: ${file}`);
      } catch (error) {
        this.logger.error(`Failed to remove file ${file}: ${error}`);
      }
    }

    // Remove created directories (in reverse order)
    for (const dir of this.createdDirs.reverse()) {
      try {
        const entries = await fs.readdir(dir);
        if (entries.length === 0) {
          await fs.rmdir(dir);
          this.logger.debug(`Removed directory: ${dir}`);
        }
      } catch (error) {
        this.logger.debug(`Failed to remove directory ${dir}: ${error}`);
      }
    }

    // Restore backups
    for (const backupPath of this.backupFiles) {
      try {
        const originalPath = backupPath.replace(/\.backup-[\d-T]+$/, '');
        await fs.rename(backupPath, originalPath);
        this.logger.debug(`Restored backup: ${backupPath} -> ${originalPath}`);
      } catch (error) {
        this.logger.error(`Failed to restore backup ${backupPath}: ${error}`);
      }
    }

    this.logger.info('Rollback completed');
  }

  getCompletedSteps(): InstallStep[] {
    return [...this.completedSteps];
  }

  getCreatedFiles(): string[] {
    return [...this.createdFiles];
  }

  getCreatedDirs(): string[] {
    return [...this.createdDirs];
  }

  getBackupFiles(): string[] {
    return [...this.backupFiles];
  }
}

// ============================================================================
// Installation Planning
// ============================================================================

/**
 * Create an installation plan based on the configuration
 */
export async function createInstallPlan(
  installation: Installation,
  options: InstallOptions = {}
): Promise<InstallPlan> {
  const logger = Logger.create('installer');
  const steps: InstallStep[] = [];
  const directories = new Set<string>();
  const backupPaths: string[] = [];
  const warnings: string[] = [];

  // Determine base paths
  const userDir = expandHomePath('~/.claude');
  const projectDir = path.join(process.cwd(), '.claude');

  // Get components in dependency order with auto-included dependencies
  let sourceDir: string;
  try {
    sourceDir = await findComponentsDirectory();
  } catch (error) {
    throw new Error(
      `Could not find claudekit components: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
  const registry = await discoverComponents(sourceDir);
  const componentIds = installation.components.map((c) => c.id);

  // Resolve all dependencies (including transitive)
  const resolvedIds = resolveAllDependencies(componentIds, registry, {
    includeOptional: false,
    maxDepth: 10,
  });

  // Get missing dependencies that were auto-included
  const missingDeps = getMissingDependencies(componentIds, registry);
  if (missingDeps.length > 0) {
    logger.info(`Auto-including dependencies: ${missingDeps.join(', ')}`);
  }

  // Map resolved IDs to components
  const orderedComponents: Component[] = [];
  for (const id of resolvedIds) {
    // First check if it's in the original selection
    let component = installation.components.find((c) => c.id === id);

    // If not, try to find it in the registry (auto-included dependency)
    if (!component) {
      const registryComponent = registry.components.get(id);
      if (registryComponent) {
        // Convert registry component to Component type
        component = {
          id: registryComponent.metadata.id,
          type: registryComponent.type,
          name: registryComponent.metadata.name,
          description: registryComponent.metadata.description,
          path: registryComponent.path,
          dependencies: registryComponent.metadata.dependencies,
          platforms: registryComponent.metadata.platforms as Platform[],
          category: registryComponent.metadata.category,
          version: registryComponent.metadata.version,
          author: registryComponent.metadata.author,
          enabled: registryComponent.metadata.enabled ?? true,
          config: {
            allowedTools: registryComponent.metadata.allowedTools,
            argumentHint: registryComponent.metadata.argumentHint,
            shellOptions: registryComponent.metadata.shellOptions,
            timeout: registryComponent.metadata.timeout,
            retries: registryComponent.metadata.retries,
          },
          createdAt: registryComponent.lastModified,
          updatedAt: registryComponent.lastModified,
        };
      }
    }

    if (component) {
      orderedComponents.push(component);
    }
  }

  // Plan directory creation
  if (installation.target === 'user' || installation.target === 'both') {
    directories.add(userDir);
    directories.add(path.join(userDir, 'commands'));
    directories.add(path.join(userDir, 'hooks'));
  }

  if (installation.target === 'project' || installation.target === 'both') {
    directories.add(projectDir);
    directories.add(path.join(projectDir, 'commands'));
    directories.add(path.join(projectDir, 'hooks'));
  }

  // Add custom path if specified
  if (options.customPath !== undefined) {
    const customPath = normalizePath(options.customPath);
    directories.add(customPath);
    directories.add(path.join(customPath, 'commands'));
    directories.add(path.join(customPath, 'hooks'));
  }

  // Create directory steps
  for (const dir of directories) {
    steps.push({
      id: `create-dir-${dir}`,
      type: 'create-dir',
      description: `Create directory: ${dir}`,
      target: dir,
    });
  }

  // Plan component installation
  for (const component of orderedComponents) {
    const targets: string[] = [];

    // Determine target paths
    if (installation.target === 'user' || installation.target === 'both') {
      const targetPath = path.join(
        userDir,
        component.type === 'command' ? 'commands' : 'hooks',
        path.basename(component.path)
      );
      targets.push(targetPath);
    }

    if (installation.target === 'project' || installation.target === 'both') {
      const targetPath = path.join(
        projectDir,
        component.type === 'command' ? 'commands' : 'hooks',
        path.basename(component.path)
      );
      targets.push(targetPath);
    }

    if (options.customPath !== undefined) {
      const customPath = normalizePath(options.customPath);
      const targetPath = path.join(
        customPath,
        component.type === 'command' ? 'commands' : 'hooks',
        path.basename(component.path)
      );
      targets.push(targetPath);
    }

    // Create copy steps for each target
    for (const target of targets) {
      // Check if file exists for backup planning
      if ((await pathExists(target)) && options.backup !== false) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${target}.backup-${timestamp}`;
        backupPaths.push(backupPath);
      }

      steps.push({
        id: `copy-${component.id}-to-${target}`,
        type: 'copy-file',
        description: `Install ${component.name} to ${path.dirname(target)}`,
        source: component.path,
        target,
        component,
      });

      // Add permission step for hooks
      if (component.type === 'hook') {
        steps.push({
          id: `chmod-${component.id}-at-${target}`,
          type: 'set-permission',
          description: `Set executable permission on ${path.basename(target)}`,
          target,
          component,
        });
      }
    }

    // Plan dependency installation if enabled
    if (options.installDependencies === true && component.dependencies.length > 0) {
      for (const dep of component.dependencies) {
        if (!['git', 'npm', 'yarn', 'pnpm', 'node'].includes(dep)) {
          continue; // Skip system dependencies
        }

        steps.push({
          id: `install-dep-${dep}-for-${component.id}`,
          type: 'install-dependency',
          description: `Check/install dependency: ${dep}`,
          target: dep,
          component,
          metadata: { dependency: dep },
        });
      }
    }
  }

  // Plan configuration steps
  if (installation.target === 'project' || installation.target === 'both') {
    steps.push({
      id: 'configure-project-settings',
      type: 'configure',
      description: 'Configure project settings',
      target: path.join(projectDir, 'settings.json'),
      metadata: {
        template: options.template || 'default',
        projectInfo: installation.projectInfo,
      },
    });
  }

  // Check for warnings
  if (
    installation.projectInfo?.hasTypeScript === true &&
    !orderedComponents.some((c) => c.id === 'typecheck')
  ) {
    warnings.push('TypeScript detected but typecheck hook not selected');
  }

  if (installation.projectInfo?.hasESLint === true && !orderedComponents.some((c) => c.id === 'eslint')) {
    warnings.push('ESLint detected but eslint hook not selected');
  }

  // Warn about circular dependencies if any were detected
  if (registry.dependencyGraph?.cycles && registry.dependencyGraph.cycles.length > 0) {
    for (const cycle of registry.dependencyGraph.cycles) {
      warnings.push(`Circular dependency detected: ${cycle.join(' -> ')}`);
    }
  }

  // Estimate duration (rough approximation)
  const estimatedDuration = steps.length * 100; // 100ms per step average

  return {
    steps,
    components: orderedComponents,
    target: installation.target,
    directories: Array.from(directories),
    backupPaths,
    estimatedDuration,
    warnings,
  };
}

// ============================================================================
// Installation Validation
// ============================================================================

/**
 * Validate installation plan before execution
 */
export async function validateInstallPlan(plan: InstallPlan): Promise<string[]> {
  const errors: string[] = [];
  const checkedPaths = new Set<string>();

  // Validate write permissions for directories
  for (const dir of plan.directories) {
    const parentDir = path.dirname(dir);
    if (!checkedPaths.has(parentDir)) {
      if (!(await checkWritePermission(parentDir))) {
        errors.push(`No write permission for directory: ${parentDir}`);
      }
      checkedPaths.add(parentDir);
    }
  }

  // Validate source files exist
  for (const step of plan.steps) {
    if (step.type === 'copy-file' && step.source !== undefined) {
      if (!(await pathExists(step.source))) {
        errors.push(`Source file not found: ${step.source}`);
      }
    }
  }

  // Note: Circular dependency validation is now handled by the dependency resolver
  // It will warn but still allow installation in a safe order

  return errors;
}

// ============================================================================
// Dry Run Simulation
// ============================================================================

/**
 * Simulate installation without making changes
 */
export async function simulateInstallation(
  plan: InstallPlan,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const logger = Logger.create('installer:dry-run');
  const startTime = Date.now();
  const warnings: string[] = [...plan.warnings];
  const errors: string[] = [];

  logger.info('=== DRY RUN MODE ===');
  logger.info(`Would install ${plan.components.length} components to ${plan.target}`);

  // Report progress through planning phase
  if (options.onProgress) {
    options.onProgress({
      totalSteps: plan.steps.length,
      completedSteps: 0,
      phase: 'planning',
      message: 'Simulating installation plan...',
      warnings: [],
      errors: [],
    });
  }

  // Simulate each step
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];

    if (options.onProgress && step) {
      options.onProgress({
        totalSteps: plan.steps.length,
        completedSteps: i,
        currentStep: step,
        phase: 'installing',
        message: step.description,
        warnings,
        errors,
      });
    }

    if (step) {
      logger.info(`[${i + 1}/${plan.steps.length}] ${step.description}`);
    }

    // Simulate validation for each step type
    if (step) {
      switch (step.type) {
        case 'create-dir':
          if (await pathExists(step.target)) {
            logger.debug(`  Directory already exists: ${step.target}`);
          } else {
            logger.debug(`  Would create directory: ${step.target}`);
          }
          break;

        case 'copy-file':
          if (await pathExists(step.target)) {
            if (options.backup !== false) {
              logger.debug(`  Would backup existing file: ${step.target}`);
            }
            logger.debug(`  Would overwrite file: ${step.target}`);
          } else {
            logger.debug(`  Would create file: ${step.target}`);
          }
          break;

        case 'set-permission':
          logger.debug(`  Would set executable permission: ${step.target}`);
          break;

        case 'install-dependency':
          logger.debug(`  Would check/install dependency: ${step.target}`);
          break;

        case 'configure':
          logger.debug(`  Would create/update configuration: ${step.target}`);
          break;
      }
    }
  }

  // Final progress update
  if (options.onProgress) {
    options.onProgress({
      totalSteps: plan.steps.length,
      completedSteps: plan.steps.length,
      phase: 'complete',
      message: 'Dry run completed successfully',
      warnings,
      errors,
    });
  }

  const duration = Date.now() - startTime;
  logger.info(`\nDry run completed in ${duration}ms`);
  logger.info(`Would have:`);
  logger.info(`  - Created ${plan.directories.length} directories`);
  logger.info(`  - Installed ${plan.components.length} components`);
  logger.info(`  - Created ${plan.backupPaths.length} backups`);

  if (warnings.length > 0) {
    logger.warn('\nWarnings:');
    warnings.forEach((w) => logger.warn(`  - ${w}`));
  }

  return {
    success: true,
    installedComponents: plan.components,
    modifiedFiles: plan.steps.filter((s) => s.type === 'copy-file').map((s) => s.target),
    createdDirectories: plan.directories,
    backupFiles: plan.backupPaths,
    warnings,
    errors,
    duration,
  };
}

// ============================================================================
// Installation Execution
// ============================================================================

/**
 * Execute the installation plan
 */
export async function executeInstallation(
  plan: InstallPlan,
  options: InstallOptions = {}
): Promise<InstallResult> {
  const logger = Logger.create('installer');
  const transaction = new InstallTransaction(logger);
  const startTime = Date.now();
  const warnings: string[] = [...plan.warnings];
  const errors: string[] = [];
  let completedSteps = 0;

  // Initialize progress
  if (options.onProgress) {
    options.onProgress({
      totalSteps: plan.steps.length,
      completedSteps: 0,
      phase: 'installing',
      message: 'Starting installation...',
      warnings: [],
      errors: [],
    });
  }

  try {
    // Execute each step
    for (const step of plan.steps) {
      if (options.onProgress) {
        options.onProgress({
          totalSteps: plan.steps.length,
          completedSteps,
          currentStep: step,
          phase: 'installing',
          message: step.description,
          warnings,
          errors,
        });
      }

      logger.debug(`Executing: ${step.description}`);

      try {
        await executeStep(step, transaction, options);
        transaction.recordStepCompleted(step);
        completedSteps++;
      } catch (error) {
        const errorMsg = `Failed to ${step.description}: ${error}`;
        errors.push(errorMsg);
        logger.error(errorMsg);
        throw error;
      }
    }

    // Report completion
    if (options.onProgress) {
      options.onProgress({
        totalSteps: plan.steps.length,
        completedSteps: plan.steps.length,
        phase: 'complete',
        message: 'Installation completed successfully',
        warnings,
        errors,
      });
    }

    const duration = Date.now() - startTime;
    logger.success(`Installation completed in ${duration}ms`);

    return {
      success: true,
      installedComponents: plan.components,
      modifiedFiles: transaction.getCreatedFiles(),
      createdDirectories: transaction.getCreatedDirs(),
      backupFiles: transaction.getBackupFiles(),
      warnings,
      errors,
      duration,
    };
  } catch (error) {
    // Report failure
    if (options.onProgress) {
      options.onProgress({
        totalSteps: plan.steps.length,
        completedSteps,
        phase: 'failed',
        message: `Installation failed: ${error}`,
        warnings,
        errors,
      });
    }

    logger.error(`Installation failed: ${error}`);

    // Rollback transaction
    if (options.dryRun !== true) {
      await transaction.rollback();
    }

    const duration = Date.now() - startTime;
    return {
      success: false,
      installedComponents: [],
      modifiedFiles: [],
      createdDirectories: [],
      backupFiles: [],
      warnings,
      errors,
      duration,
    };
  }
}

/**
 * Execute a single installation step
 */
async function executeStep(
  step: InstallStep,
  transaction: InstallTransaction,
  options: InstallOptions
): Promise<void> {
  const logger = Logger.create('installer:step');

  switch (step.type) {
    case 'create-dir':
      logger.debug(`Creating directory: ${step.target}`);
      await ensureDirectoryExists(step.target);
      transaction.recordDirCreated(step.target);
      break;

    case 'copy-file':
      if (step.source === undefined) {
        throw new Error('Source file required for copy operation');
      }

      logger.debug(`Copying file: ${step.source} -> ${step.target}`);

      // Record backup if created
      if (options.backup !== false && (await pathExists(step.target))) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${step.target}.backup-${timestamp}`;
        transaction.recordBackupCreated(backupPath);
        logger.debug(`Creating backup: ${backupPath}`);
      }

      await copyFileWithBackup(step.source, step.target, options.backup !== false);
      transaction.recordFileCreated(step.target);
      break;

    case 'set-permission':
      logger.debug(`Setting executable permission: ${step.target}`);
      await setExecutablePermission(step.target);
      break;

    case 'install-dependency': {
      // For now, just check if dependency exists
      // Future: implement actual dependency installation
      const depName = step.metadata?.['dependency'] as string ?? step.target;
      logger.debug(`Checking dependency: ${depName}`);
      break;
    }

    case 'configure':
      logger.debug(`Creating configuration: ${step.target}`);
      await createConfiguration(step.target, step.metadata);
      transaction.recordFileCreated(step.target);
      break;

    default:
      // This should never happen as step.type is a union type
      throw new Error(`Unknown step type: ${step.type}`);
  }
}

interface HookConfiguration {
  matcher: string;
  hooks: Array<{ type: 'command'; command: string }>;
}

interface ClaudeConfiguration {
  hooks: {
    PostToolUse: HookConfiguration[];
    Stop: HookConfiguration[];
  };
}

/**
 * Create configuration file based on template and project info
 */
async function createConfiguration(
  targetPath: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // const template = metadata?.['template'] || 'default'; // Unused for now
  const projectInfo = metadata?.['projectInfo'] as ProjectInfo | undefined;

  // Build configuration based on template and project info
  const config: ClaudeConfiguration = {
    hooks: {
      PostToolUse: [],
      Stop: [],
    },
  };

  // Add TypeScript hook if project has TypeScript
  if (projectInfo?.hasTypeScript === true) {
    config.hooks.PostToolUse.push({
      matcher: 'tools:Write AND file_paths:**/*.ts',
      hooks: [{ type: 'command', command: '.claude/hooks/typecheck.sh' }],
    });
  }

  // Add ESLint hook if project has ESLint
  if (projectInfo?.hasESLint === true) {
    config.hooks.PostToolUse.push({
      matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}',
      hooks: [{ type: 'command', command: '.claude/hooks/eslint.sh' }],
    });
  }

  // Add default stop hooks
  config.hooks.Stop.push({
    matcher: '*',
    hooks: [
      { type: 'command', command: '.claude/hooks/auto-checkpoint.sh' },
      { type: 'command', command: '.claude/hooks/validate-todo-completion.sh' },
    ],
  });

  // Write configuration
  await fs.writeFile(targetPath, JSON.stringify(config, null, 2));
}

// ============================================================================
// Main Installer API
// ============================================================================

/**
 * Main installation orchestrator
 */
export class Installer {
  private logger: Logger;
  private options: InstallOptions;

  constructor(options: InstallOptions = {}) {
    this.logger = Logger.create('installer');
    this.options = options;
  }

  /**
   * Run the complete installation process
   */
  async install(installation: Installation): Promise<InstallResult> {
    try {
      // Set log level based on options
      if (this.options.interactive === false && process.env['DEBUG'] === undefined) {
        this.logger.setLevel('warn');
      }

      // Phase 1: Create installation plan
      this.reportProgress({
        totalSteps: 0,
        completedSteps: 0,
        phase: 'planning',
        message: 'Creating installation plan...',
        warnings: [],
        errors: [],
      });

      const plan = await createInstallPlan(installation, this.options);

      // Phase 2: Validate plan
      this.reportProgress({
        totalSteps: plan.steps.length,
        completedSteps: 0,
        phase: 'validating',
        message: 'Validating installation plan...',
        warnings: plan.warnings,
        errors: [],
      });

      const validationErrors = await validateInstallPlan(plan);
      if (validationErrors.length > 0 && this.options.force !== true) {
        return {
          success: false,
          installedComponents: [],
          modifiedFiles: [],
          createdDirectories: [],
          backupFiles: [],
          warnings: plan.warnings,
          errors: validationErrors,
          duration: 0,
        };
      }

      // Phase 3: Execute installation (or dry run)
      if (this.options.dryRun === true) {
        return await simulateInstallation(plan, this.options);
      } else {
        return await executeInstallation(plan, this.options);
      }
    } catch (error) {
      this.logger.error(`Installation failed: ${error}`);
      return {
        success: false,
        installedComponents: [],
        modifiedFiles: [],
        createdDirectories: [],
        backupFiles: [],
        warnings: [],
        errors: [`Installation failed: ${error}`],
        duration: 0,
      };
    }
  }

  /**
   * Create a default installation configuration
   */
  async createDefaultInstallation(target: InstallTarget = 'project'): Promise<Installation> {
    // Detect project information
    const projectInfo = await detectProjectInfo(process.cwd());

    // Discover available components
    let sourceDir: string;
    try {
      sourceDir = await findComponentsDirectory();
    } catch (error) {
      throw new Error(
        `Could not find claudekit components: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    const registry = await discoverComponents(sourceDir);
    const allComponents = registryToComponents(registry);

    // Select recommended components based on project
    const selectedComponents: Component[] = [];

    // Always include base hooks
    const baseHooks = ['auto-checkpoint', 'validate-todo-completion'];
    for (const hookId of baseHooks) {
      const hook = allComponents.find((c) => c.id === hookId && c.type === 'hook');
      if (hook) {
        selectedComponents.push(hook);
      }
    }

    // Add TypeScript hook if TypeScript detected
    if (projectInfo?.hasTypeScript) {
      const tsHook = allComponents.find((c) => c.id === 'typecheck' && c.type === 'hook');
      if (tsHook) {
        selectedComponents.push(tsHook);
      }
    }

    // Add ESLint hook if ESLint detected
    if (projectInfo?.hasESLint) {
      const eslintHook = allComponents.find((c) => c.id === 'eslint' && c.type === 'hook');
      if (eslintHook) {
        selectedComponents.push(eslintHook);
      }
    }

    // Add some useful commands
    const recommendedCommands = ['checkpoint-create', 'checkpoint-list', 'git-status'];
    for (const cmdId of recommendedCommands) {
      const cmd = allComponents.find((c) => c.id === cmdId && c.type === 'command');
      if (cmd !== undefined) {
        selectedComponents.push(cmd);
      }
    }

    return {
      components: selectedComponents,
      target,
      backup: true,
      dryRun: false,
      projectInfo,
      template: 'default',
      installDependencies: true,
    };
  }

  /**
   * Report progress to callback if provided
   */
  private reportProgress(progress: InstallProgress): void {
    if (this.options.onProgress) {
      this.options.onProgress(progress);
    }
  }
}

/**
 * Convenience function to run installation with default settings
 */
export async function installComponents(
  components: Component[],
  target: InstallTarget = 'project',
  options: InstallOptions = {}
): Promise<InstallResult> {
  const installer = new Installer(options);
  const installation: Installation = {
    components,
    target,
    backup: options.backup ?? true,
    dryRun: options.dryRun ?? false,
    installDependencies: options.installDependencies ?? true,
  };

  return installer.install(installation);
}
