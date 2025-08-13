import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { validateClaudekitConfig, type ClaudekitConfig } from '../types/claudekit-config.js';

/**
 * Loads and validates the claudekit configuration from .claudekit/config.json
 * @param projectRoot The project root directory (defaults to cwd)
 * @returns The validated configuration or empty object if not found/invalid
 */
export function loadClaudekitConfig(projectRoot: string = process.cwd()): ClaudekitConfig {
  try {
    const configPath = join(projectRoot, '.claudekit', 'config.json');
    if (!existsSync(configPath)) {
      return {};
    }

    const configData = readFileSync(configPath, 'utf-8');
    const parsedData = JSON.parse(configData);
    const validated = validateClaudekitConfig(parsedData);
    
    if (validated.valid && validated.data) {
      return validated.data;
    }
    
    // Log validation errors in debug mode
    if (process.env['DEBUG'] === 'true') {
      console.error('Claudekit config validation errors:', validated.errors);
    }
    
    return {};
  } catch (error) {
    // Log errors in debug mode
    if (process.env['DEBUG'] === 'true') {
      console.error('Failed to load claudekit config:', error);
    }
    return {};
  }
}

/**
 * Gets hook-specific configuration
 * @param hookId The hook identifier (e.g., 'self-review')
 * @param projectRoot The project root directory
 * @returns The hook configuration or undefined if not found
 */
export function getHookConfig<T = unknown>(hookId: string, projectRoot?: string): T | undefined {
  const config = loadClaudekitConfig(projectRoot);
  return config.hooks?.[hookId as keyof typeof config.hooks] as T;
}