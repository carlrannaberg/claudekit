// import pc from 'picocolors'; // Unused

/**
 * Enhanced color utility that respects NO_COLOR environment variable
 * and provides fallback for non-TTY terminals
 */

interface ColorOptions {
  force?: boolean;
}

/**
 * Check if colors should be enabled based on environment
 */
function shouldUseColors(options: ColorOptions = {}): boolean {
  // Force colors if explicitly requested
  if (options.force) {
    return true;
  }

  // Respect NO_COLOR environment variable (https://no-color.org/)
  if (process.env['NO_COLOR'] !== undefined) {
    return false;
  }

  // Check if colors are explicitly disabled
  if (process.env['FORCE_COLOR'] === '0') {
    return false;
  }

  // Check if stdout is a TTY (terminal)
  // Note: isTTY can be undefined in some environments
  if (process.stdout.isTTY !== true) {
    return false;
  }

  return true;
}

/**
 * Color utility functions that respect environment settings
 */
export class Colors {
  private static useColors = shouldUseColors();

  /**
   * Force enable or disable colors (useful for testing)
   */
  static setEnabled(enabled: boolean): void {
    Colors.useColors = enabled;
  }

  /**
   * Reset colors to environment-based detection
   */
  static reset(): void {
    Colors.useColors = shouldUseColors();
  }

  /**
   * Force colors to be enabled regardless of environment (mainly for testing)
   */
  static forceEnable(): void {
    Colors.useColors = shouldUseColors({ force: true });
  }

  /**
   * Check if colors are currently enabled
   */
  static get enabled(): boolean {
    return Colors.useColors;
  }

  // Success messages (green)
  static success(text: string): string {
    return Colors.useColors ? `\x1b[32m${text}\x1b[0m` : text;
  }

  // Error messages (red)
  static error(text: string): string {
    return Colors.useColors ? `\x1b[31m${text}\x1b[0m` : text;
  }

  // Warning messages (yellow)
  static warn(text: string): string {
    return Colors.useColors ? `\x1b[33m${text}\x1b[0m` : text;
  }

  // Info messages (cyan)
  static info(text: string): string {
    return Colors.useColors ? `\x1b[36m${text}\x1b[0m` : text;
  }

  // Debug messages (gray)
  static debug(text: string): string {
    return Colors.useColors ? `\x1b[90m${text}\x1b[0m` : text;
  }

  // Accent/highlight text (blue)
  static accent(text: string): string {
    return Colors.useColors ? `\x1b[34m${text}\x1b[0m` : text;
  }

  // Bold text
  static bold(text: string): string {
    return Colors.useColors ? `\x1b[1m${text}\x1b[0m` : text;
  }

  // Dim/subtle text
  static dim(text: string): string {
    return Colors.useColors ? `\x1b[2m${text}\x1b[0m` : text;
  }

  // Underlined text
  static underline(text: string): string {
    return Colors.useColors ? `\x1b[4m${text}\x1b[0m` : text;
  }

  // Raw picocolors for complex styling (only when colors enabled)
  static get pc() {
    if (Colors.useColors) {
      // Use direct ANSI codes when colors are forced (bypasses picocolors environment detection)
      return {
        red: (text: string) => `\x1b[31m${text}\x1b[0m`,
        green: (text: string) => `\x1b[32m${text}\x1b[0m`,
        yellow: (text: string) => `\x1b[33m${text}\x1b[0m`,
        blue: (text: string) => `\x1b[34m${text}\x1b[0m`,
        magenta: (text: string) => `\x1b[35m${text}\x1b[0m`,
        cyan: (text: string) => `\x1b[36m${text}\x1b[0m`,
        white: (text: string) => `\x1b[37m${text}\x1b[0m`,
        black: (text: string) => `\x1b[30m${text}\x1b[0m`,
        gray: (text: string) => `\x1b[90m${text}\x1b[0m`,
        grey: (text: string) => `\x1b[90m${text}\x1b[0m`,
        bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
        dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
        italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
        underline: (text: string) => `\x1b[4m${text}\x1b[0m`,
        strikethrough: (text: string) => `\x1b[9m${text}\x1b[0m`,
        inverse: (text: string) => `\x1b[7m${text}\x1b[0m`,
        bgRed: (text: string) => `\x1b[41m${text}\x1b[0m`,
        bgGreen: (text: string) => `\x1b[42m${text}\x1b[0m`,
        bgYellow: (text: string) => `\x1b[43m${text}\x1b[0m`,
        bgBlue: (text: string) => `\x1b[44m${text}\x1b[0m`,
        bgMagenta: (text: string) => `\x1b[45m${text}\x1b[0m`,
        bgCyan: (text: string) => `\x1b[46m${text}\x1b[0m`,
        bgWhite: (text: string) => `\x1b[47m${text}\x1b[0m`,
        bgBlack: (text: string) => `\x1b[40m${text}\x1b[0m`,
        bgGray: (text: string) => `\x1b[100m${text}\x1b[0m`,
        bgGrey: (text: string) => `\x1b[100m${text}\x1b[0m`,
      };
    } else {
      // Return no-op functions when colors are disabled
      return {
        red: (text: string) => text,
        green: (text: string) => text,
        yellow: (text: string) => text,
        blue: (text: string) => text,
        magenta: (text: string) => text,
        cyan: (text: string) => text,
        white: (text: string) => text,
        black: (text: string) => text,
        gray: (text: string) => text,
        grey: (text: string) => text,
        bold: (text: string) => text,
        dim: (text: string) => text,
        italic: (text: string) => text,
        underline: (text: string) => text,
        strikethrough: (text: string) => text,
        inverse: (text: string) => text,
        bgRed: (text: string) => text,
        bgGreen: (text: string) => text,
        bgYellow: (text: string) => text,
        bgBlue: (text: string) => text,
        bgMagenta: (text: string) => text,
        bgCyan: (text: string) => text,
        bgWhite: (text: string) => text,
        bgBlack: (text: string) => text,
        bgGray: (text: string) => text,
        bgGrey: (text: string) => text,
      };
    }
  }
}

/**
 * Convenience functions for common color patterns
 */

// Checkmarks and symbols
export const symbols = {
  success: Colors.success('✓'),
  error: Colors.error('✗'),
  warning: Colors.warn('⚠'),
  info: Colors.info('ℹ'),
  arrow: Colors.dim('→'),
  bullet: Colors.dim('•'),
  dash: Colors.dim('─'),
};

// Status indicators
export const status = {
  success: (text: string) => `${symbols.success} ${Colors.success(text)}`,
  error: (text: string) => `${symbols.error} ${Colors.error(text)}`,
  warning: (text: string) => `${symbols.warning} ${Colors.warn(text)}`,
  info: (text: string) => `${symbols.info} ${Colors.info(text)}`,
};

// Convenience export for the main colors class
export const colors = Colors;

// Default export for easy importing
export default Colors;
