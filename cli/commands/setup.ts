import { select, checkbox, input, confirm } from '@inquirer/prompts';
import { Colors } from '../utils/colors.js';
import path from 'path';
import { promises as fs } from 'fs';
import { Logger } from '../utils/logger.js';
import { createProgressReporter, ComponentProgressReporter } from '../utils/progress.js';
import { renderFilled } from 'oh-my-logo';
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
import type { Component, Platform, ProjectInfo } from '../types/index.js';
import type { InstallOptions } from '../lib/installer.js';

// Agent interface for subagents management
interface Agent {
  id: string;
  name: string;
  description: string;
  path: string;
}

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
    commands: [
      'git:commit',
      'git:status',
      'git:push',
      'checkpoint:create',
      'checkpoint:list',
      'checkpoint:restore',
      'validate-and-fix',
      'gh:repo-init',
      'dev:cleanup',
    ],
    recommended: true,
  },
  {
    id: 'ai-assistant',
    name: '🤖 AI Assistant Configuration',
    description: 'Manage AGENT.md, create custom commands, and configure Claude Code',
    commands: [
      'agent:init',
      'agent:migration',
      'agent:cli',
      'create-command',
      'config:bash-timeout',
    ],
    recommended: false,
  },
  {
    id: 'spec-management',
    name: '📋 Specification Management',
    description: 'Spec-driven development: create, validate, decompose, and execute specifications',
    commands: ['spec:create', 'spec:validate', 'spec:decompose', 'spec:execute'],
    recommended: false,
  },
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
    hooks: ['lint-changed', 'typecheck-changed', 'check-any-changed', 'test-changed'],
    recommended: true,
    triggerEvent: 'PostToolUse',
  },
  {
    id: 'completion-validation',
    name: '✅ Completion Validation (Stop)',
    description: 'Ensure quality and task completion before stopping',
    hooks: ['typecheck-project', 'lint-project', 'test-project', 'check-todos'],
    recommended: true,
    triggerEvent: 'Stop',
  },
  {
    id: 'safety-checkpoint',
    name: '💾 Safety Checkpoint (Stop)',
    description: 'Automatically save work when Claude Code stops',
    hooks: ['create-checkpoint'],
    recommended: false,
    triggerEvent: 'Stop',
  },
];

// Agent definitions (MVP: just TypeScript)
const AGENTS: Agent[] = [
  {
    id: 'typescript-expert',
    name: 'TypeScript Expert',
    description: 'TypeScript/JavaScript guidance',
    path: 'typescript/expert.md',
  },
];

/**
 * Install selected agents to the project
 */
async function installAgents(
  selectedAgentIds: string[],
  projectPath: string,
  options: { verbose?: boolean; quiet?: boolean } = {}
): Promise<void> {
  if (selectedAgentIds.length === 0) {
    return;
  }

  const logger = new Logger();
  if (options.verbose === true) {
    logger.setLevel('debug');
  } else if (options.quiet === true) {
    logger.setLevel('error');
  }

  if (options.quiet !== true) {
    console.log('\n🤖 Installing subagents...');
  }

  const agentsDir = path.join(projectPath, '.claude', 'agents');
  await ensureDirectoryExists(agentsDir);

  // Get the components directory for agent files
  const srcDir = await findComponentsDirectory();

  for (const agentId of selectedAgentIds) {
    const agent = AGENTS.find((a) => a.id === agentId);
    if (!agent) {
      logger.warn(`Agent not found: ${agentId}`);
      continue;
    }

    const destPath = path.join(agentsDir, `${agent.id}.md`);

    try {
      // Compute source path inside try block for proper error handling
      const sourcePath = path.join(srcDir, 'agents', agent.path);
      
      // Check if source file exists
      await fs.access(sourcePath);
      await fs.copyFile(sourcePath, destPath);

      if (options.quiet !== true) {
        console.log(`  ✅ ${agent.id}`);
      }
    } catch {
      // If source file doesn't exist, create a placeholder
      if (options.verbose === true) {
        const sourcePath = path.join(srcDir, 'agents', agent.path);
        logger.warn(`Source file not found: ${sourcePath}, creating placeholder`);
      }

      const agentContent = `# ${agent.name}

${agent.description}

This is a placeholder for the ${agent.name} subagent.
`;

      await fs.writeFile(destPath, agentContent);

      if (options.quiet !== true) {
        console.log(`  ✅ ${agent.id} (placeholder)`);
      }
    }
  }
}

