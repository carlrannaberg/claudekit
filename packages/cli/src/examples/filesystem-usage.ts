/**
 * Example usage of the filesystem module
 * 
 * This file demonstrates how to use the various filesystem utilities
 * for common file operations with proper validation and error handling.
 */

import {
  validateProjectPath,
  ensureDirectoryExists,
  copyFileWithBackup,
  setExecutablePermission,
  needsUpdate,
  getFileHash,
} from '../lib/filesystem.js';

/**
 * Example: Safe file installation with backup and validation
 */
export async function installFileWithValidation(
  sourcePath: string,
  targetPath: string,
  makeExecutable: boolean = false
): Promise<void> {
  // 1. Validate paths for security
  if (!validateProjectPath(sourcePath) || !validateProjectPath(targetPath)) {
    throw new Error('Invalid source or target path provided');
  }

  // 2. Check if update is needed using SHA-256 comparison
  if (!(await needsUpdate(sourcePath, targetPath))) {
    console.log('Target file is already up to date, skipping');
    return;
  }

  // 3. Ensure target directory exists
  const targetDir = require('path').dirname(targetPath);
  await ensureDirectoryExists(targetDir);

  // 4. Copy file with automatic backup
  await copyFileWithBackup(sourcePath, targetPath, true);

  // 5. Set executable permissions if needed (for scripts/hooks)
  if (makeExecutable) {
    await setExecutablePermission(targetPath);
  }

  console.log(`Successfully installed ${sourcePath} → ${targetPath}`);
}

/**
 * Example: Check file integrity
 */
export async function verifyFileIntegrity(
  filePath: string,
  expectedHash?: string
): Promise<boolean> {
  try {
    const actualHash = await getFileHash(filePath);
    
    if (expectedHash) {
      return actualHash === expectedHash;
    }
    
    console.log(`File hash: ${actualHash}`);
    return true;
  } catch (error) {
    console.error(`Failed to verify file integrity: ${error}`);
    return false;
  }
}

/**
 * Example: Batch file operations with error handling
 */
export async function installMultipleFiles(
  fileMap: Record<string, { source: string; executable?: boolean }>
): Promise<{ success: string[]; failed: string[] }> {
  const success: string[] = [];
  const failed: string[] = [];

  for (const [targetPath, config] of Object.entries(fileMap)) {
    try {
      await installFileWithValidation(
        config.source,
        targetPath,
        config.executable
      );
      success.push(targetPath);
    } catch (error) {
      console.error(`Failed to install ${targetPath}:`, error);
      failed.push(targetPath);
    }
  }

  return { success, failed };
}

// Example usage:
/*
const files = {
  '/Users/myuser/project/.claude/hooks/typecheck.sh': {
    source: '/path/to/source/hooks/typecheck.sh',
    executable: true
  },
  '/Users/myuser/project/.claude/settings.json': {
    source: '/path/to/source/settings.json'
  }
};

const result = await installMultipleFiles(files);
console.log(`Installed: ${result.success.length}, Failed: ${result.failed.length}`);
*/