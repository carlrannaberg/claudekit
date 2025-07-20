import { Logger } from '../utils/logger.js';
import { confirm } from '@inquirer/prompts';
import path from 'path';
import fs from 'fs-extra';

interface RemoveOptions {
  force?: boolean;
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
}

/**
 * Remove a hook or command from the project
 */
export async function remove(
  type: string,
  name: string,
  options: RemoveOptions = {}
): Promise<void> {
  const logger = new Logger();

  if (options.verbose === true) {
    logger.setLevel('debug');
  } else if (options.quiet === true) {
    logger.setLevel('error');
  }

  logger.debug(`Removing ${type} "${name}" with options:`, options);

  // Validate type
  const validTypes = ['hook', 'command'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
  }

  // Determine target path
  const targetDir = type === 'hook' ? '.claude/hooks' : '.claude/commands';
  const extension = type === 'hook' ? 'sh' : 'md';
  const targetPath = path.join(targetDir, `${name}.${extension}`);

  logger.debug(`Target path: ${targetPath}`);

  // Check if file exists
  if (!(await fs.pathExists(targetPath))) {
    throw new Error(`${type} "${name}" not found at ${targetPath}`);
  }

  // Confirm deletion unless force flag is set
  if (options.force !== true && options.quiet !== true) {
    const shouldRemove = await confirm({
      message: `Are you sure you want to remove ${type} "${name}"?`,
      default: false,
    });

    if (!shouldRemove) {
      logger.info('Removal cancelled');
      return;
    }
  }

  // Remove the file
  await fs.remove(targetPath);

  logger.success(`Successfully removed ${type} "${name}"`);
}
