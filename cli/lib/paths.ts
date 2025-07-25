import path from 'path';
import { fileURLToPath } from 'url';
import { pathExists } from './filesystem.js';

/**
 * Find the claudekit components directory based on the execution context
 * Handles different installation scenarios:
 * 1. Local development - running from source
 * 2. Global npm install - components in npm package
 * 3. npx execution - temporary npm cache
 * 4. Local npm install - project node_modules
 */
export async function findComponentsDirectory(): Promise<string> {
  // Get the directory of the current module
  const currentFileUrl = import.meta.url;
  const currentFilePath = fileURLToPath(currentFileUrl);
  const currentDir = path.dirname(currentFilePath);

  // Strategy 1: Check if we're in development (src exists at project root)
  // Go up from lib to find project root
  const projectRoot = path.resolve(currentDir, '../..');
  const devSrcPath = path.join(projectRoot, 'src');
  if (await pathExists(devSrcPath)) {
    const devCommandsPath = path.join(devSrcPath, 'commands');
    const devHooksPath = path.join(devSrcPath, 'hooks');
    if ((await pathExists(devCommandsPath)) && (await pathExists(devHooksPath))) {
      return devSrcPath;
    }
  }

  // Strategy 2: Check if src is included in the npm package (alongside dist)
  const distRoot = path.resolve(currentDir, '..');
  const packagedSrcPath = path.join(distRoot, '..', 'src');
  if (await pathExists(packagedSrcPath)) {
    const packagedCommandsPath = path.join(packagedSrcPath, 'commands');
    const packagedHooksPath = path.join(packagedSrcPath, 'hooks');
    if ((await pathExists(packagedCommandsPath)) && (await pathExists(packagedHooksPath))) {
      return packagedSrcPath;
    }
  }

  // Strategy 3: Check if components are bundled into dist
  const distSrcPath = path.join(distRoot, 'src');
  if (await pathExists(distSrcPath)) {
    const distCommandsPath = path.join(distSrcPath, 'commands');
    const distHooksPath = path.join(distSrcPath, 'hooks');
    if ((await pathExists(distCommandsPath)) && (await pathExists(distHooksPath))) {
      return distSrcPath;
    }
  }

  // Strategy 4: Fallback to checking current working directory (for development/testing)
  const cwdSrcPath = path.join(process.cwd(), 'src');
  if (await pathExists(cwdSrcPath)) {
    const cwdCommandsPath = path.join(cwdSrcPath, 'commands');
    const cwdHooksPath = path.join(cwdSrcPath, 'hooks');
    if ((await pathExists(cwdCommandsPath)) && (await pathExists(cwdHooksPath))) {
      return cwdSrcPath;
    }
  }

  // If we can't find components, throw a helpful error
  throw new Error(
    'Could not locate claudekit components directory. ' +
      'This may happen if:\n' +
      '1. The npm package is missing the src directory\n' +
      '2. You are running from an unexpected location\n' +
      '3. The installation is corrupted\n\n' +
      'Please try reinstalling claudekit or report this issue.'
  );
}

/**
 * Get the user's home .claude directory
 */
export function getUserClaudeDirectory(): string {
  const homeDir = process.env['HOME'] ?? process.env['USERPROFILE'] ?? '';
  if (!homeDir) {
    throw new Error('Could not determine user home directory');
  }
  return path.join(homeDir, '.claude');
}

/**
 * Get the project's .claude directory
 */
export function getProjectClaudeDirectory(projectPath?: string): string {
  const basePath = projectPath ?? process.cwd();
  return path.join(basePath, '.claude');
}