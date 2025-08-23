import type { Stats } from 'node:fs';
import { promises as fs, constants } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { Logger } from '../utils/logger.js';

const logger = Logger.create('filesystem');

interface NodeJSError {
  code?: string;
  message: string;
}

/**
 * Filesystem utilities with Unix focus for ClaudeKit CLI
 *
 * Provides essential file operations with proper path validation,
 * permission checks, backup functionality, and idempotency.
 */

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Validates that a project path is reasonable and safe
 *
 * @param input - Path to validate
 * @returns true if path is valid for project operations
 */
export function validateProjectPath(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  // Check for directory traversal attempts in the original input
  if (input.includes('..')) {
    return false;
  }

  // Normalize the path to handle relative paths and resolve symlinks
  const normalizedPath = path.resolve(input);

  // Double-check for directory traversal after normalization
  if (normalizedPath.includes('..') || normalizedPath !== path.normalize(normalizedPath)) {
    return false;
  }

  // Ensure path is not root or system directories
  const systemPaths = ['/', '/usr', '/bin', '/sbin', '/etc', '/var', '/tmp'];
  if (systemPaths.includes(normalizedPath)) {
    return false;
  }

  // Ensure path is not in user's critical directories
  const homeDir = os.homedir();
  const criticalUserPaths = [
    homeDir,
    path.join(homeDir, 'Library'),
    path.join(homeDir, '.ssh'),
    path.join(homeDir, '.gnupg'),
  ];

  if (criticalUserPaths.includes(normalizedPath)) {
    return false;
  }

  // Must be a reasonable length
  if (normalizedPath.length > 1000) {
    return false;
  }

  // Should not contain null bytes or other control characters
  for (let i = 0; i < normalizedPath.length; i++) {
    const charCode = normalizedPath.charCodeAt(i);
    if (charCode <= 31 || charCode === 127) {
      return false;
    }
  }

  return true;
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * Ensures a directory exists, creating it recursively if needed
 *
 * @param dirPath - Directory path to ensure exists
 * @throws Error if path validation fails or directory cannot be created
 */
export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  if (!validateProjectPath(dirPath)) {
    throw new Error(`Invalid directory path: ${dirPath}`);
  }

  try {
    // Check if directory already exists
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      throw new Error(`Path exists but is not a directory: ${dirPath}`);
    }
    return;
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    if (nodeError.code !== undefined && nodeError.code !== 'ENOENT') {
      throw error;
    }
  }

  // Create directory recursively
  try {
    await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    throw new Error(`Failed to create directory ${dirPath}: ${nodeError.message}`);
  }
}

// ============================================================================
// Permission Operations
// ============================================================================

/**
 * Checks if we have write permission to a directory or file's parent directory
 *
 * @param targetPath - Path to check write permissions for
 * @returns true if we can write to the target location
 */
