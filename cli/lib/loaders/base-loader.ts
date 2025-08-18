import { promises as fs } from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { pathExists } from 'fs-extra';
import {
  findComponentsDirectory,
  getUserClaudeDirectory,
  getProjectClaudeDirectory,
} from '../paths.js';

/**
 * Base class for file loaders providing common functionality
 */
export abstract class BaseLoader {
  protected searchPaths: string[];
  private subDirectoryName: string;
  private pathsInitialized: boolean = false;

  constructor(subDirectoryName: string) {
    this.searchPaths = [];
    this.subDirectoryName = subDirectoryName;
  }

  /**
   * Initialize search paths for the loader
   * Automatically called before operations if not already initialized
   */
  protected async ensurePathsInitialized(): Promise<void> {
    if (this.pathsInitialized) {
      return;
    }

    const possiblePaths: string[] = [];

    // 1. Project-level directory (highest priority)
    const projectPath = path.join(getProjectClaudeDirectory(), this.subDirectoryName);
    if (await pathExists(projectPath)) {
      possiblePaths.push(projectPath);
    }

    // 2. User-level directory (medium priority)
    const userPath = path.join(getUserClaudeDirectory(), this.subDirectoryName);
    if (await pathExists(userPath)) {
      possiblePaths.push(userPath);
    }

    // 3. Embedded claudekit directory (lowest priority)
    try {
      const componentsDir = await findComponentsDirectory();
      const embeddedPath = path.join(componentsDir, this.subDirectoryName);
      if (await pathExists(embeddedPath)) {
        possiblePaths.push(embeddedPath);
      }
    } catch {
      // findComponentsDirectory might fail if running from unexpected location
      // Continue without embedded commands rather than failing completely
    }

    this.searchPaths = possiblePaths;
    this.pathsInitialized = true;

    // Don't throw error if no paths found - let individual operations handle this
    // This allows list to work even if some paths are missing
  }

  /**
   * Check if a file exists using fs-extra's pathExists
   * @param filePath Path to check
   * @returns Promise<boolean> True if file exists
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    return await pathExists(filePath);
  }

  /**
   * Read and parse a markdown file with frontmatter
   * @param filePath Path to the file
   * @returns Promise<{data: Record<string, unknown>, content: string}>
   */
  protected async readAndParseFile(
    filePath: string
  ): Promise<{ data: Record<string, unknown>; content: string }> {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    let data: Record<string, unknown> = {};
    let content = '';

    try {
      const parsed = matter(fileContent);
      data = parsed.data;
      content = parsed.content;
    } catch {
      // Handle malformed frontmatter - just use the whole file as content
      content = fileContent;
    }

    return { data, content: content.trim() };
  }

  /**
   * Recursively search a directory for files with safety protections
   * @param searchPath Base directory to search
   * @param callback Function to process each file entry
   * @returns Promise<string | null> Path to matching file or null
   */
  protected async searchRecursively(
    searchPath: string,
    callback: (
      fullPath: string,
      entry: { name: string; isFile: () => boolean; isDirectory: () => boolean }
    ) => Promise<string | null>
  ): Promise<string | null> {
    return this.searchRecursivelySafe(searchPath, callback, new Set(), 0);
  }

  /**
   * Internal safe recursive search implementation with cycle detection and depth limiting
   * @param searchPath Base directory to search
   * @param callback Function to process each file entry
   * @param visitedPaths Set of already visited canonical paths to prevent cycles
   * @param depth Current recursion depth
   * @param maxDepth Maximum recursion depth allowed (default 10)
   * @returns Promise<string | null> Path to matching file or null
   */
  private async searchRecursivelySafe(
    searchPath: string,
    callback: (
      fullPath: string,
      entry: { name: string; isFile: () => boolean; isDirectory: () => boolean }
    ) => Promise<string | null>,
    visitedPaths: Set<string>,
    depth: number,
    maxDepth: number = 10
  ): Promise<string | null> {
    // Prevent infinite recursion due to excessive depth
    if (depth >= maxDepth) {
      return null;
    }

    try {
      // Get canonical path to detect symlink cycles
      const canonicalPath = await fs.realpath(searchPath);

      // Check if we've already visited this canonical path (prevents symlink loops)
      if (visitedPaths.has(canonicalPath)) {
        return null;
      }

      // Mark this path as visited
      visitedPaths.add(canonicalPath);

      const entries = await fs.readdir(searchPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(searchPath, entry.name);

        if (entry.isDirectory()) {
          // Recursively search subdirectories with updated depth and visited set
          const result = await this.searchRecursivelySafe(
            fullPath,
            callback,
            visitedPaths,
            depth + 1,
            maxDepth
          );
          if (result !== null) {
            return result;
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const result = await callback(fullPath, entry);
          if (result !== null) {
            return result;
          }
        }
      }

      // Remove this path from visited set when backtracking (allows revisiting in different branches)
      visitedPaths.delete(canonicalPath);
    } catch {
      // Skip directories that can't be read or resolved (permission issues, broken symlinks, etc.)
      return null;
    }

    return null;
  }

  /**
   * Helper function to validate string arrays from frontmatter
   * @param value Unknown value from frontmatter
   * @returns string[] | undefined Valid string array or undefined
   */
  protected validateStringArray(value: unknown): string[] | undefined {
    if (!Array.isArray(value)) {
      return undefined;
    }
    if (value.every((item) => typeof item === 'string')) {
      return value as string[];
    }
    return undefined;
  }

  /**
   * Get optional string value from frontmatter data
   * @param data Frontmatter data object
   * @param key Key to extract
   * @returns string | undefined
   */
  protected getOptionalString(data: Record<string, unknown>, key: string): string | undefined {
    return typeof data[key] === 'string' ? (data[key] as string) : undefined;
  }

  /**
   * Get required string value from frontmatter data with fallback
   * @param data Frontmatter data object
   * @param key Key to extract
   * @param fallback Fallback value if key is missing or invalid
   * @returns string
   */
  protected getRequiredString(
    data: Record<string, unknown>,
    key: string,
    fallback: string
  ): string {
    return typeof data[key] === 'string' && data[key] !== '' ? (data[key] as string) : fallback;
  }
}
