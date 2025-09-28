import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import ignore from 'ignore';
import { DEFAULT_PATTERNS } from '../sensitive-patterns.js';
import { globToRegExp } from './utils.js';

type IgnoreEngine = { add: (patterns: string[]) => void; ignores: (path: string) => boolean };


export class FileProtectionService {
  private ignorePatterns: string[] = [];
  private ignoreFilesFound: string[] = [];
  private ignoreEngine: IgnoreEngine | null = null;
  private projectRoot: string = '';

  /**
   * Initialize the protection service by loading ignore patterns
   */
  public async initialize(projectRoot: string): Promise<void> {
    this.projectRoot = projectRoot;
    await this.loadIgnorePatterns(projectRoot);
  }

  /**
   * Get the list of ignore files found during initialization
   */
  public getIgnoreFilesFound(): string[] {
    return this.ignoreFilesFound;
  }

  /**
   * Check if a file is protected by ignore patterns
   */
  public async isFileProtected(filePath: string): Promise<boolean> {
    // Resolve the path relative to project root
    const resolvedPath = path.isAbsolute(filePath) 
      ? filePath 
      : path.join(this.projectRoot, filePath);
    
    // Resolve symlinks to check the actual target
    let targetPath = resolvedPath;
    try {
      targetPath = await fs.realpath(resolvedPath);
    } catch {
      // If symlink resolution fails, use original path
    }
    
    // Check both the symlink and target paths
    const pathsToCheck = [resolvedPath];
    if (targetPath !== resolvedPath) {
      pathsToCheck.push(targetPath);
    }
    
    for (const pathToCheck of pathsToCheck) {
      // Whitelist device files (e.g., /dev/null) used in redirection
      if (pathToCheck === '/dev/null' || pathToCheck.startsWith('/dev/')) {
        continue;
      }
      // Normalize and get relative path
      const normalizedPath = path.normalize(pathToCheck);
      const relativePath = path.relative(this.projectRoot, normalizedPath);
      if (relativePath === '') {
        continue; // do not test project root against ignore rules
      }

      // Skip protection for absolute paths (outside project root)
      if (relativePath.startsWith('..')) {
        continue; // Allow all absolute paths
      }

      // Use ignore engine for paths within project root only
      if (this.ignoreEngine !== null) {
        return this.ignoreEngine.ignores(relativePath);
      }
    }
    
    // Fallback: basic check against default patterns via glob regex (only when no ignore engine)
    const fallbackUnion = DEFAULT_PATTERNS.map((g: string) => globToRegExp(g, { flags: 'i', extended: true, globstar: true }).test(filePath)).some(Boolean);
    return fallbackUnion;
  }

  private async parseIgnoreFile(filePath: string): Promise<string[]> {
    const content = await this.readFile(filePath);
    const lines = content.split('\n');
    const patterns: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }
      
      // Convert gitignore directory syntax to picomatch
      // "dir/" in gitignore means all files in dir, which is "dir/**" in picomatch
      let pattern = trimmed;
      if (pattern.endsWith('/') && !pattern.startsWith('!')) {
        pattern = `${pattern.slice(0, -1)}/**`;
      } else if (pattern.startsWith('!') && pattern.endsWith('/')) {
        // Handle negated directory patterns
        pattern = `!${pattern.slice(1, -1)}/**`;
      }
      
      patterns.push(pattern);
    }
    
    return patterns;
  }

  private async loadIgnorePatterns(projectRoot: string): Promise<void> {
    // Check all ignore files and merge patterns
    const ignoreFiles = [
      '.agentignore',    // OpenAI Codex CLI
      '.aiignore',       // JetBrains AI Assistant
      '.aiexclude',      // Gemini Code Assist
      '.geminiignore',   // Gemini CLI
      '.codeiumignore',  // Codeium
      '.cursorignore'    // Cursor IDE
    ];
    
    const allPatterns: string[] = [];
    this.ignoreFilesFound = [];
    
    // Load and merge patterns from all existing ignore files
    const loadErrors: string[] = [];
    
    for (const fileName of ignoreFiles) {
      const filePath = path.join(projectRoot, fileName);
      if (await this.fileExists(filePath)) {
        try {
          const patterns = await this.parseIgnoreFile(filePath);
          this.ignoreFilesFound.push(fileName);
          allPatterns.push(...patterns);
        } catch (error) {
          loadErrors.push(`Failed to load ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    // Log loading errors but don't fail completely
    if (loadErrors.length > 0) {
      console.error('⚠️  File Guard: Some ignore files could not be loaded:');
      loadErrors.forEach(error => console.error(`   ${error}`));
      
      // If ALL files failed to load, this is critical
      if (this.ignoreFilesFound.length === 0 && loadErrors.length > 0) {
        console.error('⚠️  File Guard: No ignore files loaded successfully, using default protection patterns');
      }
    }
    
    // Remove duplicates while preserving order (later patterns can override)
    this.ignorePatterns = [...new Set(allPatterns)];

    // Add default patterns if no patterns were found
    if (this.ignorePatterns.length === 0) {
      this.ignorePatterns = DEFAULT_PATTERNS;
      if (this.ignoreFilesFound.length > 0) {
        this.ignoreFilesFound = [];
      }
    }

    // Build ignore engine
    this.ignoreEngine = ignore();
    if (this.ignoreEngine !== null) {
      this.ignoreEngine.add(this.ignorePatterns);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}