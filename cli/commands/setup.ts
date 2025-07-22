import { select, checkbox, input, confirm } from '@inquirer/prompts';
import { Colors } from '../utils/colors.js';
import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from '../utils/logger.js';
import { createProgressReporter, ComponentProgressReporter } from '../utils/progress.js';
import {
  pathExists,
  ensureDirectoryExists,
  expandHomePath,
  normalizePath,
} from '../lib/filesystem.js';
import {
  detectProjectContext,
  discoverComponents,
  recommendComponents,
  installComponents,
} from '../lib/index.js';
import { findComponentsDirectory } from '../lib/paths.js';
import type { Component, Platform } from '../types/index.js';
import type { InstallOptions } from '../lib/installer.js';

// Command group definitions for improved setup flow
interface CommandGroup {
  id: string;
  name: string;
  description: string;
  commands: string[];
  recommended: boolean;
}

const COMMAND_GROUPS: CommandGroup[] = [
  {
    id: 'essential-workflow',
    name: '🔧 Essential Workflow',
    description: 'Core git operations, checkpoints, and daily development tools',
    commands: ['git:commit', 'git:status', 'git:push', 'checkpoint:create', 'checkpoint:list', 'checkpoint:restore', 'gh:repo-init', 'dev:cleanup'],
    recommended: true
  },
  {
    id: 'code-quality',
    name: '✅ Code Quality & Validation',
    description: 'Automated validation, linting fixes, and quality assurance tools',
    commands: ['validate-and-fix'],
    recommended: true
  },
  {
    id: 'ai-assistant',
    name: '🤖 AI Assistant Configuration',
    description: 'Manage AGENT.md, create custom commands, and configure Claude Code',
    commands: ['agent:init', 'agent:migration', 'agent:cli', 'create-command', 'config:bash-timeout'],
    recommended: false
  },
  {
    id: 'spec-management',
    name: '📋 Specification Management',
    description: 'Spec-driven development: create, validate, and execute specifications',
    commands: ['spec:create', 'spec:validate', 'spec:decompose', 'spec:execute'],
    recommended: false
  }
];

interface HookQualityLevel {
  id: string;
  name: string;
  description: string;
  hooks: string[];
  suitable: string;
}

const HOOK_QUALITY_LEVELS: HookQualityLevel[] = [
  {
    id: 'basic-safety',
    name: '🔒 Basic Safety',
    description: 'Essential safety nets that work for any git project',
    hooks: ['auto-checkpoint'],
    suitable: 'All projects - provides automatic checkpoints when stopping'
  },
  {
    id: 'standard-quality',
    name: '📊 Standard Quality',
    description: 'Basic safety plus language-specific validation for JS/TS projects',
    hooks: ['auto-checkpoint', 'eslint', 'typecheck', 'validate-todo-completion'],
    suitable: 'JavaScript/TypeScript projects with moderate quality requirements'
  },
  {
    id: 'comprehensive-quality',
    name: '🎯 Comprehensive Quality',
    description: 'Full validation suite with testing and project-wide quality checks',
    hooks: ['auto-checkpoint', 'eslint', 'typecheck', 'run-related-tests', 'project-validation', 'validate-todo-completion'],
    suitable: 'Production projects requiring maximum quality assurance'
  },
  {
    id: 'custom-selection',
    name: '⚙️ Custom Selection',
    description: 'Choose individual hooks manually for advanced users',
    hooks: [],
    suitable: 'Power users who want granular control over hook selection'
  }
];

/**
 * Perform improved two-step selection: command groups then hook quality levels
 */
