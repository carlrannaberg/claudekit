import { Logger } from '../utils/logger.js';
import { loadConfig, saveConfig } from '../utils/config.js';
import path from 'path';
import fs from 'fs-extra';

interface UpdateOptions {
  config?: string;
  file?: string;
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
}

/**
 * Update a hook or command configuration
 */
export async function update(
  type: string,
  name: string,
  options: UpdateOptions = {}
): Promise<void> {
  const logger = new Logger();

  if (options.verbose === true) {
    logger.setLevel('debug');
  } else if (options.quiet === true) {
    logger.setLevel('error');
  }

  logger.debug(`Updating ${type} "${name}" with options:`, options);

  // Validate type
  const validTypes = ['hook', 'command', 'config'];
  if (!validTypes.includes(type)) {
    throw new Error(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
  }

  if (type === 'config') {
    // Update configuration
    await updateConfig(name, options);
  } else {
    // Update hook or command file
    await updateFile(type, name, options);
  }

  logger.success(`Successfully updated ${type} "${name}"`);
}

async function updateConfig(configKey: string, options: UpdateOptions): Promise<void> {
  const logger = new Logger();
  const config = await loadConfig(process.cwd());

  // Parse configuration updates
  let updates: unknown;
  if (options.config !== undefined && options.config !== '') {
    try {
      updates = JSON.parse(options.config);
    } catch (error) {
      throw new Error(`Invalid JSON in --config: ${error}`);
    }
  } else if (options.file !== undefined && options.file !== '') {
    const content = await fs.readFile(options.file, 'utf8');
    try {
      updates = JSON.parse(content);
    } catch (error) {
      throw new Error(`Invalid JSON in file ${options.file}: ${error}`);
    }
  } else {
    throw new Error('Either --config or --file must be provided');
  }

  // Apply updates to config
  // Handle nested keys like "hooks.PostToolUse"
  const keys = configKey.split('.');
  let target: Record<string, unknown> = config as Record<string, unknown>;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (key !== undefined && key !== '' && target !== undefined) {
      if (target[key] === undefined || target[key] === null) {
        target[key] = {};
      }
      target = target[key] as Record<string, unknown>;
    }
  }

  const finalKey = keys[keys.length - 1];
  if (finalKey !== undefined && finalKey !== '' && target !== undefined) {
    target[finalKey] = updates;
  }

  // Save updated config
  await saveConfig(process.cwd(), config);
  logger.debug('Configuration updated successfully');
}

async function updateFile(type: string, name: string, options: UpdateOptions): Promise<void> {
  const logger = new Logger();

  // Determine target path
  const targetDir = type === 'hook' ? '.claude/hooks' : '.claude/commands';
  const extension = type === 'hook' ? 'sh' : 'md';
  const targetPath = path.join(targetDir, `${name}.${extension}`);

  // Check if file exists
  if (!(await fs.pathExists(targetPath))) {
    throw new Error(`${type} "${name}" not found at ${targetPath}`);
  }

  // Read new content
  let newContent: string;
  if (options.config !== undefined && options.config !== '') {
    newContent = options.config;
  } else if (options.file !== undefined && options.file !== '') {
    newContent = await fs.readFile(options.file, 'utf8');
  } else {
    throw new Error('Either --config or --file must be provided');
  }

  // Update the file
  await fs.writeFile(targetPath, newContent, 'utf8');

  // Ensure hooks remain executable
  if (type === 'hook') {
    await fs.chmod(targetPath, 0o755);
  }

  logger.debug(`Updated ${type} file at ${targetPath}`);
}
