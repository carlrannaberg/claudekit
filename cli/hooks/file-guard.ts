import { BaseHook } from './base.js';
import type { HookContext, HookResult } from './base.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import picomatch from 'picomatch';
import { glob } from 'glob';
import { DEFAULT_PATTERNS } from './sensitive-patterns.js';

// Re-export for backward compatibility
export { DEFAULT_PATTERNS } from './sensitive-patterns.js';

export class FileGuardHook extends BaseHook {
  name = 'file-guard';
  
  static metadata = {
    id: 'file-guard',
    displayName: 'File Guard',
    description: 'Prevents AI from accessing sensitive files based on ignore file patterns',
    category: 'validation' as const,
    triggerEvent: 'PreToolUse' as const,
    matcher: 'Read|Edit|MultiEdit|Write|Bash',
    dependencies: [],
  };

  private ignorePatterns: string[] = [];
  private ignoreFilesFound: string[] = [];
  private projectRoot: string = '';

  async execute(context: HookContext): Promise<HookResult> {
    const { payload, projectRoot } = context;
    
    // Only process relevant tools
    const toolName = payload.tool_name;
    const supportedTools = ['Read', 'Edit', 'MultiEdit', 'Write', 'Bash'];
    if (toolName === undefined || toolName === null || !supportedTools.includes(toolName)) {
      return { exitCode: 0 };
    }
    
    // Load ignore patterns if not already loaded
    if (this.ignorePatterns.length === 0) {
      await this.loadIgnorePatterns(projectRoot);
    }
    
    // Handle Bash commands by scanning for file path candidates
    if (toolName === 'Bash') {
      const toolInput = payload.tool_input as Record<string, unknown> | undefined;
      const command = toolInput?.['command'] as string | undefined;
      if (command === undefined || command === null || command.trim() === '') {
        return { exitCode: 0 };
      }

      const candidates = await this.extractPathsFromCommand(command, projectRoot);
      for (const candidate of candidates) {
        if (await this.isFileProtected(candidate, this.ignorePatterns)) {
          const reason = `Access denied: '${path.basename(candidate)}' is protected by ${this.ignoreFilesFound.length > 0 ? this.ignoreFilesFound.join(', ') : 'default patterns'}. This path in the Bash command matches patterns that prevent AI assistant access.`;
          return this.deny(reason);
        }
      }

      // If no candidates matched protection, allow
      return this.allow();
    }

    // Non-Bash tools: Extract file path from tool input
    const filePath = payload.tool_input?.file_path;
    if (filePath === undefined || filePath === null || String(filePath).trim() === '') {
      return { exitCode: 0 };
    }

    // Check if file is protected
    if (await this.isFileProtected(filePath, this.ignorePatterns)) {
      const reason = `Access denied: '${path.basename(filePath)}' is protected by ${this.ignoreFilesFound.length > 0 ? this.ignoreFilesFound.join(', ') : 'default patterns'}. This file matches patterns that prevent AI assistant access.`;
      return this.deny(reason);
    }
    
    // Allow access if not protected
    return this.allow();
  }

  private allow(): HookResult {
    return {
      exitCode: 0,
      jsonResponse: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
        },
      },
    };
  }

  private deny(reason: string): HookResult {
    return {
      exitCode: 0,
      jsonResponse: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      },
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

  // --- Bash parsing helpers ---
  private async extractPathsFromCommand(command: string, projectRoot: string): Promise<string[]> {
    // 1) Collect simple environment variable assignments
    const varMap = new Map<string, string>();
    const assignRe = /(?:^|[;&|]|&&|\|\||\n)\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s;&|]+))/g;
    let am: RegExpExecArray | null;
    while ((am = assignRe.exec(command)) !== null) {
      const name = am[1];
      const val = (am[3] ?? am[4] ?? am[5] ?? '').toString();
      if (name !== undefined && name !== null && name !== '') {
        varMap.set(name, val);
      }
    }

    // 2) Tokenize while preserving quote type
    type Tok = { text: string; quote: 'none' | 'single' | 'double' };
    const tokens: Tok[] = [];
    const tokenRe = /"([^"]*)"|'([^']*)'|([^\s|;&><(){}]+)/g;
    let tm: RegExpExecArray | null;
    while ((tm = tokenRe.exec(command)) !== null) {
      if (tm[1] !== undefined) {
        tokens.push({ text: tm[1], quote: 'double' });
      } else if (tm[2] !== undefined) {
        tokens.push({ text: tm[2], quote: 'single' });
      } else if (tm[3] !== undefined) {
        tokens.push({ text: tm[3], quote: 'none' });
      }
    }

    // Substitute variables for bare and double-quoted tokens
    const substitute = (text: string, quote: Tok['quote']): string => {
      if (quote === 'single') {
        return text; // No expansion in single quotes
      }
      let out = text;
      out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, v) => (varMap.get(v) ?? _m));
      out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, v) => (varMap.get(v) ?? _m));
      return out;
    };

    // Identify path-like tokens after substitution
    const isPathLike = (raw: string, quote: Tok['quote']): boolean => {
      const t = substitute(raw, quote);
      if (t === undefined || t === null || t === '' || t.startsWith('-')) {
        return false; // flags
      }
      if (t === '|' || t === '||' || t === '&&') {
        return false;
      }
      if (t === '>' || t === '>>' || t === '<' || t.endsWith('>') || t.endsWith('>>')) {
        return false;
      }
      return (
        t.startsWith('.') ||
        t.startsWith('..') ||
        t.startsWith('/') ||
        t.startsWith('~') ||
        t.includes('/') ||
        /^(?:\.[A-Za-z0-9_].*)$/.test(t) ||
        /\.(?:env|json|yaml|yml|txt|pem|key|crt|cer|p12|pfx|gpg|asc|sig|db|sqlite3|ppk|rc|cfg|conf)$/i.test(t)
      );
    };

    const substituted = tokens
      .filter(tok => isPathLike(tok.text, tok.quote))
      .map(tok => substitute(tok.text, tok.quote));

    // 3) Expand globs and normalize to absolute paths
    const globChars = /[*?[\]{}/!]/;
    const results: string[] = [];

    for (const cand of substituted) {
      let expanded = [cand];
      try {
        if (globChars.test(cand)) {
          const matches = await glob(cand, { cwd: projectRoot, dot: true, absolute: true, nocase: false });
          if (matches.length > 0) {
            expanded = matches;
          }
        }
      } catch {
        // ignore glob errors, fall back to raw token
      }

      for (const item of expanded) {
        let abs = item;
        if (item.startsWith('~')) {
          abs = path.join(process.env['HOME'] ?? '', item.slice(1));
        } else if (!path.isAbsolute(item)) {
          abs = path.join(projectRoot, item);
        }
        results.push(abs);
      }
    }

    return Array.from(new Set(results));
  }
}
