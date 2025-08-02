import { Colors, symbols } from '../utils/colors.js';
import { promises as fs } from 'fs';
import path from 'path';
import { createProgressReporter } from '../utils/progress.js';
import {
  validateProject,
  checkAllPrerequisites,
  formatValidationErrors,
  type ValidationResult,
} from '../lib/validation.js';
import { validateClaudekitConfig } from '../types/claudekit-config.js';

interface ValidateOptions {
  type?: string;
  prerequisites?: boolean;
  detailed?: boolean;
  verbose?: boolean;
  quiet?: boolean;
}

interface LegacyValidationResult {
  passed: boolean;
  message: string;
}

export async function validate(options: ValidateOptions): Promise<void> {
  const progressReporter = createProgressReporter({
    quiet: options.quiet,
    verbose: options.verbose,
  });

  const legacyResults: LegacyValidationResult[] = [];
  const validationResults: ValidationResult[] = [];

  try {
    const projectRoot = process.cwd();

    // Enhanced project validation using new validation module
    progressReporter.start('Validating project structure...');
    const projectValidation = await validateProject(projectRoot, {
      requireGitRepository: false,
      requireNodeProject: false,
    });

    validationResults.push(projectValidation);

    // Check for .claude directory
    progressReporter.update('Checking claudekit installation...');
    const claudeDir = path.join(projectRoot, '.claude');
    try {
      await fs.access(claudeDir);
      legacyResults.push({
        passed: true,
        message: '.claude directory exists',
      });
    } catch {
      legacyResults.push({
        passed: false,
        message: '.claude directory not found - run "claudekit setup" first',
      });
    }

    // Check for settings.json with enhanced validation
    progressReporter.update('Validating configuration files...');
    const settingsPath = path.join(claudeDir, 'settings.json');
    try {
      const settings = await fs.readFile(settingsPath, 'utf-8');
      JSON.parse(settings); // Validate JSON
      legacyResults.push({
        passed: true,
        message: 'settings.json is valid',
      });
    } catch (error) {
      legacyResults.push({
        passed: false,
        message:
          error instanceof SyntaxError
            ? 'settings.json contains invalid JSON'
            : 'settings.json not found',
      });
    }

    // Check for hooks in settings.json (embedded hooks system)
    progressReporter.update('Checking hooks configuration...');
    try {
      const settingsContent = await fs.readFile(settingsPath, 'utf-8');
      const settings = JSON.parse(settingsContent);
      
      // Count configured hooks
      let hookCount = 0;
      if (settings.hooks !== null && settings.hooks !== undefined) {
        // Count hooks in PostToolUse
        if (settings.hooks.PostToolUse !== null && settings.hooks.PostToolUse !== undefined && Array.isArray(settings.hooks.PostToolUse)) {
          for (const config of settings.hooks.PostToolUse) {
            if (config.hooks !== null && config.hooks !== undefined && Array.isArray(config.hooks)) {
              hookCount += config.hooks.length;
            }
          }
        }
        
        // Count hooks in Stop
        if (settings.hooks.Stop !== null && settings.hooks.Stop !== undefined && Array.isArray(settings.hooks.Stop)) {
          for (const config of settings.hooks.Stop) {
            if (config.hooks !== null && config.hooks !== undefined && Array.isArray(config.hooks)) {
              hookCount += config.hooks.length;
            }
          }
        }
        
        // Count hooks in other events (PreToolUse, etc.)
        for (const [event, configs] of Object.entries(settings.hooks)) {
          if (event !== 'PostToolUse' && event !== 'Stop' && Array.isArray(configs)) {
            for (const config of configs as unknown[]) {
              if (config !== null && config !== undefined && typeof config === 'object' && 'hooks' in config && config.hooks !== null && config.hooks !== undefined && Array.isArray(config.hooks)) {
                hookCount += config.hooks.length;
              }
            }
          }
        }
      }
      
      if (hookCount > 0) {
        legacyResults.push({
          passed: true,
          message: `Found ${hookCount} hook(s)`,
        });
      } else {
        legacyResults.push({
          passed: true,
          message: 'Found 0 hook(s)',
        });
      }
    } catch {
      // No settings.json or invalid JSON - report no hooks
      legacyResults.push({
        passed: true,
        message: 'Found 0 hook(s)',
      });
    }

    // Check for .claudekit/config.json
    progressReporter.update('Checking claudekit configuration...');
    const claudekitDir = path.join(projectRoot, '.claudekit');
    const configPath = path.join(claudekitDir, 'config.json');
    try {
      const configContent = await fs.readFile(configPath, 'utf-8');
      const configData = JSON.parse(configContent);
      
      // Validate the configuration schema
      const validation = validateClaudekitConfig(configData);
      
      if (validation.valid) {
        legacyResults.push({
          passed: true,
          message: '.claudekit/config.json is valid',
        });
      } else {
        // Schema validation failed
        const errorCount = validation.errors?.length ?? 0;
        const firstError = validation.errors?.[0] ?? 'Invalid configuration';
        legacyResults.push({
          passed: false,
          message: `.claudekit/config.json has ${errorCount} validation error${errorCount > 1 ? 's' : ''}: ${firstError}`,
        });
        
        // Add additional errors as warnings
        if (validation.errors && validation.errors.length > 1) {
          for (let i = 1; i < Math.min(validation.errors.length, 3); i++) {
            legacyResults.push({
              passed: false,
              message: `  - ${validation.errors[i]}`,
            });
          }
          if (validation.errors.length > 3) {
            legacyResults.push({
              passed: false,
              message: `  - ... and ${validation.errors.length - 3} more errors`,
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File doesn't exist - this is OK, claudekit can work without it
        legacyResults.push({
          passed: true,
          message: '.claudekit/config.json not found (optional)',
        });
      } else if (error instanceof SyntaxError) {
        // Invalid JSON
        legacyResults.push({
          passed: false,
          message: '.claudekit/config.json contains invalid JSON',
        });
      } else {
        // Other errors (permissions, etc.)
        legacyResults.push({
          passed: false,
          message: `.claudekit/config.json error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    }

    // Check for commands directory
    progressReporter.update('Checking commands installation...');
    const commandsDir = path.join(claudeDir, 'commands');
    try {
      await fs.access(commandsDir);

      // Count commands recursively
      let commandCount = 0;
      async function countCommands(dir: string): Promise<void> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            await countCommands(path.join(dir, entry.name));
          } else if (entry.name.endsWith('.md')) {
            commandCount++;
          }
        }
      }

      await countCommands(commandsDir);
      legacyResults.push({
        passed: true,
        message: `Found ${commandCount} command(s)`,
      });
    } catch {
      // Commands directory doesn't exist - this is valid, just means no commands installed
      legacyResults.push({
        passed: true,
        message: 'No commands installed',
      });
    }

    // Optional: Check prerequisites
    if (options.prerequisites === true) {
      progressReporter.update('Checking development prerequisites...');
      const prereqResult = await checkAllPrerequisites({
        requireTypeScript: false,
        requireESLint: false,
        requireGitRepository: false,
      });
      validationResults.push(prereqResult);
    }

    progressReporter.succeed('Validation checks completed');

    // Display results
    console.log('\nValidation Results:\n');

    // Display legacy validation results
    let allPassed = true;
    for (const result of legacyResults) {
      const icon = result.passed ? symbols.success : symbols.error;
      const message = result.passed ? Colors.success(result.message) : Colors.error(result.message);
      console.log(`  ${icon} ${message}`);

      if (!result.passed) {
        allPassed = false;
      }
    }

    // Display enhanced validation results if detailed mode or if there are issues
    if (
      options.detailed === true ||
      !projectValidation.isValid ||
      (options.prerequisites === true && validationResults.some((r) => !r.isValid))
    ) {
      console.log('\nDetailed Validation:\n');

      for (const result of validationResults) {
        if (!result.isValid || result.warnings.length > 0) {
          const formatted = formatValidationErrors(result);
          if (formatted !== null && formatted !== undefined && formatted !== '') {
            console.log(formatted);
            console.log('');
          }
        }

        if (!result.isValid) {
          allPassed = false;
        }
      }
    }

    console.log('');

    if (allPassed) {
      console.log(Colors.bold(Colors.success('All validation checks passed!')));

      // Show summary of what was checked
      if (options.detailed === true) {
        console.log(Colors.dim('\nChecked:'));
        console.log(Colors.dim('• claudekit directory structure'));
        console.log(Colors.dim('• Configuration file validity'));
        console.log(Colors.dim('• claudekit config (.claudekit/config.json)'));
        console.log(Colors.dim('• Hook installation'));
        console.log(Colors.dim('• Command installation'));
        console.log(Colors.dim('• Project path security'));
        if (options.prerequisites === true) {
          console.log(Colors.dim('• Development prerequisites'));
        }
      }

      // Show helpful suggestions for empty installations
      const suggestions: string[] = [];
      if (legacyResults.some((r) => r.message === 'No hooks configured')) {
        suggestions.push('• Run "claudekit setup" to configure hooks');
      }
      if (legacyResults.some((r) => r.message === 'No commands installed')) {
        suggestions.push('• Run "claudekit setup" to install commands');
      }

      if (suggestions.length > 0) {
        console.log(Colors.dim('\nTo get started:'));
        suggestions.forEach((s) => console.log(Colors.dim(s)));
      }
    } else {
      console.log(Colors.bold(Colors.error('Some validation checks failed.')));

      // Provide helpful suggestions
      console.log(Colors.warn('\nNext steps:'));
      if (legacyResults.some((r) => !r.passed && r.message.includes('.claude directory'))) {
        console.log(Colors.warn('• Run "claudekit setup" to set up ClaudeKit'));
      }
      if (legacyResults.some((r) => !r.passed && r.message.includes('settings.json'))) {
        console.log(Colors.warn('• Check your .claude/settings.json file for syntax errors'));
      }
      // Hooks/commands suggestions are now shown in the success case

      process.exit(1);
    }
  } catch (error) {
    progressReporter.fail('Validation failed');
    throw error;
  }
}