export async function checkWritePermission(targetPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(targetPath);
    if (stats.isDirectory()) {
      // Check write permission on directory
      await fs.access(targetPath, constants.W_OK);
      return true;
    } else {
      // Check write permission on file
      await fs.access(targetPath, constants.W_OK);
      return true;
    }
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    if (nodeError.code !== undefined && nodeError.code === 'ENOENT') {
      // File doesn't exist, check parent directory
      const parentDir = path.dirname(targetPath);
      try {
        await fs.access(parentDir, constants.W_OK);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

// ============================================================================
// File Hashing and Comparison
// ============================================================================

/**
 * Calculates SHA-256 hash of a file
 *
 * @param filePath - Path to file to hash
 * @returns Promise resolving to hex-encoded hash string
 * @throws Error if file cannot be read
 */
export async function getFileHash(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath);
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    throw new Error(`Failed to hash file ${filePath}: ${nodeError.message}`);
  }
}

/**
 * Determines if a target file needs updating compared to source
 * Uses SHA-256 comparison for reliable change detection
 *
 * @param source - Source file path
 * @param target - Target file path
 * @returns true if target doesn't exist or differs from source
 */
export async function needsUpdate(source: string, target: string): Promise<boolean> {
  try {
    // If target doesn't exist, it needs updating
    await fs.access(target, constants.F_OK);
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    if (nodeError.code !== undefined && nodeError.code === 'ENOENT') {
      return true;
    }
    throw error;
  }

  try {
    // Compare hashes
    const sourceHash = await getFileHash(source);
    const targetHash = await getFileHash(target);

    return sourceHash !== targetHash;
  } catch {
    // If we can't read either file, assume update is needed
    return true;
  }
}

// ============================================================================
// File Operations with Backup
// ============================================================================

/**
 * Copies a file from source to target with optional backup
 *
 * @param source - Source file path
 * @param target - Target file path
 * @param backup - Whether to create backup of existing target
 * @throws Error if operation fails
 */
export async function copyFileWithBackup(
  source: string,
  target: string,
  backup: boolean = true,
  onConflict?: (source: string, target: string) => Promise<boolean>
): Promise<void> {
  // Validate paths
  if (!validateProjectPath(source) || !validateProjectPath(target)) {
    throw new Error('Invalid source or target path');
  }

  // Check write permissions
  if (!(await checkWritePermission(target))) {
    throw new Error(`No write permission for target: ${target}`);
  }

  // Verify source exists and is readable
  try {
    await fs.access(source, constants.R_OK);
  } catch {
    throw new Error(`Source file not accessible: ${source}`);
  }

  // Check if target exists and has different content
  let targetExists = false;
  try {
    await fs.access(target, constants.F_OK);
    targetExists = true;
  } catch {
    // Target doesn't exist - no conflict
  }

  if (targetExists) {
    // Check if files are different
    const sourceHash = await getFileHash(source);
    const targetHash = await getFileHash(target);

    if (sourceHash !== targetHash) {
      // Files are different - potential conflict
      if (onConflict) {
        const shouldProceed = await onConflict(source, target);
        if (!shouldProceed) {
          logger.info(`Skipping ${target} - user chose not to overwrite`);
          return;
        }
      }

      // Create backup if requested
      if (backup) {
        // Create timestamped backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = `${target}.backup-${timestamp}`;
        logger.debug(`Creating backup: ${backupPath}`);
        await fs.copyFile(target, backupPath);
      }
    } else {
      // Files are identical - skip copy
      logger.debug(`Skipping ${target} - identical to source`);
      return;
    }
  }

  // Ensure target directory exists
  const targetDir = path.dirname(target);
  await ensureDirectoryExists(targetDir);

  // Copy file
  try {
    await fs.copyFile(source, target);
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    throw new Error(`Failed to copy ${source} to ${target}: ${nodeError.message}`);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Checks if a path exists
 *
 * @param filePath - Path to check
 * @returns true if path exists
 */
export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets file statistics
 *
 * @param filePath - Path to get stats for
 * @returns File stats or null if file doesn't exist
 */
export async function getFileStats(filePath: string): Promise<Stats | null> {
  try {
    return await fs.stat(filePath);
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    if (nodeError.code !== undefined && nodeError.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Safely removes a file if it exists
 *
 * @param filePath - Path to file to remove
 * @returns true if file was removed, false if it didn't exist
 */
export async function safeRemove(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (error: unknown) {
    const nodeError = error as NodeJSError;
    if (nodeError.code !== undefined && nodeError.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Expands tilde (~) in paths to home directory
 *
 * @param filePath - Path that may contain tilde
 * @returns Expanded path
 */
export function expandHomePath(filePath: string): string {
  if (filePath.startsWith('~/')) {
    return path.join(os.homedir(), filePath.slice(2));
  }
  if (filePath === '~') {
    return os.homedir();
  }
  return filePath;
}

/**
 * Normalizes a path for consistent handling
 * Expands home directory and resolves relative paths
 *
 * @param filePath - Path to normalize
 * @returns Normalized absolute path
 */
export function normalizePath(filePath: string): string {
  const expanded = expandHomePath(filePath);
  return path.resolve(expanded);
}