async function performTwoStepSelection(projectInfo: any): Promise<string[]> {
  const selectedComponents: string[] = [];

  // Step 1: Command Group Selection
  console.log(`\n${Colors.bold('Step 1: Choose Command Groups')}`);
  console.log(Colors.dim('Select groups of slash commands for Claude Code'));

  const commandGroupChoices = COMMAND_GROUPS.map(group => ({
    value: group.id,
    name: group.name,
    description: group.description,
    checked: group.recommended
  }));

  const selectedGroups = (await checkbox({
    message: 'Select command groups to install:',
    choices: commandGroupChoices.map(choice => {
      const group = COMMAND_GROUPS.find(g => g.id === choice.value);
      const commandList = group ? group.commands.map(cmd => `/${cmd}`).join(', ') : '';
      return {
        value: choice.value,
        name: `${choice.name}\n  ${Colors.dim(choice.description)}\n  ${Colors.accent('Commands:')} ${Colors.dim(commandList)}`,
        checked: choice.checked
      };
    })
  })) as string[];

  // Add selected commands from groups
  for (const groupId of selectedGroups) {
    const group = COMMAND_GROUPS.find(g => g.id === groupId);
    if (group) {
      selectedComponents.push(...group.commands);
    }
  }

  // Step 2: Hook Quality Level Selection
  console.log(`\n${Colors.bold('Step 2: Choose Quality Level')}`);
  console.log(Colors.dim('Select automated validation hooks for code quality'));

  // Determine default quality level based on project
  let defaultQuality = 'basic-safety';
  if (projectInfo.hasTypeScript || projectInfo.hasEslint) {
    defaultQuality = 'standard-quality';
  }

  const hookLevelChoices = HOOK_QUALITY_LEVELS.map(level => {
    const hooksList = level.hooks.length > 0 ? level.hooks.join(', ') : 'Choose manually';
    return {
      value: level.id,
      name: `${level.name}\n  ${Colors.dim(level.description)}\n  ${Colors.accent('Hooks:')} ${Colors.dim(hooksList)}\n  ${Colors.accent('Best for:')} ${Colors.dim(level.suitable)}`,
      checked: level.id === defaultQuality
    };
  });

  const selectedQualityLevel = (await select({
    message: 'Choose your quality level:',
    choices: hookLevelChoices
  })) as string;

  if (selectedQualityLevel === 'custom-selection') {
    // Allow custom hook selection for power users
    const availableHooks = ['auto-checkpoint', 'eslint', 'typecheck', 'run-related-tests', 'project-validation', 'validate-todo-completion'];
    const hookChoices = availableHooks.map(hook => {
      let description = '';
      switch (hook) {
        case 'auto-checkpoint': description = 'Automatic git checkpoints when stopping'; break;
        case 'eslint': description = 'ESLint validation for JS/TS files'; break;
        case 'typecheck': description = 'TypeScript type checking'; break;
        case 'run-related-tests': description = 'Run tests related to modified files'; break;
        case 'project-validation': description = 'Comprehensive project validation'; break;
        case 'validate-todo-completion': description = 'Ensure todos are completed'; break;
      }
      return {
        value: hook,
        name: `${hook} - ${description}`,
        checked: hook === 'auto-checkpoint' // Default to basic safety
      };
    });

    const selectedHooks = (await checkbox({
      message: 'Select individual hooks:',
      choices: hookChoices
    })) as string[];

    selectedComponents.push(...selectedHooks);
  } else {
    // Add hooks from selected quality level
    const qualityLevel = HOOK_QUALITY_LEVELS.find(level => level.id === selectedQualityLevel);
    if (qualityLevel) {
      selectedComponents.push(...qualityLevel.hooks);
    }
  }

  return selectedComponents;
}

export interface SetupOptions {
  force?: boolean;
  template?: string;
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  commands?: string;
  hooks?: string;
  project?: string;
  commandsOnly?: boolean;
  selectIndividual?: boolean; // Flag for power users to select individual components
}

interface SetupConfig {
  installationType: 'user' | 'project' | 'both';
  projectPath: string;
  selectedComponents: string[];
  options: {
    autoCheckpoint: boolean;
    validateTodos: boolean;
    runTests: boolean;
    gitIntegration: boolean;
  };
}

/**
 * Setup wizard for ClaudeKit with interactive and non-interactive modes
 */
