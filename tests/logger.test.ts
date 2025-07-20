import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Logger } from '../cli/utils/logger.js';
import { Colors } from '../cli/utils/colors.js';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Disable colors for consistent testing
    Colors.setEnabled(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Colors.reset();
  });

  describe('basic logging', () => {
    it('should log info messages', () => {
      const logger = new Logger();
      logger.info('Test info message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[INFO]');
      expect(loggedMessage).toContain('Test info message');
    });

    it('should log success messages', () => {
      const logger = new Logger();
      logger.success('Test success message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[SUCCESS]');
      expect(loggedMessage).toContain('Test success message');
    });

    it('should log warning messages', () => {
      const logger = new Logger();
      logger.warn('Test warning message');

      expect(consoleWarnSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleWarnSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[WARN]');
      expect(loggedMessage).toContain('Test warning message');
    });

    it('should log error messages', () => {
      const logger = new Logger();
      logger.error('Test error message');

      expect(consoleErrorSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[ERROR]');
      expect(loggedMessage).toContain('Test error message');
    });

    it('should log Error objects', () => {
      const logger = new Logger();
      const error = new Error('Test error object');
      logger.error(error);

      expect(consoleErrorSpy).toHaveBeenCalled();
      const loggedMessage = consoleErrorSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[ERROR]');
      expect(loggedMessage).toContain('Test error object');
    });
  });

  describe('prefixed logging', () => {
    it('should include prefix in log messages', () => {
      const logger = new Logger('TestModule');
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[TestModule]');
      expect(loggedMessage).toContain('Test message');
    });
  });

  describe('debug logging', () => {
    it('should not log debug messages by default', () => {
      const logger = new Logger();
      logger.debug('Test debug message');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should log debug messages when DEBUG env var is set', () => {
      process.env['DEBUG'] = 'true';

      const logger = new Logger();
      logger.debug('Test debug message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[DEBUG]');
      expect(loggedMessage).toContain('Test debug message');

      delete process.env['DEBUG'];
    });
  });

  describe('factory method', () => {
    it('should create logger with prefix', () => {
      const logger = Logger.create('FactoryTest');
      logger.info('Test message');

      expect(consoleLogSpy).toHaveBeenCalledOnce();
      const loggedMessage = consoleLogSpy.mock.calls[0]?.[0] as string;
      expect(loggedMessage).toContain('[FactoryTest]');
    });
  });
});
