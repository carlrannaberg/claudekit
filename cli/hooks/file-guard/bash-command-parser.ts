import * as path from 'node:path';
import fastGlob from 'fast-glob';

const untildify = (str: string): string => {
  if (str.startsWith('~')) {
    const home = process.env['HOME'];
    return (home !== null && home !== undefined && home !== '') ? path.join(home, str.slice(1)) : str;
  }
  return str;
};

type Tok = { text: string; quote: 'none' | 'single' | 'double' };

export class BashCommandParser {
  /**
   * Fast path for obviously safe commands
   */
  public isDefinitelySafeCommand(command: string): boolean {
    // Commands that are definitely safe without path analysis
    const trimmed = command.trim();
    
    // Single word commands that don't access files
    const safeCommands = /^(?:echo|printf|date|whoami|pwd|which|type|history|alias|unalias|help|true|false|yes|no)\s/;
    if (safeCommands.test(trimmed)) {
      return true;
    }
    
    // Commands with only literal strings (no variables or file paths)
    const segments = trimmed.split(/[;&|]/).map(s => s.trim());
    return segments.length === 1 && 
           /^(?:echo|printf)\s+["'][^"'$`]*["']\s*$/.test(segments[0] ?? '');
  }

  /**
   * Determines if command needs comprehensive parsing vs lightweight parsing
   */
  public needsComprehensiveParsing(command: string): boolean {
    return (
      // Contains sensitive file patterns
      /\b(?:\.env|id_rsa|\.pem|\.key|token|secret|wallet|npmrc|pgpass|netrc|authinfo|git-credentials|sqlite3|ppk|crt|cer|p12|pfx|gpg|asc)\b/i.test(command) ||
      // Contains variable assignments or expansions
      /[A-Za-z_][A-Za-z0-9_]*\s*=|[$][A-Za-z_{]/.test(command) ||
      // Contains @file references (curl/httpie uploads)
      /[@][^\s@]+/.test(command) ||
      // Contains complex shell constructs
      /[|;&]/.test(command)
    );
  }

  /**
   * Lightweight parsing for commands unlikely to contain sensitive paths
   */
  public async extractPathsLightweight(command: string, projectRoot: string): Promise<string[]> {
    const candidates: string[] = [];
    
    // Quick regex to find obvious file paths
    const pathLikePatterns = [
      /(?:^|\s)([.~/][^\s|;&<>(){}]*)/g,  // Paths starting with . ~ /
      /(?:^|\s)([^\s|;&<>(){}]*\.[a-z]{2,4})(?:\s|$)/gi, // Files with extensions
      /(?:^|\s)([^\s|;&<>(){}]*\/[^\s|;&<>(){}]*)/g // Paths with slashes
    ];
    
    for (const pattern of pathLikePatterns) {
      let match;
      while ((match = pattern.exec(command)) !== null) {
        const candidate = match[1];
        if (candidate !== undefined && candidate !== null && candidate !== '') {
          candidates.push(path.isAbsolute(candidate) ? candidate : path.join(projectRoot, candidate));
        }
      }
    }
    
    return Array.from(new Set(candidates));
  }

  /**
   * Comprehensive parsing for potentially risky commands
   */
  public async extractPathsComprehensive(command: string, projectRoot: string): Promise<string[]> {
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
      const toksArr = this.tokenize(seg);
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
        if (globChars.test(cand)) {
          const matches = await fastGlob(cand, { cwd: projectRoot, dot: true, absolute: true, caseSensitiveMatch: true });
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

  /**
   * Safe iterative tokenization to prevent ReDoS attacks
   */
  private tokenize(segment: string): Tok[] {
    const res: Tok[] = [];
    let i = 0;
    
    while (i < segment.length) {
      const char = segment[i];
      if (char === undefined || char === null || char === '') {
        break; // Safety check
      }
      
      // Skip whitespace and separators
      if (/[\s|;&><(){}]/.test(char)) {
        i++;
        continue;
      }
      
      if (char === '"') {
        // Handle double-quoted strings
        const start = ++i; // Skip opening quote
        while (i < segment.length && segment[i] !== '"') {
          if (segment[i] === '\\') {
            i++; // Skip escaped character
          }
          i++;
        }
        res.push({ text: segment.slice(start, i), quote: 'double' });
        i++; // Skip closing quote
      } else if (char === "'") {
        // Handle single-quoted strings
        const start = ++i; // Skip opening quote
        while (i < segment.length && segment[i] !== "'") {
          i++;
        }
        res.push({ text: segment.slice(start, i), quote: 'single' });
        i++; // Skip closing quote
      } else {
        // Handle unquoted tokens
        const start = i;
        while (i < segment.length) {
          const currentChar = segment[i];
          if (currentChar === undefined || currentChar === null || currentChar === '' || /[\s|;&><(){}]/.test(currentChar)) {
            break;
          }
          i++;
        }
        if (i > start) {
          res.push({ text: segment.slice(start, i), quote: 'none' });
        }
      }
    }
    
    return res;
  }

  /**
   * Detect commands that only print text (echo/printf), possibly with leading var assignments
   */
  public isEchoOnlyCommand(command: string): boolean {
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
}