import chalk from 'chalk';
import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  detectProjectContext,
  discoverComponents,
  recommendComponents,
  formatRecommendationSummary,
} from '../lib/index.js';

interface InitOptions {
  force?: boolean;
  skipRecommendations?: boolean;
}

export async function init(options: InitOptions): Promise<void> {
  const spinner = ora('Initializing ClaudeKit...').start();

  try {
    const projectRoot = process.cwd();
    const claudeDir = path.join(projectRoot, '.claude');

    // Check if .claude directory already exists
    try {
      await fs.access(claudeDir);
      if (options.force !== true) {
        spinner.fail('.claude directory already exists. Use --force to overwrite.');
        return;
      }
    } catch {
      // Directory doesn't exist, which is fine
    }

    // Create .claude directory
    await fs.mkdir(claudeDir, { recursive: true });

    // Analyze project and generate recommendations
    let recommendations;
    let projectInfo;

    if (options.skipRecommendations !== true) {
      spinner.text = 'Analyzing project...';
      projectInfo = await detectProjectContext(projectRoot);

      spinner.text = 'Discovering available components...';
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const registry = await discoverComponents(path.join(__dirname, '../../..'));

      spinner.text = 'Generating recommendations...';
      recommendations = await recommendComponents(projectInfo, registry);
    }

    // Build settings based on recommendations
    interface DefaultSettings {
      hooks: {
        PostToolUse: Array<{
          matcher: string;
          hooks: Array<{ type: string; command: string }>;
        }>;
        Stop: Array<{
          matcher: string;
          hooks: Array<{ type: string; command: string }>;
        }>;
      };
    }
    const defaultSettings: DefaultSettings = {
      hooks: {
        PostToolUse: [],
        Stop: [],
      },
    };

    if (recommendations) {
      // Add essential hooks to settings
      for (const rec of recommendations.essential) {
        if (rec.component.type === 'hook') {
          const hookCommand = `claudekit-hooks run ${rec.component.metadata.id}`;

          if (rec.component.metadata.id === 'typecheck-changed') {
            defaultSettings.hooks.PostToolUse.push({
              matcher: 'tools:Write AND file_paths:**/*.ts',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          } else if (rec.component.metadata.id === 'lint-changed') {
            defaultSettings.hooks.PostToolUse.push({
              matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          } else if (rec.component.metadata.id === 'create-checkpoint') {
            defaultSettings.hooks.Stop.push({
              matcher: '*',
              hooks: [{ type: 'command', command: hookCommand }],
            });
          }
        }
      }

      // Add recommended hooks if they're validation-related
      for (const rec of recommendations.recommended) {
        if (rec.component.type === 'hook' && rec.component.metadata.category === 'validation') {
          const hookCommand = `claudekit-hooks run ${rec.component.metadata.id}`;

          if (rec.component.metadata.id === 'check-todos') {
            const stopEntry = defaultSettings.hooks.Stop.find((e) => e.matcher === '*');
            if (stopEntry !== undefined) {
              stopEntry.hooks.push({ type: 'command', command: hookCommand });
            } else {
              defaultSettings.hooks.Stop.push({
                matcher: '*',
                hooks: [{ type: 'command', command: hookCommand }],
              });
            }
          }
        }
      }
    } else {
      // Fallback to sensible defaults if recommendations were skipped
      defaultSettings.hooks.PostToolUse = [
        {
          matcher: 'tools:Write AND file_paths:**/*.ts',
          hooks: [{ type: 'command', command: 'claudekit-hooks run typecheck-changed' }],
        },
        {
          matcher: 'tools:Write AND file_paths:**/*.{js,ts,tsx,jsx}',
          hooks: [{ type: 'command', command: 'claudekit-hooks run lint-changed' }],
        },
      ];
      defaultSettings.hooks.Stop = [
        {
          matcher: '*',
          hooks: [
            { type: 'command', command: 'claudekit-hooks run create-checkpoint' },
            { type: 'command', command: 'claudekit-hooks run check-todos' },
          ],
        },
      ];
    }

    await fs.writeFile(
      path.join(claudeDir, 'settings.json'),
      JSON.stringify(defaultSettings, null, 2)
    );

    // Create hooks and commands directories
    await fs.mkdir(path.join(claudeDir, 'hooks'), { recursive: true });
    await fs.mkdir(path.join(claudeDir, 'commands'), { recursive: true });

    spinner.succeed(chalk.green('ClaudeKit initialized successfully!'));

    // Show recommendations if we generated them
    if (
      recommendations &&
      (recommendations.essential.length > 0 ||
        recommendations.recommended.length > 0 ||
        recommendations.optional.length > 0)
    ) {
      console.log(`\n${chalk.bold('Component Recommendations based on your project:')}`);
      console.log(formatRecommendationSummary(recommendations));
    }

    console.log('\nNext steps:');
    console.log(
      chalk.blue('1.'),
      'Run',
      chalk.cyan('claudekit install'),
      'to install the recommended hooks'
    );
    console.log(
      chalk.blue('2.'),
      'Review and customize your settings in',
      chalk.cyan('.claude/settings.json')
    );
    console.log(chalk.blue('3.'), 'Add custom commands to', chalk.cyan('.claude/commands/'));

    if (projectInfo !== undefined && options.skipRecommendations !== true) {
      console.log(`\n${chalk.dim('Project detected:')}`);
      if (projectInfo.hasTypeScript === true) {
        console.log(chalk.dim('  • TypeScript'));
      }
      if (projectInfo.hasESLint === true) {
        console.log(chalk.dim('  • ESLint'));
      }
      if (projectInfo.hasPrettier === true) {
        console.log(chalk.dim('  • Prettier'));
      }
      if (projectInfo.hasJest === true) {
        console.log(chalk.dim('  • Jest'));
      }
      if (projectInfo.hasVitest === true) {
        console.log(chalk.dim('  • Vitest'));
      }
      if (projectInfo.frameworks?.length !== undefined && projectInfo.frameworks.length > 0) {
        console.log(chalk.dim(`  • Frameworks: ${projectInfo.frameworks.join(', ')}`));
      }
    }
  } catch (error) {
    spinner.fail('Failed to initialize ClaudeKit');
    throw error;
  }
}
