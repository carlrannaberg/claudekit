import { BaseHook } from './base.js';
import type { HookContext, HookResult } from './base.js';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
// Optional dependencies (loaded lazily with fallbacks)
type IgnoreEngine = { add: (patterns: string[]) => void; ignores: (path: string) => boolean };
type FastGlob = (pattern: string, options: Record<string, unknown>) => Promise<string[]>;

const tryRequire = (id: string): unknown => { try { return (eval('require'))(id); } catch { return null; } };
const FG = tryRequire('fast-glob') as FastGlob | null;
const IGN = tryRequire('ignore') as (() => IgnoreEngine) | null;
// Local project boundary check (keeps working without external dep)
const isInside = (p: string, root: string): boolean => {
  const rel = path.relative(root, p);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
};
const globToRegExp: (g: string, opts?: Record<string, unknown>) => RegExp = tryRequire('glob-to-regexp') as ((g: string, opts?: Record<string, unknown>) => RegExp)
  ?? ((g: string): RegExp => new RegExp(g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')));
const untildify: (s: string) => string = tryRequire('untildify') as ((s: string) => string)
  ?? ((s: string): string => s.startsWith('~') ? path.join(process.env['HOME'] ?? '', s.slice(1)) : s);
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
  private ignoreEngine: IgnoreEngine | null = null;
  private sensitiveNameRe: RegExp | null = null;

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

      // Sensitive-name heuristics for pipelines that read via xargs/cat or find/xargs/cat
      if (this.detectSensitivePipelines(command)) {
        return this.deny('Access denied: pipeline constructs or locates sensitive filenames for cat.');
      }
      // Heuristic: find -name '.env' ... | xargs -0 cat
      const findEnvToCat = /\bfind\b[\s\S]*?-name\s+(["'])?\.env\1?[\s\S]*?\|[\s\S]*?\bxargs\b[\s\S]*?\bcat\b/i;
      if (findEnvToCat.test(command)) {
        return this.deny("Access denied: pipeline locates '.env' and passes to 'cat'.");
      }

      const candidates = await this.extractPathsFromCommand(command, projectRoot);
      
      // If the command is composed only of echo/printf operations (optionally with var assignments)
      // and does not pipe to xargs+cat, allow to avoid false positives like: echo '.env'
      const isEchoOnly = this.isEchoOnlyCommand(command);
      const hasXargsCat = /\bxargs\b[\s\S]*\bcat\b/.test(command);
      if (isEchoOnly && !hasXargsCat) {
        return this.allow();
      }
      for (const candidate of candidates) {
        if (await this.isFileProtected(candidate)) {
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
    if (await this.isFileProtected(filePath)) {
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
      if (this.ignoreFilesFound.length > 0) {
        this.ignoreFilesFound = [];
      }
    }

    // Build ignore engine (optional dependency)
    this.ignoreEngine = IGN ? IGN() : null;
    if (this.ignoreEngine !== null) {
      this.ignoreEngine.add(this.ignorePatterns);
    }
  }

  private async isFileProtected(filePath: string): Promise<boolean> {
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
      
      // Don't allow access outside project root
      if (!isInside(normalizedPath, this.projectRoot)) {
        return true; // Block access outside project
      }
      // Use ignore engine (if available) to determine if protected
      if (this.ignoreEngine !== null && this.ignoreEngine.ignores(relativePath) === true) {
        return true;
      }
    }
    
    // Fallback: basic check against default patterns via glob regex
    const fallbackUnion = DEFAULT_PATTERNS.map((g) => globToRegExp(g, { flags: 'i', extended: true, globstar: true }).test(filePath)).some(Boolean);
    return fallbackUnion === true ? true : false; // File is not protected if no matches
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

    type Tok = { text: string; quote: 'none' | 'single' | 'double' };
    const tokenize = (segment: string): Tok[] => {
      const res: Tok[] = [];
      const re = /"([^"]*)"|'([^']*)'|([^\s|;&><(){}]+)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(segment)) !== null) {
        if (m[1] !== undefined) {res.push({ text: m[1], quote: 'double' });}
        else if (m[2] !== undefined) {res.push({ text: m[2], quote: 'single' });}
        else if (m[3] !== undefined) {res.push({ text: m[3], quote: 'none' });}
      }
      return res;
    };

    const substitute = (text: string, quote: Tok['quote']): string => {
      if (quote === 'single') {return text;}
      let out = text;
      out = out.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_m, v) => (varMap.get(v) ?? _m));
      out = out.replace(/\$([A-Za-z_][A-Za-z0-9_]*)/g, (_m, v) => (varMap.get(v) ?? _m));
      return out;
    };

    const isOption = (t: string): boolean => t.startsWith('-');

    // Split by separators into segments to analyze per-command context
    const segments = command.split(/(?:\|\||&&|[|;])/).map(s => s.trim()).filter(Boolean);
    // Include inner commands of process substitution <( ... ) and >( ... )
    const psGlobal = /<\(([^)]*)\)|>\(([^)]*)\)/g;
    let psm: RegExpExecArray | null;
    while ((psm = psGlobal.exec(command)) !== null) {
      const inner = (psm[1] ?? psm[2]) ?? '';
      if (inner.trim().length > 0) {segments.push(inner.trim());}
    }
    const substituted: string[] = [];

    for (const seg of segments) {
      // Ignore here-strings and here-docs which provide literal content
      if (seg.includes('<<<') || seg.includes('<<')) {
        continue;
      }
      const toksArr = tokenize(seg);
      const toks: Tok[] = Array.isArray(toksArr) ? [...toksArr] : [];
      // Drop leading env assignments
      while (toks.length > 0 && /^(?:[A-Za-z_][A-Za-z0-9_]*)=/.test(toks[0]?.text ?? '')) {
        toks.shift();
      }
      if (toks.length === 0) {continue;}
      const cmd = toks[0]?.text ?? '';

      // Ignore pure output commands
      if (/^(echo|printf)$/i.test(cmd)) {continue;}
      if (/^xargs$/i.test(cmd)) {continue;} // handled via hasXargsCat earlier

      // Skip initial options
      let idx = 1;
      while (idx < toks.length && isOption(toks[idx]?.text ?? '')) {idx++;}

      if (/^(grep|rg)$/i.test(cmd)) {
        // Skip the pattern argument
        idx++;
        while (idx < toks.length && isOption(toks[idx]?.text ?? '')) {idx++;}
      } else if (/^sed$/i.test(cmd)) {
        // Skip sed script
        idx++;
        while (idx < toks.length && isOption(toks[idx]?.text ?? '')) {idx++;}
      } else if (/^awk$/i.test(cmd)) {
        // Skip awk program
        idx++;
        while (idx < toks.length && isOption(toks[idx]?.text ?? '')) {idx++;}
      }

      for (; idx < toks.length; idx++) {
        const tok = toks[idx];
        if (!tok) {continue;}
        // If option with inline value via '=', capture potential path value
        if (isOption(tok.text)) {
          const eq = tok.text.indexOf('=');
          if (eq > 0) {
            const valRaw = tok.text.slice(eq + 1);
            const val = substitute(valRaw, tok.quote);
            if (val) {substituted.push(val);}
          }
          continue;
        }
        const s = substitute(tok.text, tok.quote);
        substituted.push(s);
        // Extract @file references commonly used by curl/httpie forms: key=@path;type=...
        const atIdx = s.indexOf('@');
        if (atIdx >= 0) {
          // Accept both '@path' and 'name=@path' patterns
          const after = s.slice(atIdx + 1);
          // Stop at semicolon or comma if present
          const stop = after.search(/[;,]/);
          const fileRef = stop >= 0 ? after.slice(0, stop) : after;
          if (fileRef && !fileRef.startsWith('http')) {
            substituted.push(fileRef);
          }
        }
      }
    }

    // 2) Expand globs and normalize to absolute paths
    const globChars = /[*?[\]{}/!]/;
    const results: string[] = [];

    for (const cand of substituted) {
      let expanded = [cand];
      try {
        if (globChars.test(cand) && FG !== null) {
          const matches = await FG(cand, { cwd: projectRoot, dot: true, absolute: true, caseSensitiveMatch: true });
          if (matches.length > 0) {
            expanded = matches;
          }
        }
      } catch {
        // ignore glob errors, fall back to raw token
      }

      for (const item of expanded) {
        let abs = untildify(item);
        if (!path.isAbsolute(abs)) {
          abs = path.join(projectRoot, abs);
        }
        results.push(abs);
      }
    }

    // Filter out device files like /dev/null
    const filtered = results.filter(p => !(p === '/dev/null' || p.startsWith('/dev/')));
    return Array.from(new Set(filtered));
  }

  // Detect commands that only print text (echo/printf), possibly with leading var assignments
  private isEchoOnlyCommand(command: string): boolean {
    // Strip leading exports/assignments like: VAR=..., export VAR=...
    const assign = String.raw`(?:export\s+)?[A-Za-z_][A-Za-z0-9_]*\s*=\s*(?:"[^"]*"|'[^']*'|[^\s;&|]+)`;
    const leadingAssigns = new RegExp(String.raw`^(?:\s*(?:${assign})\s*;\s*)*`);
    const withoutAssigns = command.replace(leadingAssigns, '');

    // Split by separators ;, &&, ||, | and check each segment starts with echo or printf
    const segments = withoutAssigns
      .split(/(?:(?:\|\|)|(?:&&)|[;|])/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (segments.length === 0) {return false;}
    return segments.every(seg => /^(echo|printf)\b/i.test(seg));
  }

  // Build a regex that matches sensitive base names used in common pipelines
  private getSensitiveNameRegex(): RegExp {
    if (this.sensitiveNameRe) {return this.sensitiveNameRe;}
    // Representative set of high-risk name/glob patterns
    const union = [
      '.env', '.env.*',
      '.npmrc', '.pypirc', '.pgpass', '.my.cnf',
      '.netrc', '.authinfo', '.authinfo.gpg', '.git-credentials',
      'id_rsa*', 'id_dsa*', 'id_ecdsa*', 'id_ed25519*', '*.ppk',
      '*.pem', '*.key', '*.crt', '*.cer', '*.p12', '*.pfx', '*.gpg', '*.asc',
      '*.sqlite3',
      'wallet.dat', 'wallet.json', '*.wallet',
      'token.*', '*_token.txt', '*_token.json', 'secrets.*', 'credentials.*'
    ].map((g) => globToRegExp(g, { flags: 'i', extended: true, globstar: true }).source).join('|');
    this.sensitiveNameRe = new RegExp(`(?:${union})`, 'i');
    return this.sensitiveNameRe;
  }

  // Heuristics to detect risky pipelines not caught by simple path extraction
  private detectSensitivePipelines(command: string): boolean {
    const nameRe = this.getSensitiveNameRegex();

    // Case 1: echo/printf of a sensitive name piped to xargs ... cat
    // Capture the immediate argument (quoted or unquoted)
    const echoPipe = /\b(?:echo|printf)\b\s+((?:"[^"]+"|'[^']+'|\S+))/gi;
    let m: RegExpExecArray | null;
    while ((m = echoPipe.exec(command)) !== null) {
      const arg = m[1]?.trim() ?? '';
      const unq = arg.replace(/^['"]|['"]$/g, '');
      if (nameRe.test(unq)) {
        // ensure later in the pipeline we see xargs ... cat
        const tail = command.slice(m.index + m[0].length);
        if (/\|[\s\S]*?\bxargs\b[\s\S]*?\bcat\b/i.test(tail)) {return true;}
      }
    }

    // Quick heuristic: find ... -(regex|iregex) ... 'pem' ... | xargs ... cat
    if (/\bfind\b[\s\S]*?-(?:regex|iregex)\s+(?:"[^"]*pem[^"]*"|'[^']*pem[^']*'|\S*pem\S*)[\s\S]*?\|[\s\S]*?\bxargs\b[\s\S]*?\bcat\b/i.test(command)) {
      return true;
    }

    // Case 2: find ... -name/-iname/-regex/-iregex PATTERN ... | xargs ... cat OR -exec cat
    const findSegRe = /\bfind\b[\s\S]*?(?=(?:\n|$))/gi;
    while ((m = findSegRe.exec(command)) !== null) {
      const seg = m[0];
      // Extract -name/-iname argument
      const nameArgRe = /-(?:name|iname)\s+(?:"([^"]+)"|'([^']+)'|(\S+))/i;
      const nm = nameArgRe.exec(seg);
      const pat = nm ? (nm[1] ?? nm[2] ?? nm[3] ?? '') : '';
      if (pat && nameRe.test(pat)) {
        // Check if this segment or the rest pipelines to cat
        const rest = command.slice(m.index + seg.length);
        const tailAll = command.slice(m.index);
        if (/\bxargs\b[\s\S]*?\bcat\b/i.test(rest) || /\bxargs\b[\s\S]*?\bcat\b/i.test(tailAll) || /-exec\s+cat\b/i.test(seg)) {return true;}
      }

      // Extract -regex/-iregex patterns and check for sensitive keywords
      const regexArgRe = /-(?:regex|iregex)\s+(?:"([^"]+)"|'([^']+)'|(\S+))/ig;
      let rx: RegExpExecArray | null;
      const sensitiveKeywords = [
        'env', 'npmrc', 'pypirc', 'pgpass', 'my.cnf', 'netrc', 'authinfo', 'git-credentials',
        'id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519', 'ppk', 'pem', 'key', 'crt', 'cer', 'p12', 'pfx', 'gpg', 'asc',
        'sqlite3', 'wallet', 'token', 'secret', 'credentials'
      ];
      while ((rx = regexArgRe.exec(seg)) !== null) {
        const rpat = (rx[1] ?? rx[2] ?? rx[3] ?? '').toLowerCase();
        if (rpat && sensitiveKeywords.some(kw => rpat.includes(kw))) {
          const rest2 = command.slice(m.index + seg.length);
          if (/\bxargs\b[\s\S]*?\bcat\b/i.test(rest2) || /-exec\s+cat\b/i.test(seg)) {return true;}
        }
      }
    }

    return false;
  }
}