/**
 * Perform improved three-step selection: command groups, hook groups, then agents
 */
async function performThreeStepSelection(
  projectInfo: ProjectInfo
): Promise<{ components: string[]; selectedAgents: string[] }> {
  const selectedComponents: string[] = [];

  // Step 1: Command Group Selection
  console.log(`\n${Colors.bold('Step 1: Choose Command Groups')}`);
  console.log(Colors.dim('Select groups of slash commands for Claude Code'));

  const commandChoices = COMMAND_GROUPS.map((group) => {
    const commandList = group.commands.map((cmd) => `/${cmd}`).join(', ');
    return {
      value: group.id,
      name: `${group.name}\n  ${Colors.dim(group.description)}\n  ${Colors.accent('Commands:')} ${Colors.dim(commandList)}`,
      checked: group.recommended,
      disabled: false,
    };
  });

  // Add hint about keyboard shortcuts
  console.log(
    Colors.dim(
      `\n(${COMMAND_GROUPS.length} groups - use space to toggle, 'a' to select/deselect all, enter to confirm)\n`
    )
  );

  const selectedGroups = (await checkbox({
    message: 'Select command groups to install:',
    choices: commandChoices,
    pageSize: 20, // Large page size ensures all groups are visible without scrolling
  })) as string[];

  // Add selected commands from groups
  for (const groupId of selectedGroups) {
    const group = COMMAND_GROUPS.find((g) => g.id === groupId);
    if (group) {
      selectedComponents.push(...group.commands);
    }
  }

  // Step 2: Hook Group Selection
  console.log(`\n${Colors.bold('Step 2: Choose Validation Hooks')}`);
  console.log(Colors.dim('Select automated hooks by when they run and what they do'));

  const hookGroupChoices = HOOK_GROUPS.map((group) => ({
    value: group.id,
    name: group.name,
    description: group.description,
    hooks: group.hooks,
    checked:
      group.recommended &&
      // Only recommend JS/TS hooks if project uses those languages
      (group.id === 'file-validation'
        ? projectInfo.hasTypeScript === true || projectInfo.hasESLint === true
        : true),
    triggerEvent: group.triggerEvent,
  }));

  const hookChoices = HOOK_GROUPS.map((group) => {
    const hooksList = group.hooks.join(', ');
    return {
      value: group.id,
      name: `${group.name}\n  ${Colors.dim(group.description)}\n  ${Colors.accent('Hooks:')} ${Colors.dim(hooksList)}`,
      checked: hookGroupChoices.find((g) => g.value === group.id)?.checked ?? false,
      disabled: false,
    };
  });

  // Add custom selection option
  const customChoice = {
    value: '__CUSTOM__',
    name: `${Colors.bold('⚙️  Custom Selection')}\n  ${Colors.dim('Choose individual hooks manually for fine-grained control')}`,
    checked: false,
    disabled: false,
  };

  const allHookChoices = [...hookChoices, customChoice];

  // Add hint
  console.log(
    Colors.dim(
      `\n(${HOOK_GROUPS.length} groups + custom option - use space to toggle, enter to confirm)\n`
    )
  );

  let selectedHookGroups = (await checkbox({
    message: 'Select hook groups to install:',
    choices: allHookChoices,
    pageSize: 20, // Large page size ensures all options are visible without scrolling
  })) as string[];

  // If other groups are selected along with custom, remove custom to avoid confusion
  if (selectedHookGroups.length > 1 && selectedHookGroups.includes('__CUSTOM__')) {
    selectedHookGroups = selectedHookGroups.filter((id) => id !== '__CUSTOM__');
  }

  // Handle custom selection only if it's the only selection
  if (selectedHookGroups.length === 1 && selectedHookGroups[0] === '__CUSTOM__') {
    const availableHooks = [
      'auto-checkpoint',
      'eslint',
      'typecheck',
      'run-related-tests',
      'project-validation',
      'validate-todo-completion',
    ];
    const individualHookChoices = availableHooks.map((hook) => {
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
        checked: false,
      };
    });

    console.log(
      Colors.dim(
        `\n(${individualHookChoices.length} individual hooks available - press 'a' to toggle all)\n`
      )
    );

    const selectedIndividualHooks = (await checkbox({
      message: 'Select individual hooks:',
      choices: individualHookChoices,
      pageSize: 10,
    })) as string[];

    selectedComponents.push(...selectedIndividualHooks);
  }

  // Add selected hooks from groups (excluding custom)
  const regularGroups = selectedHookGroups.filter((id) => id !== '__CUSTOM__');
  for (const groupId of regularGroups) {
    const group = HOOK_GROUPS.find((g) => g.id === groupId);
    if (group) {
      selectedComponents.push(...group.hooks);
    }
  }

  // Step 3: Agent Selection
  console.log(`\n${Colors.bold('Step 3: Choose Subagents')}`);
  console.log(Colors.dim('Select AI assistant subagents to install'));

  const agentChoices = AGENTS.map((agent) => ({
    value: agent.id,
    name: `${agent.name}\n  ${Colors.dim(agent.description)}`,
    checked: true, // Default to checked
    disabled: false,
  }));

  console.log(
    Colors.dim(`\n(${AGENTS.length} agents available - use space to toggle, enter to confirm)\n`)
  );

  const selectedAgents = (await checkbox({
    message: 'Select subagents to install:',
    choices: agentChoices,
    pageSize: 10,
  })) as string[];

  return { components: selectedComponents, selectedAgents };
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
  all?: boolean;
  skipAgents?: boolean;
  selectedAgents?: string[]; // Store selected agents for installation
}

