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
    description: 'Git operations, checkpoints, validation, and daily development tools',
    commands: ['git:commit', 'git:status', 'git:push', 'checkpoint:create', 'checkpoint:list', 'checkpoint:restore', 'validate-and-fix', 'gh:repo-init', 'dev:cleanup'],
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
    description: 'Spec-driven development: create, validate, decompose, and execute specifications',
    commands: ['spec:create', 'spec:validate', 'spec:decompose', 'spec:execute'],
    recommended: false
  }
];

interface HookGroup {
  id: string;
  name: string;
  description: string;
  hooks: string[];
  recommended: boolean;
  triggerEvent: string;
}

const HOOK_GROUPS: HookGroup[] = [
  {
    id: 'file-validation',
    name: '📝 File Validation (PostToolUse)',
    description: 'Validate files immediately after modification - linting, types, and tests',
    hooks: ['eslint', 'typecheck', 'run-related-tests'],
    recommended: true,
    triggerEvent: 'PostToolUse'
  },
  {
    id: 'completion-validation',
    name: '✅ Completion Validation (Stop)',
    description: 'Ensure quality and task completion before stopping',
    hooks: ['project-validation', 'validate-todo-completion'],
    recommended: true,
    triggerEvent: 'Stop'
  },
  {
    id: 'safety-checkpoint',
    name: '💾 Safety Checkpoint (Stop)',
    description: 'Automatically save work when Claude Code stops',
    hooks: ['auto-checkpoint'],
    recommended: false,
    triggerEvent: 'Stop'
  }
];

/**
 * Perform improved two-step selection: command groups then hook groups
 */
async function performTwoStepSelection(projectInfo: any): Promise<string[]> {
  const selectedComponents: string[] = [];

  // Step 1: Command Group Selection
  console.log(`\n${Colors.bold('Step 1: Choose Command Groups')}`);
  console.log(Colors.dim('Select groups of slash commands for Claude Code'));

  const commandChoices = COMMAND_GROUPS.map(group => {
    const commandList = group.commands.map(cmd => `/${cmd}`).join(', ');
    return {
      value: group.id,
      name: `${group.name}\n  ${Colors.dim(group.description)}\n  ${Colors.accent('Commands:')} ${Colors.dim(commandList)}`,
      checked: group.recommended,
      disabled: false
    };
  });

  // Add hint about keyboard shortcuts
  console.log(Colors.dim(`\n(${COMMAND_GROUPS.length} groups - use space to toggle, 'a' to select/deselect all, enter to confirm)\n`));

  const selectedGroups = (await checkbox({
    message: 'Select command groups to install:',
    choices: commandChoices,
    pageSize: 20 // Large page size ensures all groups are visible without scrolling
  })) as string[];

  // Add selected commands from groups
  for (const groupId of selectedGroups) {
    const group = COMMAND_GROUPS.find(g => g.id === groupId);
    if (group) {
      selectedComponents.push(...group.commands);
    }
  }

  // Step 2: Hook Group Selection
  console.log(`\n${Colors.bold('Step 2: Choose Validation Hooks')}`);
  console.log(Colors.dim('Select automated hooks by when they run and what they do'));

  const hookGroupChoices = HOOK_GROUPS.map(group => ({
    value: group.id,
    name: group.name,
    description: group.description,
    hooks: group.hooks,
    checked: group.recommended && (
      // Only recommend JS/TS hooks if project uses those languages
      group.id === 'file-validation' ? (projectInfo.hasTypeScript || projectInfo.hasEslint) : true
    ),
    triggerEvent: group.triggerEvent
  }));

  const hookChoices = HOOK_GROUPS.map(group => {
    const hooksList = group.hooks.join(', ');
    return {
      value: group.id,
      name: `${group.name}\n  ${Colors.dim(group.description)}\n  ${Colors.accent('Hooks:')} ${Colors.dim(hooksList)}`,
      checked: hookGroupChoices.find(g => g.value === group.id)?.checked || false,
      disabled: false
    };
  });

  // Add custom selection option
  const customChoice = {
    value: '__CUSTOM__',
    name: `${Colors.bold('⚙️  Custom Selection')}\n  ${Colors.dim('Choose individual hooks manually for fine-grained control')}`,
    checked: false,
    disabled: false
  };

  const allHookChoices = [...hookChoices, customChoice];

  // Add hint
  console.log(Colors.dim(`\n(${HOOK_GROUPS.length} groups + custom option - use space to toggle, enter to confirm)\n`));

  let selectedHookGroups = (await checkbox({
    message: 'Select hook groups to install:',
    choices: allHookChoices,
    pageSize: 20 // Large page size ensures all options are visible without scrolling
  })) as string[];

  // If other groups are selected along with custom, remove custom to avoid confusion
  if (selectedHookGroups.length > 1 && selectedHookGroups.includes('__CUSTOM__')) {
    selectedHookGroups = selectedHookGroups.filter(id => id !== '__CUSTOM__');
  }

  // Handle custom selection only if it's the only selection
  if (selectedHookGroups.length === 1 && selectedHookGroups[0] === '__CUSTOM__') {
    const availableHooks = ['auto-checkpoint', 'eslint', 'typecheck', 'run-related-tests', 'project-validation', 'validate-todo-completion'];
    const individualHookChoices = availableHooks.map(hook => {
      let description = '';
      let triggerEvent = '';
      switch (hook) {
        case 'auto-checkpoint': 
          description = 'Automatic git checkpoints when stopping';
          triggerEvent = 'Stop';
          break;
        case 'eslint': 
          description = 'ESLint validation for JS/TS files';
          triggerEvent = 'PostToolUse';
          break;
        case 'typecheck': 
          description = 'TypeScript type checking';
          triggerEvent = 'PostToolUse';
          break;
        case 'run-related-tests': 
          description = 'Run tests related to modified files';
          triggerEvent = 'PostToolUse';
          break;
        case 'project-validation': 
          description = 'Comprehensive project validation';
          triggerEvent = 'Stop';
          break;
        case 'validate-todo-completion': 
          description = 'Ensure todos are completed';
          triggerEvent = 'Stop';
          break;
      }
      return {
        value: hook,
        name: `${hook} (${triggerEvent})\n  ${Colors.dim(description)}`,
        checked: false
      };
    });

    console.log(Colors.dim(`\n(${individualHookChoices.length} individual hooks available - press 'a' to toggle all)\n`));
    
    const selectedIndividualHooks = (await checkbox({
      message: 'Select individual hooks:',
      choices: individualHookChoices,
      pageSize: 10
    })) as string[];

    selectedComponents.push(...selectedIndividualHooks);
  }

  // Add selected hooks from groups (excluding custom)
  const regularGroups = selectedHookGroups.filter(id => id !== '__CUSTOM__');
  for (const groupId of regularGroups) {
    const group = HOOK_GROUPS.find(g => g.id === groupId);
    if (group) {
      selectedComponents.push(...group.hooks);
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

    // Step 5: Set configuration based on selected components
    // These are now determined by which hooks/commands the user selected
    const autoCheckpoint = selectedComponents.includes('auto-checkpoint');
    const validateTodos = selectedComponents.includes('validate-todo-completion');
    const runTests = selectedComponents.includes('run-related-tests');
    const gitIntegration = selectedComponents.some(id => id.startsWith('git:') || id.startsWith('checkpoint:'));

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
