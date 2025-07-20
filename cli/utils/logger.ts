import { Colors } from './colors.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  private prefix: string;
  private level: LogLevel = 'info';
  private readonly levels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(prefix = '') {
    this.prefix = prefix;

    // Check for DEBUG environment variable
    if (process.env['DEBUG']) {
      this.level = 'debug';
    }
  }

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return this.prefix
      ? `[${timestamp}] [${level}] [${this.prefix}] ${message}`
      : `[${timestamp}] [${level}] ${message}`;
  }

  info(message: string): void {
    if (this.shouldLog('info')) {
      console.log(Colors.info(this.formatMessage('INFO', message)));
    }
  }

  success(message: string): void {
    if (this.shouldLog('info')) {
      console.log(Colors.success(this.formatMessage('SUCCESS', message)));
    }
  }

  warn(message: string): void {
    if (this.shouldLog('warn')) {
      console.warn(Colors.warn(this.formatMessage('WARN', message)));
    }
  }

  error(message: string | Error): void {
    if (this.shouldLog('error')) {
      const errorMessage = message instanceof Error ? message.message : message;
      console.error(Colors.error(this.formatMessage('ERROR', errorMessage)));

      if (message instanceof Error && message.stack !== undefined) {
        console.error(Colors.debug(message.stack));
      }
    }
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      const argsStr = args.length > 0 ? ` ${JSON.stringify(args)}` : '';
      console.log(Colors.debug(this.formatMessage('DEBUG', message + argsStr)));
    }
  }

  static create(prefix: string): Logger {
    return new Logger(prefix);
  }
}
