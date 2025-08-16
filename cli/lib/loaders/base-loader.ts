import { promises as fs, accessSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { pathExists } from 'fs-extra';

/**
 * Base class for file loaders providing common functionality
 */
export abstract class BaseLoader {
  protected searchPaths: string[];

  constructor(subDirectoryName: string) {
    // Get current directory in ES module context
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Try multiple strategies to find the target directory
    const possiblePaths = [
      path.join(__dirname, `../../src/${subDirectoryName}`),  // From dist/lib/loaders/
      path.join(process.cwd(), `src/${subDirectoryName}`),    // From project root
      path.resolve(__dirname, `../../src/${subDirectoryName}`), // Absolute resolution
    ];
    
    this.searchPaths = possiblePaths.filter(p => {
      try {
        // Synchronously check if directory exists during construction
        accessSync(p);
        return true;
      } catch {
        return false;
      }
    });
    
    if (this.searchPaths.length === 0) {
      throw new Error(`No valid ${subDirectoryName} directories found. Searched: ${possiblePaths.join(', ')}`);
    }
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
  protected async readAndParseFile(filePath: string): Promise<{data: Record<string, unknown>, content: string}> {
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
   * Recursively search a directory for files
   * @param searchPath Base directory to search
   * @param callback Function to process each file entry
   * @returns Promise<string | null> Path to matching file or null
   */
  protected async searchRecursively(
    searchPath: string, 
    callback: (fullPath: string, entry: { name: string; isFile: () => boolean; isDirectory: () => boolean }) => Promise<string | null>
  ): Promise<string | null> {
    try {
      const entries = await fs.readdir(searchPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(searchPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const result = await this.searchRecursively(fullPath, callback);
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
    } catch {
      // Skip directories that can't be read
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
    if (value.every(item => typeof item === 'string')) {
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
    return typeof data[key] === 'string' ? data[key] as string : undefined;
  }

  /**
   * Get required string value from frontmatter data with fallback
   * @param data Frontmatter data object
   * @param key Key to extract
   * @param fallback Fallback value if key is missing or invalid
   * @returns string
   */
  protected getRequiredString(data: Record<string, unknown>, key: string, fallback: string): string {
    return (typeof data[key] === 'string' && data[key] !== '') ? data[key] as string : fallback;
  }
}