export async function setup(options: SetupOptions = {}): Promise<void> {
  const logger = new Logger();

  if (options.verbose === true) {
    logger.setLevel('debug');
  } else if (options.quiet === true) {
    logger.setLevel('error');
  }

  try {
    const isNonInteractive =
      options.yes === true ||
      options.commands !== undefined ||
      options.hooks !== undefined ||
      options.commandsOnly === true;

    // Show welcome message (unless in non-interactive mode)
    if (!isNonInteractive || options.quiet !== true) {
      console.log(Colors.bold(Colors.accent('\nClaudeKit Setup Wizard')));
      console.log(Colors.dim('─'.repeat(40)));

      if (!isNonInteractive) {
        console.log(
          '\nWelcome to ClaudeKit! This wizard will help you configure ClaudeKit\n' +
            'for your development workflow. ClaudeKit provides:\n\n' +
            '  • Automated code quality checks (TypeScript, ESLint, Prettier)\n' +
            '  • Git workflow integration (checkpoints, smart commits)\n' +
            '  • AI assistant configuration management\n' +
            '  • Custom commands and hooks for Claude Code\n'
        );
      }
    }

    // Step 1: Installation type
    let installationType: string;
    if (options.yes === true || options.commandsOnly === true) {
      // Default to both for --yes, commands only for --commands-only
      installationType = options.commandsOnly === true ? 'user' : 'both';
    } else {
      installationType = await select({
        message: 'How would you like to install ClaudeKit?',
        choices: [
          {
            value: 'project',
            name: 'Project only - Install in the current project directory',
          },
          {
            value: 'user',
            name: 'User only - Install globally for all projects (~/.claude)',
          },
          {
            value: 'both',
            name: 'Both user and project - Install globally and configure for current project',
          },
        ],
      });
    }

    // Step 2: Project path (if project installation)
    let projectPath = process.cwd();
    if (installationType === 'project' || installationType === 'both') {
      if (options.project !== undefined && options.project !== '') {
        // Use provided project path
        const expanded = expandHomePath(options.project);
        projectPath = normalizePath(expanded);

        // Validate project path
        if (!(await pathExists(projectPath))) {
          throw new Error(`Project directory does not exist: ${options.project}`);
        }

        const stats = await fs.stat(projectPath);
        if (!stats.isDirectory()) {
          throw new Error(`Path must be a directory: ${options.project}`);
        }

        try {
          await fs.access(projectPath, fs.constants.W_OK);
        } catch {
          throw new Error(`No write permission for directory: ${options.project}`);
        }
      } else if (options.yes !== true && options.commandsOnly !== true) {
        const inputPath = await input({
          message: 'Project directory path:',
          default: process.cwd(),
          validate: async (value: string) => {
            try {
              const expanded = expandHomePath(value);
              const normalized = normalizePath(expanded);

              if (!(await pathExists(normalized))) {
                return 'Directory does not exist';
              }

              const stats = await fs.stat(normalized);
              if (!stats.isDirectory()) {
                return 'Path must be a directory';
              }

              // Check write permissions
              try {
                await fs.access(normalized, fs.constants.W_OK);
              } catch {
                return 'No write permission for this directory';
              }

              return true;
            } catch (error) {
              return `Invalid path: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          },
        });

        projectPath = normalizePath(expandHomePath(inputPath));
      }
    }

    // Step 3: Analyze project and discover components
    const progressReporter = createProgressReporter({
      quiet: options.quiet,
      verbose: options.verbose,
    });

    progressReporter.start('Analyzing project context...');
    const projectInfo = await detectProjectContext(projectPath);

    progressReporter.update('Discovering components...');
    let srcDir: string;
    try {
      srcDir = await findComponentsDirectory();
      if (options.verbose) {
        console.log(`Components directory found at: ${srcDir}`);
      }
    } catch (error) {
      progressReporter.fail('Failed to locate components');
      throw new Error(
        `Could not find claudekit components: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    const registry = await discoverComponents(srcDir);
    if (options.verbose) {
      console.log(`Discovered ${registry.components.size} components in ${registry.categories.size} categories`);
    }

    progressReporter.update('Generating recommendations...');
    const recommendations = await recommendComponents(projectInfo, registry);
    if (options.verbose) {
      console.log(`Generated ${recommendations.recommended.length} recommended and ${recommendations.optional.length} optional components`);
    }

    progressReporter.succeed('Project analysis complete');

    // Display project info (unless quiet mode)
    if (
      options.quiet !== true &&
      (projectInfo.hasTypeScript === true ||
        projectInfo.hasESLint === true ||
        (projectInfo.frameworks?.length ?? 0) > 0)
    ) {
      const detected = [];
      if (projectInfo.hasTypeScript === true) {
        detected.push('TypeScript');
      }
      if (projectInfo.hasESLint === true) {
        detected.push('ESLint');
      }
      if (projectInfo.hasPrettier === true) {
        detected.push('Prettier');
      }
      if (projectInfo.hasJest === true) {
        detected.push('Jest');
      }
      if (projectInfo.hasVitest === true) {
        detected.push('Vitest');
      }
      if (projectInfo.frameworks !== undefined && projectInfo.frameworks.length > 0) {
        detected.push(...projectInfo.frameworks);
      }

      console.log(`\n${Colors.bold('Project Analysis')}`);
      console.log(Colors.dim('─'.repeat(40)));
      console.log(`Detected: ${detected.join(', ')}`);
    }

    // Step 4: Component selection - Two-step process with groups
    let selectedComponents: string[];

    if (options.commands !== undefined || options.hooks !== undefined) {
      // Parse component lists from flags
      const requestedCommands =
        options.commands !== undefined && options.commands !== ''
          ? options.commands.split(',').map((s) => s.trim())
          : [];
      const requestedHooks =
        options.hooks !== undefined && options.hooks !== ''
          ? options.hooks.split(',').map((s) => s.trim())
          : [];

      selectedComponents = [];

      // Validate and add requested components
      for (const id of [...requestedCommands, ...requestedHooks]) {
        if (registry.components.has(id)) {
          selectedComponents.push(id);
        } else {
          throw new Error(`Component not found: ${id}`);
        }
      }

      if (selectedComponents.length === 0) {
        throw new Error('No valid components specified');
      }
    } else if (options.yes === true || options.commandsOnly === true) {
      // Default to essential and recommended components
      selectedComponents = [
        ...recommendations.essential.map((r) => r.component.metadata.id),
        ...recommendations.recommended.map((r) => r.component.metadata.id),
      ];
    } else if (options.selectIndividual === true) {
      // Legacy individual component selection for power users
      const allComponents = [
        ...recommendations.essential.map((r) => ({
          value: r.component.metadata.id,
          name: `${r.component.metadata.name} (Essential) - ${r.reasons.join(', ')}`,
          checked: true,
        })),
        ...recommendations.recommended.map((r) => ({
          value: r.component.metadata.id,
          name: `${r.component.metadata.name} (Recommended) - ${r.reasons.join(', ')}`,
          checked: true,
        })),
        ...recommendations.optional.map((r) => ({
          value: r.component.metadata.id,
          name: `${r.component.metadata.name} - ${r.reasons.join(', ')}`,
          checked: false,
        })),
      ];

      selectedComponents = (await checkbox({
        message: 'Select individual components to install:',
        choices: allComponents,
      })) as string[];
    } else {
      // New improved two-step selection process
      selectedComponents = await performTwoStepSelection(projectInfo);
    }

    // Step 5: Configuration options
    let autoCheckpoint: boolean;
    let validateTodos: boolean;
    let runTests: boolean;
    let gitIntegration: boolean;

    if (options.yes === true || options.commands !== undefined || options.hooks !== undefined || options.commandsOnly === true) {
      // Default configuration for non-interactive mode
      autoCheckpoint = true;
      validateTodos = true;
      runTests = projectInfo.hasJest === true || projectInfo.hasVitest === true;
      gitIntegration = projectInfo.isGitRepository === true || true;
    } else {
      // Interactive configuration
      console.log(`\n${Colors.bold('Configuration Options')}`);
      console.log(Colors.dim('─'.repeat(40)));

      autoCheckpoint = await confirm({
        message: 'Enable automatic git checkpointing?',
        default: true,
      });

      validateTodos = await confirm({
        message: 'Enable TODO validation on stop?',
        default: true,
      });

      runTests = await confirm({
        message: 'Run related tests after file changes?',
        default: projectInfo.hasJest === true || projectInfo.hasVitest === true,
      });

      gitIntegration = await confirm({
        message: 'Enable git workflow commands?',
        default: projectInfo.isGitRepository === true || true,
      });
    }

    // Step 6: Confirmation
    const config: SetupConfig = {
      installationType: installationType as 'user' | 'project' | 'both',
      projectPath,
      selectedComponents,
      options: {
        autoCheckpoint,
        validateTodos,
        runTests,
        gitIntegration,
      },
    };

    // Show summary unless quiet mode
    if (options.quiet !== true) {
      console.log(`\n${Colors.bold('Installation Summary')}`);
      console.log(Colors.dim('─'.repeat(40)));
      console.log(`\nInstallation type: ${Colors.accent(config.installationType)}`);
      if (config.installationType !== 'user') {
        console.log(`Project path: ${Colors.accent(config.projectPath)}`);
      }
      console.log(`\nComponents to install (${config.selectedComponents.length}):`);
      config.selectedComponents.forEach((id) => {
        const componentFile = registry.components.get(id);
        if (componentFile !== undefined) {
          console.log(`  • ${componentFile.metadata.name}`);
        }
      });

      console.log('\nOptions:');
      console.log(
        `  • Auto checkpoint: ${config.options.autoCheckpoint ? Colors.success('✓') : Colors.error('✗')}`
      );
      console.log(
        `  • Validate TODOs: ${config.options.validateTodos ? Colors.success('✓') : Colors.error('✗')}`
      );
      console.log(
        `  • Run tests: ${config.options.runTests ? Colors.success('✓') : Colors.error('✗')}`
      );
      console.log(
        `  • Git integration: ${config.options.gitIntegration ? Colors.success('✓') : Colors.error('✗')}`
      );
    }

    // Ask for confirmation unless non-interactive mode
    if (options.yes !== true && options.commands === undefined && options.hooks === undefined) {
      const proceed = await confirm({
        message: '\nProceed with installation?',
        default: true,
      });

      if (!proceed) {
        console.log(`\n${Colors.warn('Setup cancelled by user')}`);
        return;
      }
    }

    // Step 7: Execute installation
    const installProgressReporter = new ComponentProgressReporter({
      quiet: options.quiet,
      verbose: options.verbose,
    });

    try {
      // Prepare components list - convert ComponentFile to Component
      progressReporter.start('Preparing components...');

      const componentsToInstall = config.selectedComponents
        .map((id) => {
          const componentFile = registry.components.get(id);
          if (componentFile === undefined) {
            return undefined;
          }

          // Convert ComponentFile to Component
          return {
            id: componentFile.metadata.id,
            type: componentFile.type,
            name: componentFile.metadata.name,
            description: componentFile.metadata.description,
            path: componentFile.path,
            dependencies: componentFile.metadata.dependencies,
            platforms: componentFile.metadata.platforms as Platform[],
            category: componentFile.metadata.category,
            version: componentFile.metadata.version,
            author: componentFile.metadata.author,
            enabled: componentFile.metadata.enabled ?? true,
            config: {
              allowedTools: componentFile.metadata.allowedTools,
              argumentHint: componentFile.metadata.argumentHint,
              shellOptions: componentFile.metadata.shellOptions,
              timeout: componentFile.metadata.timeout,
              retries: componentFile.metadata.retries,
            },
            metadata: componentFile.metadata,
          } as Component;
        })
        .filter((c): c is Component => c !== undefined);

      // Filter components based on options
      const finalComponents = componentsToInstall.filter((component) => {
        if (config.options.autoCheckpoint !== true && component.id === 'auto-checkpoint') {
          return false;
        }
        if (config.options.validateTodos !== true && component.id === 'validate-todo-completion') {
          return false;
        }
        if (config.options.runTests !== true && component.id === 'run-related-tests') {
          return false;
        }
        if (config.options.gitIntegration !== true && component.category === 'git') {
          return false;
        }
        return true;
      });

      // Initialize progress tracking
      const componentNames = finalComponents.map((c) => c.name);
      installProgressReporter.initialize(componentNames);

      // Install based on installation type
      const installOptions: InstallOptions = {
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        onProgress: (progress) => {
          if (progress.currentStep?.component) {
            const componentName = progress.currentStep.component.name;
            switch (progress.phase) {
              case 'installing':
                installProgressReporter.componentProgress(componentName, 'installing');
                break;
              case 'complete':
                installProgressReporter.componentProgress(componentName, 'completed');
                break;
              case 'failed':
                installProgressReporter.componentProgress(componentName, 'failed');
                break;
            }
          }
        },
      };

      if (config.installationType === 'user' || config.installationType === 'both') {
        progressReporter.update('Installing user-level components...');
        const userInstallOptions = { ...installOptions, customPath: expandHomePath('~/.claude') };
        await installComponents(
          finalComponents.map((c) => ({ ...c, enabled: c.enabled ?? true })),
          'user',
          userInstallOptions
        );
      }

      if (config.installationType === 'project' || config.installationType === 'both') {
        progressReporter.update('Installing project-level components...');

        // Create .claude directory
        const claudeDir = path.join(config.projectPath, '.claude');
        await ensureDirectoryExists(claudeDir);

        // Install components
        const projectInstallOptions = { ...installOptions, customPath: config.projectPath };
        await installComponents(
          finalComponents.map((c) => ({ ...c, enabled: c.enabled ?? true })),
          'project',
          projectInstallOptions
        );

        // Create settings.json with hook configurations
        progressReporter.update('Creating settings.json...');
        await createProjectSettings(claudeDir, finalComponents);
      }

      progressReporter.succeed('Installation complete!');

      // Show next steps unless quiet mode
      if (options.quiet !== true) {
        console.log(`\n${Colors.bold(Colors.success('ClaudeKit setup complete!'))}`);
        console.log(Colors.dim('─'.repeat(40)));
        console.log('\nNext steps:');
        console.log(`  1. ${Colors.accent('claudekit validate')} - Check your installation`);
        console.log(`  2. ${Colors.accent('claudekit list')} - See available commands`);
        console.log(
          `  3. ${Colors.accent('.claude/settings.json')} - Customize your configuration`
        );
        console.log('\nHappy coding with Claude! 🚀');
      }
    } catch (error) {
      progressReporter.fail('Installation failed');
      installProgressReporter.fail('Component installation failed');
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message !== 'Setup cancelled') {
      logger.error(`Setup failed: ${error.message}`);
      console.log(`\n${Colors.error('Setup failed. Please check the error above.')}`);
    }
    throw error;
  }
}

/**
 * Create project settings.json with hook configurations
 */
interface HookSettings {
  hooks: {
    PostToolUse: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    Stop: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
  };
}

async function createProjectSettings(claudeDir: string, components: Component[]): Promise<void> {
  const settings: HookSettings = {
    hooks: {
      PostToolUse: [],
      Stop: [],
    },
  };

  // Add hooks based on installed components and options
  for (const component of components) {
    if (component.type === 'hook') {
      const hookPath = `.claude/hooks/${path.basename(component.path)}`;

      switch (component.id) {
        case 'typecheck':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.ts',
            hooks: [{ type: 'command', command: hookPath }],
          });
          break;

        case 'eslint':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}',
            hooks: [{ type: 'command', command: hookPath }],
          });
          break;

        case 'prettier':
          settings.hooks.PostToolUse.push({
            matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx,json,md}',
            hooks: [{ type: 'command', command: hookPath }],
          });
          break;

        case 'run-related-tests':
          settings.hooks.PostToolUse.push({
            matcher: 'Write,Edit,MultiEdit',
            hooks: [{ type: 'command', command: hookPath }],
          });
          break;

        case 'auto-checkpoint': {
          const stopEntry = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntry !== undefined) {
            stopEntry.hooks.push({ type: 'command', command: hookPath });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookPath }],
            });
          }
          break;
        }

        case 'validate-todo-completion': {
          const stopEntryTodo = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntryTodo !== undefined) {
            stopEntryTodo.hooks.push({ type: 'command', command: hookPath });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookPath }],
            });
          }
          break;
        }
      }
    }
  }

  // Write settings.json
  const settingsPath = path.join(claudeDir, 'settings.json');
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
}
