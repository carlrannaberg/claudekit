import { select, checkbox, input, confirm } from '@inquirer/prompts';
import { Colors } from '../utils/colors.js';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
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
import type { Component, ProjectInfo } from '../types/index.js';
import type { InstallOptions } from '../lib/installer.js';
import {
  groupAgentsByCategory,
  calculateSelectedAgents,
  getAgentDisplayName,
  type AgentComponent,
} from '../lib/agents/registry-grouping.js';
import { HOOK_REGISTRY } from '../hooks/registry.js';

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
      'review',
      'gh:repo-init',
      'dev:cleanup',
    ],
    recommended: true,
  },
  {
    id: 'ai-assistant',
    name: '🤖 AI Assistant Configuration',
    description: 'Manage AGENTS.md, create custom commands and subagents, and configure Claude Code',
    commands: [
      'agents-md:init',
      'agents-md:migration',
      'agents-md:cli',
      'create-command',
      'create-subagent',
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
    id: 'file-security',
    name: '🔒 File Security (PreToolUse)',
    description: 'Protect sensitive files from AI access - blocks .env, keys, credentials',
    hooks: ['file-guard'],
    recommended: true,
    triggerEvent: 'PreToolUse',
  },
  {
    id: 'file-validation',
    name: '📝 File Validation (PostToolUse)',
    description: 'Validate files immediately after modification - linting, types, and tests',
    hooks: [
      'lint-changed',
      'typecheck-changed',
      'check-any-changed',
      'test-changed',
      'check-comment-replacement',
    ],
    recommended: true,
    triggerEvent: 'PostToolUse',
  },
  {
    id: 'completion-validation',
    name: '✅ Completion Validation (Stop)',
    description: 'Ensure quality and task completion before stopping',
    hooks: ['typecheck-project', 'lint-project', 'test-project', 'check-todos', 'self-review'],
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
  {
    id: 'session-initialization',
    name: '🚀 Session Initialization (UserPromptSubmit)',
    description: 'Initialize project context and maps when user submits first prompt',
    hooks: ['codebase-map'],
    recommended: false,
    triggerEvent: 'UserPromptSubmit',
  },
];

/**
 * Perform improved three-step selection: command groups, hook groups, then agents
 */
async function performThreeStepSelection(
  projectInfo: ProjectInfo,
  registry: Awaited<ReturnType<typeof discoverComponents>>
): Promise<{ components: string[] }> {
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
    const availableHooks = Object.keys(HOOK_REGISTRY).sort();
    const individualHookChoices = availableHooks.map((hookId) => {
      const HookClass = HOOK_REGISTRY[hookId];
      const metadata = HookClass?.metadata;

      const description = metadata?.description ?? 'Hook description';
      const triggerEvent = metadata?.triggerEvent ?? 'Unknown';

      return {
        value: hookId,
        name: `${hookId} (${triggerEvent})\n  ${Colors.dim(description)}`,
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

  // Step 3: Agent Selection with new grouping system
  console.log(`\n${Colors.bold('Step 3: Choose AI Assistant Subagents (Optional)')}`);

  // Get total agent count for display
  const totalAgentCount = Array.from(registry.components.values()).filter(
    (c) => c.type === 'agent'
  ).length;

  // Ask if user wants agents
  const agentChoice = await select({
    message: 'Would you like to install AI assistant subagents?',
    choices: [
      {
        value: 'select',
        name: '📦 Select Agents ← RECOMMENDED\n  Choose which agents match your tools',
      },
      { value: 'all', name: `🌟 Install All\n  Get all ${totalAgentCount} available agents` },
      { value: 'skip', name: "⏭️  Skip Agents\n  Don't install any agents" },
    ],
    default: 'select',
  });

  if (agentChoice === 'skip') {
    console.log(Colors.dim('Skipping agent installation'));
  } else if (agentChoice === 'all') {
    // Get all agents from registry
    const allAgents = Array.from(registry.components.values())
      .filter((c) => c.type === 'agent')
      .map((c) => c.metadata.id);
    selectedComponents.push(...allAgents);
    console.log(Colors.success(`Selected all ${allAgents.length} agents`));
  } else {
    // Get agents from registry and group them by category
    const agentCategories = groupAgentsByCategory(registry);

    // Show the new selection interface
    console.log(`\n${Colors.bold('Select Your Development Stack')}`);
    console.log(Colors.dim('━'.repeat(63)));

    // Collect all selected agent IDs
    const selectedAgentIds: string[] = [];

    // Display each category and let user select agents
    for (const categoryGroup of agentCategories) {
      // Skip uncategorized group in normal flow
      if (categoryGroup.category === 'uncategorized') {
        continue;
      }

      console.log(`\n${Colors.accent(categoryGroup.title)}`);
      if (categoryGroup.description) {
        console.log(Colors.dim(categoryGroup.description));
      }

      const choices = categoryGroup.agents.map((agent: AgentComponent) => ({
        value: agent.id,
        name: getAgentDisplayName(agent),
        checked: categoryGroup.preSelected ?? false,
      }));

      const selected = (await checkbox({
        message: `Select ${categoryGroup.title.toLowerCase()}:`,
        choices,
        pageSize: Math.min(10, choices.length + 1),
      })) as string[];

      selectedAgentIds.push(...selected);
    }

    // Calculate final agent list (including bundled agents)
    const finalAgents = calculateSelectedAgents(registry, selectedAgentIds);

    selectedComponents.push(...finalAgents);
    console.log(Colors.success(`\n${finalAgents.length} agents selected`));
  }

  return { components: selectedComponents };
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
  agents?: string; // Comma-separated list of agent IDs
  project?: string;
  user?: boolean;
  selectIndividual?: boolean; // Flag for power users to select individual components
  all?: boolean;
  skipAgents?: boolean;
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
      options.agents !== undefined ||
      options.user === true;

    // Show welcome message (unless in non-interactive mode)
    if (!isNonInteractive || options.quiet !== true) {
      // Display logo for interactive mode
      if (!isNonInteractive) {
        try {
          console.log(); // Add spacing before logo
          const { renderFilled } = await import('oh-my-logo');
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
    if (options.yes === true || options.all === true || options.user === true) {
      // Default to project for --yes/--all, user only for --user
      installationType = options.user === true ? 'user' : 'project';
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
      } else if (options.yes !== true && options.all !== true && options.user !== true) {
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

    if (
      options.commands !== undefined ||
      options.hooks !== undefined ||
      options.agents !== undefined
    ) {
      // Parse component lists from flags
      const requestedCommands =
        options.commands !== undefined && options.commands !== ''
          ? options.commands.split(',').map((s) => s.trim())
          : [];
      const requestedHooks =
        options.hooks !== undefined && options.hooks !== ''
          ? options.hooks.split(',').map((s) => s.trim())
          : [];
      const requestedAgents =
        options.agents !== undefined && options.agents !== ''
          ? options.agents.split(',').map((s) => s.trim())
          : [];

      selectedComponents = [];

      // Validate and add commands and hooks
      for (const id of [...requestedCommands, ...requestedHooks]) {
        if (registry.components.has(id)) {
          selectedComponents.push(id);
        } else {
          throw new Error(`Component not found: ${id}`);
        }
      }

      // Validate agents
      for (const id of requestedAgents) {
        if (!registry.components.has(id)) {
          throw new Error(`Agent not found: ${id}`);
        }
      }

      // Calculate final agent list (including bundled/specialized agents)
      if (requestedAgents.length > 0) {
        const finalAgents = calculateSelectedAgents(registry, requestedAgents);
        selectedComponents.push(...finalAgents);
        if (options.quiet !== true) {
          console.log(
            Colors.success(`Selected ${finalAgents.length} agents (including specialized agents)`)
          );
        }
      }

      if (selectedComponents.length === 0) {
        throw new Error('No valid components specified');
      }
    } else if (options.yes === true || options.all === true || options.user === true) {
      // Default to essential and recommended components
      selectedComponents = [
        ...recommendations.essential.map((r) => r.component.metadata.id),
        ...recommendations.recommended.map((r) => r.component.metadata.id),
      ];

      // For --all flag, select all agents automatically
      if (options.all === true && options.skipAgents !== true) {
        // Get all agent components from registry
        const agentComponents = Array.from(registry.components.values())
          .filter((c) => c.type === 'agent')
          .map((c) => c.metadata.id);
        selectedComponents.push(...agentComponents);
      }
      // For --yes flag, select TypeScript agent by default (unless agents are skipped)
      else if (options.yes === true && options.skipAgents !== true) {
        const tsAgent = Array.from(registry.components.values()).find(
          (c) => c.type === 'agent' && c.metadata.id === 'typescript-expert'
        );
        if (tsAgent) {
          selectedComponents.push(tsAgent.metadata.id);
        }
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
      const selectionResult = await performThreeStepSelection(projectInfo, registry);
      selectedComponents = selectionResult.components;

      // Agents are now part of the unified component system, no special handling needed
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
      options.hooks === undefined &&
      options.agents === undefined
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
            category: componentFile.metadata.category,
            version: componentFile.metadata.version,
            author: componentFile.metadata.author,
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
        options.hooks !== undefined ||
        options.agents !== undefined;

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
        const userResult = await installComponents(finalComponents, 'user', userInstallOptions);

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
          finalComponents,
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

      // Agents are now installed as part of the unified component system

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

      // Complete the install progress reporter with agent count
      const agentCount = finalComponents.filter((c) => c.type === 'agent').length;
      installProgressReporter.complete({ agentCount });

      // Show completion summary unless quiet mode
      if (options.quiet !== true) {
        const commandCount = finalComponents.filter((c) => c.type === 'command').length;
        const hookCount = finalComponents.filter((c) => c.type === 'hook').length;
        const finalAgentCount = finalComponents.filter((c) => c.type === 'agent').length;
        const totalInstalled = commandCount + hookCount + finalAgentCount;

        console.log(`\n${Colors.bold(Colors.success('✨ Setup complete!'))}`);

        if (totalInstalled > 0) {
          console.log(`\n${Colors.bold('Installed items:')}`);
          if (commandCount > 0) {
            console.log(`• ${commandCount} slash command${commandCount !== 1 ? 's' : ''}`);
          }
          if (hookCount > 0) {
            console.log(`• ${hookCount} automated hook${hookCount !== 1 ? 's' : ''}`);
          }
          if (finalAgentCount > 0) {
            console.log(`• ${finalAgentCount} AI subagent${finalAgentCount !== 1 ? 's' : ''}`);
          }
        } else {
          console.log(`\n${Colors.warn('No items were selected for installation.')}`);
          console.log(`Run ${Colors.accent('claudekit setup')} again to select components.`);
        }

        console.log(Colors.dim(`\n${'─'.repeat(40)}`));
        console.log('\nNext steps:');
        console.log(`  1. ${Colors.accent('claudekit doctor')} - Check your installation`);
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
    PreToolUse?: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    PostToolUse: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    Stop: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    SubagentStop?: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    SessionStart?: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
    UserPromptSubmit?: Array<{ matcher: string; hooks: Array<{ type: string; command: string }> }>;
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
      PreToolUse: [],
      PostToolUse: [],
      Stop: [],
      SubagentStop: [],
      SessionStart: [],
      UserPromptSubmit: [],
    },
  };

  // Ensure required structure exists
  if (settings.hooks === null || settings.hooks === undefined) {
    settings.hooks = {
      PreToolUse: [],
      PostToolUse: [],
      Stop: [],
      SubagentStop: [],
      SessionStart: [],
      UserPromptSubmit: [],
    };
  }
  if (settings.hooks.PreToolUse === null || settings.hooks.PreToolUse === undefined) {
    settings.hooks.PreToolUse = [];
  }
  if (settings.hooks.PostToolUse === null || settings.hooks.PostToolUse === undefined) {
    settings.hooks.PostToolUse = [];
  }
  if (settings.hooks.Stop === null || settings.hooks.Stop === undefined) {
    settings.hooks.Stop = [];
  }
  if (settings.hooks.SubagentStop === null || settings.hooks.SubagentStop === undefined) {
    settings.hooks.SubagentStop = [];
  }
  if (settings.hooks.SessionStart === null || settings.hooks.SessionStart === undefined) {
    settings.hooks.SessionStart = [];
  }
  if (settings.hooks.UserPromptSubmit === null || settings.hooks.UserPromptSubmit === undefined) {
    settings.hooks.UserPromptSubmit = [];
  }

  // Helper function to check if a hook is already configured
  const isHookConfigured = (hookId: string): boolean => {
    // Create both old and new command formats to check
    const oldCommand = `.claude/hooks/${hookId}.sh`;
    const newCommand = `claudekit-hooks run ${hookId}`;

    // Check PreToolUse hooks
    if (settings.hooks.PreToolUse) {
      for (const entry of settings.hooks.PreToolUse) {
        if (entry.hooks.some((h) => h.command === oldCommand || h.command === newCommand)) {
          return true;
        }
      }
    }
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
    // Check SubagentStop hooks
    if (settings.hooks.SubagentStop) {
      for (const entry of settings.hooks.SubagentStop) {
        if (entry.hooks.some((h) => h.command === oldCommand || h.command === newCommand)) {
          return true;
        }
      }
    }
    // Check SessionStart hooks
    if (settings.hooks.SessionStart) {
      for (const entry of settings.hooks.SessionStart) {
        if (entry.hooks.some((h) => h.command === oldCommand || h.command === newCommand)) {
          return true;
        }
      }
    }
    // Check UserPromptSubmit hooks
    if (settings.hooks.UserPromptSubmit !== null && settings.hooks.UserPromptSubmit !== undefined) {
      for (const entry of settings.hooks.UserPromptSubmit) {
        if (entry.hooks.some((h) => h.command === oldCommand || h.command === newCommand)) {
          return true;
        }
      }
    }
    return false;
  };

  // Helper function to add a hook to a specific event type
  const addHookToEvent = (
    eventType: keyof HookSettings['hooks'],
    matcher: string,
    hookCommand: string,
    mergeWithExisting: boolean = true
  ): void => {
    // Ensure the event type array exists
    if (settings.hooks[eventType] === undefined) {
      settings.hooks[eventType] = [];
    }

    const eventHooks = settings.hooks[eventType];
    if (eventHooks === undefined) {
      return; // This should never happen due to the check above, but satisfies TypeScript
    }

    if (mergeWithExisting) {
      // Try to find existing entry with same matcher
      const existingEntry = eventHooks.find((e) => e.matcher === matcher);
      if (existingEntry !== undefined) {
        existingEntry.hooks.push({ type: 'command', command: hookCommand });
      } else {
        eventHooks.push({
          matcher,
          hooks: [{ type: 'command', command: hookCommand }],
        });
      }
    } else {
      // Just add a new entry (for PostToolUse backward compatibility)
      eventHooks.push({
        matcher,
        hooks: [{ type: 'command', command: hookCommand }],
      });
    }
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

      // Use metadata from HOOK_REGISTRY to configure the hook
      const HookClass = HOOK_REGISTRY[component.id];
      const metadata = HookClass?.metadata;

      if (metadata !== undefined) {
        const matcher = metadata.matcher ?? 'Write|Edit|MultiEdit';
        const triggerEvents = Array.isArray(metadata.triggerEvent)
          ? metadata.triggerEvent
          : [metadata.triggerEvent];

        for (const triggerEvent of triggerEvents) {
          // PostToolUse maintains backward compatibility by not merging
          const shouldMerge = triggerEvent !== 'PostToolUse';
          addHookToEvent(triggerEvent as keyof HookSettings['hooks'], matcher, hookCommand, shouldMerge);
        }
      } else if (component.id === 'prettier') {
        // Handle non-registry hooks (e.g., prettier)
        settings.hooks.PostToolUse.push({
          matcher: 'Write|Edit|MultiEdit',
          hooks: [{ type: 'command', command: hookCommand }],
        });
      } else {
        // Fallback for hooks not in registry (shouldn't happen with embedded hooks)
        console.warn(`Hook ${component.id} not found in registry, skipping settings generation`);
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
