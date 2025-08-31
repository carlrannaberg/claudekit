import { globToRegExp } from './utils.js';

export class SecurityHeuristicsEngine {
  // Pre-compile sensitive patterns at class level for zero-cost access
  private static readonly COMPILED_SENSITIVE_REGEX = ((): RegExp => {
    const patterns = [
      '.env', '.env.*',
      '.npmrc', '.pypirc', '.pgpass', '.my.cnf',
      '.netrc', '.authinfo', '.authinfo.gpg', '.git-credentials',
      'id_rsa*', 'id_dsa*', 'id_ecdsa*', 'id_ed25519*', '*.ppk',
      '*.pem', '*.key', '*.crt', '*.cer', '*.p12', '*.pfx', '*.gpg', '*.asc',
      '*.sqlite3',
      'wallet.dat', 'wallet.json', '*.wallet',
      'token.*', '*_token.txt', '*_token.json', 'secrets.*', 'credentials.*'
    ];
    const union = patterns.map(g => globToRegExp(g, { flags: 'i', extended: true, globstar: true }).source).join('|');
    return new RegExp(`(?:${union})`, 'i');
  })();

  /**
   * Get the pre-compiled regex that matches sensitive base names used in common pipelines
   */
  public getSensitiveNameRegex(): RegExp {
    return SecurityHeuristicsEngine.COMPILED_SENSITIVE_REGEX;
  }

  /**
   * Heuristics to detect risky pipelines not caught by simple path extraction
   */
  public detectSensitivePipelines(command: string): boolean {
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