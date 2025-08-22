import { BaseHook } from './base.js';
import type { HookContext, HookResult } from './base.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import picomatch from 'picomatch';

// Default patterns for essential sensitive files
const DEFAULT_PATTERNS = [
  // Environment files
  '.env',
  '.env.*',
  
  // Keys and certificates  
  '*.pem',
  '*.key',
  
  // Cloud credentials
  '.aws/credentials',
  
  // SSH keys
  '.ssh/*',
];

export class FileGuardHook extends BaseHook {
  name = 'file-guard';
  
  static metadata = {
    id: 'file-guard',
    displayName: 'File Guard',
    description: 'Prevents AI from accessing sensitive files based on ignore file patterns',
    category: 'validation' as const,
    triggerEvent: 'PreToolUse' as const,
    matcher: 'Read|Edit|MultiEdit|Write',
    dependencies: [],
  };

  private ignorePatterns: string[] = [];
  private ignoreFilesFound: string[] = [];
  private projectRoot: string = '';

  async execute(context: HookContext): Promise<HookResult> {
    const { payload, projectRoot } = context;
    
    // Only process relevant tools
    const toolName = payload.tool_name;
    if (toolName === undefined || toolName === null || !['Read', 'Edit', 'MultiEdit', 'Write'].includes(toolName)) {
      return { exitCode: 0 };
    }
    
    // Extract file path from tool input
    const filePath = payload.tool_input?.file_path;
    if (filePath === undefined || filePath === null || filePath.trim() === '') {
      return { exitCode: 0 };
    }
    
    // Load ignore patterns if not already loaded
    if (this.ignorePatterns.length === 0) {
      await this.loadIgnorePatterns(projectRoot);
    }
    
    // Check if file is protected
    if (await this.isFileProtected(filePath, this.ignorePatterns)) {
      // Return PreToolUse decision to deny access
      // Use jsonResponse for the complete structure Claude Code expects
      return {
        exitCode: 0,
        jsonResponse: {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `Access denied: '${path.basename(filePath)}' is protected by ${this.ignoreFilesFound.length > 0 ? this.ignoreFilesFound.join(', ') : 'default patterns'}. This file matches patterns that prevent AI assistant access.`
          }
        }
      };
    }
    
    // Allow access if not protected
    return {
      exitCode: 0,
      jsonResponse: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow'
        }
      }
    };
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
    this.projectRoot = projectRoot;
    
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
      // If we had ignore files but they were empty, note that
      if (this.ignoreFilesFound.length > 0) {
        this.ignoreFilesFound = []; // Clear so message says "default patterns"
      }
    }
  }

  private async isFileProtected(filePath: string, patterns: string[]): Promise<boolean> {
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
      // Normalize and get relative path
      const normalizedPath = path.normalize(pathToCheck);
      const relativePath = path.relative(this.projectRoot, normalizedPath);
      
      // Don't allow access outside project root
      if (relativePath.startsWith('..')) {
        return true; // Block access outside project
      }
      
      // Separate positive and negative patterns
      const positivePatterns = patterns.filter(p => !p.startsWith('!'));
      const negativePatterns = patterns.filter(p => p.startsWith('!')).map(p => p.slice(1));
      
      // Create matchers (without caching for simplicity)
      const positiveMatcher = positivePatterns.length > 0 
        ? picomatch(positivePatterns, {
            dot: true,
            noglobstar: false,
            bash: true
          })
        : (): boolean => false;
      
      const negativeMatcher = negativePatterns.length > 0
        ? picomatch(negativePatterns, {
            dot: true,
            noglobstar: false,
            bash: true
          })
        : (): boolean => false;
      
      // Check if file matches positive patterns
      const isMatched = positiveMatcher(relativePath);
      
      // If matched, check if it's negated
      if (isMatched && !negativeMatcher(relativePath)) {
        return true; // File is protected
      }
    }
    
    return false; // File is not protected
  }
}