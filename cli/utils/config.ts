import { promises as fs } from 'fs';
import * as path from 'path';
import { z } from 'zod';
import type { Config, HookMatcher, HooksConfig } from '../types/config.js';
import { validateConfig } from '../types/config.js';
import { getUserClaudeDirectory } from '../lib/paths.js';
import { pathExists } from '../lib/filesystem.js';

export async function loadConfig(projectRoot: string): Promise<Config> {
  const configPath = path.join(projectRoot, '.claude', 'settings.json');

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const data = JSON.parse(content);
    return validateConfig(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid configuration: ${error.message}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error('Invalid JSON in settings.json');
    }
    throw new Error('Failed to load configuration');
  }
}

export async function saveConfig(projectRoot: string, config: Config): Promise<void> {
  const configPath = path.join(projectRoot, '.claude', 'settings.json');

  // Validate config before saving
  const validatedConfig = validateConfig(config);

  // Ensure directory exists
  await fs.mkdir(path.dirname(configPath), { recursive: true });

  // Write config with pretty formatting
  await fs.writeFile(configPath, `${JSON.stringify(validatedConfig, null, 2)}\n`);
}

export async function configExists(projectRoot: string): Promise<boolean> {
  const configPath = path.join(projectRoot, '.claude', 'settings.json');

  try {
    await fs.access(configPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Converts relative paths to absolute paths in hook commands
 */
export function resolveHookPaths(hooksConfig: HooksConfig, projectRoot: string): HooksConfig {
  const resolvedConfig: HooksConfig = {};

  for (const [eventType, matchers] of Object.entries(hooksConfig)) {
    if (!matchers) {
      continue;
    }

    resolvedConfig[eventType as keyof HooksConfig] = matchers.map((matcher) => ({
      ...matcher,
      hooks: matcher.hooks.map((hook) => ({
        ...hook,
        command: path.isAbsolute(hook.command)
          ? hook.command
          : path.resolve(projectRoot, hook.command),
      })),
    }));
  }

  return resolvedConfig;
}

/**
 * Checks if two hook configurations are equivalent (same matcher and command paths)
 */
function areHooksEquivalent(hook1: HookMatcher, hook2: HookMatcher): boolean {
  if (hook1.matcher !== hook2.matcher) {
    return false;
  }

  if (hook1.hooks.length !== hook2.hooks.length) {
    return false;
  }

  // Sort hooks by command for comparison
  const sortedHooks1 = [...hook1.hooks].sort((a, b) => a.command.localeCompare(b.command));
  const sortedHooks2 = [...hook2.hooks].sort((a, b) => a.command.localeCompare(b.command));

  return sortedHooks1.every((hook, index) => {
    const otherHook = sortedHooks2[index];
    if (!otherHook) {
      return false;
    }
    return (
      hook.type === otherHook.type &&
      hook.command === otherHook.command &&
      hook.enabled === otherHook.enabled &&
      hook.timeout === otherHook.timeout &&
      hook.retries === otherHook.retries
    );
  });
}

/**
 * Merges two configuration objects with proper deduplication
 */
export async function mergeConfigs(
  newConfig: Config,
  existingConfig: Config,
  projectRoot: string
): Promise<Config> {
  // Start with existing config as base
  const result: Config = {
    ...existingConfig,
    ...newConfig, // Allow top-level properties to be overridden
    hooks: { ...existingConfig.hooks }, // We'll merge hooks separately
  };

  // Resolve paths in both configs
  const resolvedNewHooks = resolveHookPaths(newConfig.hooks, projectRoot);
  const resolvedExistingHooks = resolveHookPaths(existingConfig.hooks, projectRoot);

  // Merge hooks by event type
  for (const [eventType, newMatchers] of Object.entries(resolvedNewHooks)) {
    if (!newMatchers) {
      continue;
    }

    const existingMatchers = resolvedExistingHooks[eventType as keyof HooksConfig] || [];
    const allMatchers = [...existingMatchers];

    // Add new matchers that don't already exist
    for (const newMatcher of newMatchers) {
      const isDuplicate = existingMatchers.some((existing) =>
        areHooksEquivalent(existing, newMatcher)
      );

      if (!isDuplicate) {
        allMatchers.push(newMatcher);
      }
    }

    result.hooks[eventType as keyof HooksConfig] = allMatchers;
  }

  return result;
}

/**
 * Loads and merges configuration from multiple sources
 */
export async function loadMergedConfig(
  projectRoot: string,
  additionalConfigs: Config[] = []
): Promise<Config> {
  let baseConfig: Config = { hooks: {} };

  // Load existing config if it exists
  if (await configExists(projectRoot)) {
    baseConfig = await loadConfig(projectRoot);
  }

  // Merge additional configs in order
  let mergedConfig = baseConfig;
  for (const config of additionalConfigs) {
    mergedConfig = await mergeConfigs(config, mergedConfig, projectRoot);
  }

  return mergedConfig;
}

/**
 * Saves configuration with proper formatting and validation
 */
export async function saveMergedConfig(projectRoot: string, newConfig: Config): Promise<Config> {
  // Load existing config and merge
  const mergedConfig = await loadMergedConfig(projectRoot, [newConfig]);

  // Save the merged result
  await saveConfig(projectRoot, mergedConfig);

  return mergedConfig;
}

/**
 * Load user configuration from ~/.claude/settings.json
 * Returns empty config if file doesn't exist or is invalid
 */
export async function loadUserConfig(): Promise<Config> {
  const userConfigPath = path.join(getUserClaudeDirectory(), 'settings.json');

  try {
    if (await pathExists(userConfigPath)) {
      const content = await fs.readFile(userConfigPath, 'utf-8');
      const data = JSON.parse(content) as { hooks?: HooksConfig };
      return { hooks: data.hooks ?? {} };
    }
  } catch {
    // Ignore errors, return empty config
  }

  return { hooks: {} };
}