interface SetupConfig {
  installationType: 'user' | 'project';
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
 * Setup wizard for claudekit with interactive and non-interactive modes
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
      options.all === true ||
      options.commands !== undefined ||
      options.hooks !== undefined ||
      options.commandsOnly === true;

    // Show welcome message (unless in non-interactive mode)
    if (!isNonInteractive || options.quiet !== true) {
      // Display logo for interactive mode
      if (!isNonInteractive) {
        try {
          console.log(); // Add spacing before logo
          await renderFilled('claudekit', { palette: 'sunset' });
          console.log(); // Add spacing after logo
        } catch {
          // Fallback to text if logo fails
          console.log(Colors.bold(Colors.accent('\nclaudekit Setup Wizard')));
        }
        console.log(Colors.dim('─'.repeat(60)));

        console.log(
          '\nWelcome to claudekit! This wizard will help you configure claudekit\n' +
            'for your development workflow. claudekit provides:\n\n' +
            '  • Automated code quality checks (TypeScript, ESLint, Prettier)\n' +
            '  • Git workflow integration (checkpoints, smart commits)\n' +
            '  • AI assistant configuration management\n' +
            '  • Custom commands and hooks for Claude Code\n'
        );
      } else {
        // Simple text for non-interactive mode
        console.log(Colors.bold(Colors.accent('\nclaudekit Setup Wizard')));
        console.log(Colors.dim('─'.repeat(40)));
      }
    }

    // Step 1: Installation type
    let installationType: string;
    if (options.yes === true || options.all === true || options.commandsOnly === true) {
      // Default to project for --yes/--all, user only for --commands-only
      installationType = options.commandsOnly === true ? 'user' : 'project';
    } else {
      installationType = await select({
        message: 'How would you like to install claudekit?',
        choices: [
          {
            value: 'project',
            name: 'Project only - Install in the current project directory',
          },
          {
            value: 'user',
            name: 'User only - Install globally for all projects (~/.claude)',
          },
        ],
      });
    }

    // Step 2: Project path (if project installation)
    let projectPath = process.cwd();
    if (installationType === 'project') {
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
      } else if (options.yes !== true && options.all !== true && options.commandsOnly !== true) {
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
      if (options.verbose === true) {
        console.log(`Components directory found at: ${srcDir}`);
      }
    } catch (error) {
      progressReporter.fail('Failed to locate components');
      throw new Error(
        `Could not find claudekit components: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
    const registry = await discoverComponents(srcDir);
    if (options.verbose === true) {
      console.log(
        `Discovered ${registry.components.size} components in ${registry.categories.size} categories`
      );
    }

    progressReporter.update('Generating recommendations...');
    const recommendations = await recommendComponents(projectInfo, registry);
    if (options.verbose === true) {
      console.log(
        `Generated ${recommendations.recommended.length} recommended and ${recommendations.optional.length} optional components`
      );
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
    } else if (options.yes === true || options.all === true || options.commandsOnly === true) {
      // Default to essential and recommended components
      selectedComponents = [
        ...recommendations.essential.map((r) => r.component.metadata.id),
        ...recommendations.recommended.map((r) => r.component.metadata.id),
      ];

      // For --all flag, also select all agents automatically
      if (options.all === true && options.skipAgents !== true) {
        options.selectedAgents = AGENTS.map((agent) => agent.id);
      }
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
      // New improved three-step selection process
      const selectionResult = await performThreeStepSelection(projectInfo);
      selectedComponents = selectionResult.components;

      // Store selected agents for later installation
      const selectedAgents = selectionResult.selectedAgents;

      // Install agents if any were selected and not skipped
      if (
        selectedAgents !== null &&
        selectedAgents !== undefined &&
        selectedAgents.length > 0 &&
        options.skipAgents !== true
      ) {
        // Agents will be installed after the main installation step
        // Store them for later use
        options.selectedAgents = selectedAgents;
      }
    }

    // Step 5: Set configuration based on selected components
    // These are now determined by which hooks/commands the user selected
    const autoCheckpoint = selectedComponents.includes('create-checkpoint');
    const validateTodos = selectedComponents.includes('check-todos');
    const runTests =
      selectedComponents.includes('test-changed') || selectedComponents.includes('test-project');
    const gitIntegration = selectedComponents.some(
      (id) => id.startsWith('git:') || id.startsWith('checkpoint:') || id === 'create-checkpoint'
    );

    // Step 6: Confirmation
    const config: SetupConfig = {
      installationType: installationType as 'user' | 'project',
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
      // Separate commands and hooks for clearer display
      const selectedCommands = config.selectedComponents.filter(
        (id) => registry.components.get(id)?.type === 'command'
      );
      const selectedHooks = config.selectedComponents.filter(
        (id) => registry.components.get(id)?.type === 'hook'
      );

      if (selectedCommands.length > 0) {
        console.log(`\nSlash commands (${selectedCommands.length}):`);
        selectedCommands.forEach((id) => {
          const componentFile = registry.components.get(id);
          if (componentFile !== undefined) {
            console.log(`  • /${id}`);
          }
        });
      }

      if (selectedHooks.length > 0) {
        console.log(`\nValidation hooks (${selectedHooks.length}):`);
        selectedHooks.forEach((id) => {
          const componentFile = registry.components.get(id);
          if (componentFile !== undefined) {
            console.log(`  • ${componentFile.metadata.name}`);
          }
        });
      }
    }

    // Ask for confirmation unless non-interactive mode
    if (
      options.yes !== true &&
      options.all !== true &&
      options.commands === undefined &&
      options.hooks === undefined
    ) {
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

      // Use all selected components
      const finalComponents = componentsToInstall;

      // Initialize progress tracking
      const componentNames = finalComponents.map((c) => c.name);
      installProgressReporter.initialize(componentNames);

      // Track settings backup for cleanup
      let settingsBackupPath: string | null = null;

      // Install based on installation type
      const isNonInteractive =
        options.yes === true ||
        options.all === true ||
        options.commands !== undefined ||
        options.hooks !== undefined;

      const installOptions: InstallOptions = {
        dryRun: options.dryRun ?? false,
        force: options.force ?? false,
        interactive: !isNonInteractive,
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
        onPromptStart: () => {
          // Pause ALL progress reporters to show the prompt
          progressReporter.stop();
          installProgressReporter.stop();
        },
        onPromptEnd: () => {
          // Resume progress reporting after prompt
          // The next onProgress call will restart the spinners
        },
      };

      if (config.installationType === 'user') {
        progressReporter.update('Installing user-level components...');
        const userInstallOptions = { ...installOptions, customPath: expandHomePath('~/.claude') };
        const userResult = await installComponents(
          finalComponents.map((c) => ({ ...c, enabled: c.enabled ?? true })),
          'user',
          userInstallOptions
        );

        if (!userResult.success) {
          throw new Error(
            userResult.errors?.[0] !== null &&
            userResult.errors?.[0] !== undefined &&
            userResult.errors[0] !== ''
              ? userResult.errors[0]
              : 'User installation failed'
          );
        }
      }

      if (config.installationType === 'project') {
        progressReporter.update('Installing project-level components...');

        // Create .claude directory
        const claudeDir = path.join(config.projectPath, '.claude');
        await ensureDirectoryExists(claudeDir);

        // Install components with the project path
        const projectInstallOptions = {
          ...installOptions,
          customPath: claudeDir, // Use the .claude directory as the custom path
        };
        const projectResult = await installComponents(
          finalComponents.map((c) => ({ ...c, enabled: c.enabled ?? true })),
          'project',
          projectInstallOptions
        );

        if (!projectResult.success) {
          throw new Error(
            projectResult.errors?.[0] !== null &&
            projectResult.errors?.[0] !== undefined &&
            projectResult.errors[0] !== ''
              ? projectResult.errors[0]
              : 'Project installation failed'
          );
        }

        // Create settings.json with hook configurations
        progressReporter.update('Creating settings.json...');
        settingsBackupPath = await createProjectSettings(
          claudeDir,
          finalComponents,
          installOptions
        );
      }

      // Install agents if selected
      if (
        options.selectedAgents !== undefined &&
        options.selectedAgents.length > 0 &&
        config.installationType === 'project'
      ) {
        progressReporter.update('Installing subagents...');
        await installAgents(options.selectedAgents, config.projectPath, {
          verbose: options.verbose === true,
          quiet: options.quiet === true,
        });
      }

      progressReporter.succeed('Installation complete!');

      // Clean up settings backup file if it was created
      if (
        settingsBackupPath !== null &&
        settingsBackupPath !== undefined &&
        settingsBackupPath !== ''
      ) {
        try {
          await fs.unlink(settingsBackupPath);
          if (options.verbose === true) {
            console.log(Colors.dim(`Cleaned up settings backup: ${settingsBackupPath}`));
          }
        } catch (error) {
          // Log warning but don't fail installation
          console.log(
            Colors.dim(`Warning: Could not clean up backup file ${settingsBackupPath}: ${error}`)
          );
        }
      }

      // Complete the install progress reporter
      installProgressReporter.complete();

      // Show completion summary unless quiet mode
      if (options.quiet !== true) {
        const commandCount = finalComponents.filter((c) => c.type === 'command').length;
        const hookCount = finalComponents.filter((c) => c.type === 'hook').length;
        const agentCount = options.selectedAgents ? options.selectedAgents.length : 0;

        console.log(`\n${Colors.bold(Colors.success('✨ Setup complete! Claude Code now has:'))}`);
        console.log(`• ${commandCount} slash command${commandCount !== 1 ? 's' : ''}`);
        console.log(`• ${hookCount} automated hook${hookCount !== 1 ? 's' : ''}`);
        if (agentCount > 0) {
          console.log(`• ${agentCount} subagent${agentCount !== 1 ? 's' : ''}`);
        }

        console.log(Colors.dim(`\n${'─'.repeat(40)}`));
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

async function createProjectSettings(
  claudeDir: string,
  components: Component[],
  options: InstallOptions
): Promise<string | null> {
  const settingsPath = path.join(claudeDir, 'settings.json');
  let backupPath: string | null = null;

  // Read existing settings if present
  let existingSettings: HookSettings | null = null;
  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    existingSettings = JSON.parse(content) as HookSettings;
  } catch {
    // No existing settings or invalid JSON
  }

  // Start with existing settings or create new structure
  const settings: HookSettings = existingSettings ?? {
    hooks: {
      PostToolUse: [],
      Stop: [],
    },
  };

  // Ensure required structure exists
  if (settings.hooks === null || settings.hooks === undefined) {
    settings.hooks = {
      PostToolUse: [],
      Stop: [],
    };
  }
  if (settings.hooks.PostToolUse === null || settings.hooks.PostToolUse === undefined) {
    settings.hooks.PostToolUse = [];
  }
  if (settings.hooks.Stop === null || settings.hooks.Stop === undefined) {
    settings.hooks.Stop = [];
  }

  // Helper function to check if a hook is already configured
  const isHookConfigured = (hookId: string): boolean => {
    // Create both old and new command formats to check
    const oldCommand = `.claude/hooks/${hookId}.sh`;
    const newCommand = `claudekit-hooks run ${hookId}`;

    // Check PostToolUse hooks
    for (const entry of settings.hooks.PostToolUse) {
      if (entry.hooks.some((h) => h.command === oldCommand || h.command === newCommand)) {
        return true;
      }
    }
    // Check Stop hooks
    for (const entry of settings.hooks.Stop) {
      if (entry.hooks.some((h) => h.command === oldCommand || h.command === newCommand)) {
        return true;
      }
    }
    return false;
  };

  // Add hooks based on installed components and options
  for (const component of components) {
    if (component.type === 'hook') {
      // Use embedded hook command format
      const hookCommand = `claudekit-hooks run ${component.id}`;

      // Skip if this hook is already configured
      if (isHookConfigured(component.id)) {
        continue;
      }

      switch (component.id) {
        case 'typecheck-changed':
          settings.hooks.PostToolUse.push({
            matcher: 'Write|Edit|MultiEdit',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'lint-changed':
          settings.hooks.PostToolUse.push({
            matcher: 'Write|Edit|MultiEdit',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'prettier':
          settings.hooks.PostToolUse.push({
            matcher: 'Write|Edit|MultiEdit',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'check-any-changed':
          settings.hooks.PostToolUse.push({
            matcher: 'Write|Edit|MultiEdit',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'test-changed':
          settings.hooks.PostToolUse.push({
            matcher: 'Write,Edit,MultiEdit',
            hooks: [{ type: 'command', command: hookCommand }],
          });
          break;

        case 'create-checkpoint': {
          const stopEntry = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntry !== undefined) {
            stopEntry.hooks.push({ type: 'command', command: hookCommand });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
          break;
        }

        case 'check-todos': {
          const stopEntryTodo = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntryTodo !== undefined) {
            stopEntryTodo.hooks.push({ type: 'command', command: hookCommand });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
          break;
        }

        case 'typecheck-project':
        case 'lint-project':
        case 'test-project': {
          // Add project-wide hooks to Stop hooks
          const stopEntryValidation = settings.hooks.Stop.find((e) => e.matcher === '*');
          if (stopEntryValidation !== undefined) {
            stopEntryValidation.hooks.push({ type: 'command', command: hookCommand });
          } else {
            settings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
          break;
        }
      }
    }
  }

  // Write settings.json with conflict detection
  const newContent = JSON.stringify(settings, null, 2);

  // Check if file exists and has different content
  if (await pathExists(settingsPath)) {
    const existingContent = await fs.readFile(settingsPath, 'utf-8');
    if (existingContent !== newContent) {
      // In non-interactive mode, throw error
      if (options.interactive === false && options.force !== true) {
        throw new Error(
          `\nFile conflict detected: ${settingsPath} already exists with different content.\n` +
            `To overwrite existing files, run with --force flag.`
        );
      }

      // In interactive mode, prompt for confirmation
      if (options.force !== true) {
        // Interactive conflict resolution
        if (options.onPromptStart) {
          options.onPromptStart();
        }

        // Clear the spinner and show conflict info
        process.stdout.write('\x1B[2K\r');
        console.log(`\n${Colors.warn('━━━ Settings Conflict Detected ━━━')}`);
        console.log(`File: ${Colors.accent(settingsPath)}`);
        console.log(`This file already exists with different content.`);
        console.log(`The setup wants to add new hook configurations.`);
        console.log('');

        const shouldOverwrite = await confirm({
          message: 'Do you want to update the settings file?',
          default: true,
        });

        console.log(''); // Add spacing after prompt

        // Notify that prompt is done
        if (options.onPromptEnd) {
          options.onPromptEnd();
        }

        if (!shouldOverwrite) {
          console.log(Colors.info('Skipping settings.json update'));
          return null;
        }

        // Create backup if requested
        if (options.backup !== false) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          backupPath = `${settingsPath}.backup-${timestamp}`;
          await fs.copyFile(settingsPath, backupPath);
          console.log(Colors.dim(`Created backup: ${backupPath}`));
        }
      }
    } else {
      // Files are identical, skip
      return null;
    }
  }

  // Write the new content
  await fs.writeFile(settingsPath, newContent);

  // Return backup path for cleanup
  return backupPath;
}
