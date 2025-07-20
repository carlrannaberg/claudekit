import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Colors, symbols, status, colors } from '../cli/utils/colors.js';

describe('Colors utility', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalIsTTY: boolean;

  beforeEach(() => {
    // Save original environment and TTY state
    originalEnv = { ...process.env };
    originalIsTTY = process.stdout.isTTY;
    
    // Reset colors to environment detection
    Colors.reset();
  });

  afterEach(() => {
    // Restore original environment and TTY state
    process.env = originalEnv;
    Object.defineProperty(process.stdout, 'isTTY', {
      value: originalIsTTY,
      writable: true
    });
    
    // Reset colors
    Colors.reset();
  });

  describe('Environment detection', () => {
    it('should enable colors by default in TTY', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      delete process.env['NO_COLOR'];
      delete process.env['FORCE_COLOR'];
      
      Colors.reset();
      expect(Colors.enabled).toBe(true);
    });

    it('should disable colors when NO_COLOR is set', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      process.env['NO_COLOR'] = '1';
      
      Colors.reset();
      expect(Colors.enabled).toBe(false);
    });

    it('should disable colors when NO_COLOR is empty string', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      process.env['NO_COLOR'] = '';
      
      Colors.reset();
      expect(Colors.enabled).toBe(false);
    });

    it('should disable colors in non-TTY environment', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      delete process.env['NO_COLOR'];
      
      Colors.reset();
      expect(Colors.enabled).toBe(false);
    });

    it('should disable colors when FORCE_COLOR is 0', () => {
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      process.env['FORCE_COLOR'] = '0';
      delete process.env['NO_COLOR'];
      
      Colors.reset();
      expect(Colors.enabled).toBe(false);
    });
  });

  describe('Manual control', () => {
    it('should allow manually enabling colors', () => {
      Colors.setEnabled(true);
      expect(Colors.enabled).toBe(true);
    });

    it('should allow manually disabling colors', () => {
      Colors.setEnabled(false);
      expect(Colors.enabled).toBe(false);
    });
  });

  describe('Color methods when enabled', () => {
    beforeEach(() => {
      Colors.forceEnable();
    });

    it('should apply success color (green)', () => {
      const result = Colors.success('test message');
      expect(result).toContain('test message');
      // Should contain ANSI escape codes when colors enabled
      expect(result).not.toBe('test message');
    });

    it('should apply error color (red)', () => {
      const result = Colors.error('error message');
      expect(result).toContain('error message');
      expect(result).not.toBe('error message');
    });

    it('should apply warning color (yellow)', () => {
      const result = Colors.warn('warning message');
      expect(result).toContain('warning message');
      expect(result).not.toBe('warning message');
    });

    it('should apply info color (cyan)', () => {
      const result = Colors.info('info message');
      expect(result).toContain('info message');
      expect(result).not.toBe('info message');
    });

    it('should apply debug color (gray)', () => {
      const result = Colors.debug('debug message');
      expect(result).toContain('debug message');
      expect(result).not.toBe('debug message');
    });

    it('should apply accent color (blue)', () => {
      const result = Colors.accent('accent message');
      expect(result).toContain('accent message');
      expect(result).not.toBe('accent message');
    });

    it('should apply bold formatting', () => {
      const result = Colors.bold('bold message');
      expect(result).toContain('bold message');
      expect(result).not.toBe('bold message');
    });

    it('should apply dim formatting', () => {
      const result = Colors.dim('dim message');
      expect(result).toContain('dim message');
      expect(result).not.toBe('dim message');
    });

    it('should apply underline formatting', () => {
      const result = Colors.underline('underlined message');
      expect(result).toContain('underlined message');
      expect(result).not.toBe('underlined message');
    });
  });

  describe('Color methods when disabled', () => {
    beforeEach(() => {
      Colors.setEnabled(false);
    });

    it('should return plain text for success', () => {
      const result = Colors.success('test message');
      expect(result).toBe('test message');
    });

    it('should return plain text for error', () => {
      const result = Colors.error('error message');
      expect(result).toBe('error message');
    });

    it('should return plain text for warning', () => {
      const result = Colors.warn('warning message');
      expect(result).toBe('warning message');
    });

    it('should return plain text for info', () => {
      const result = Colors.info('info message');
      expect(result).toBe('info message');
    });

    it('should return plain text for debug', () => {
      const result = Colors.debug('debug message');
      expect(result).toBe('debug message');
    });

    it('should return plain text for accent', () => {
      const result = Colors.accent('accent message');
      expect(result).toBe('accent message');
    });

    it('should return plain text for bold', () => {
      const result = Colors.bold('bold message');
      expect(result).toBe('bold message');
    });

    it('should return plain text for dim', () => {
      const result = Colors.dim('dim message');
      expect(result).toBe('dim message');
    });

    it('should return plain text for underline', () => {
      const result = Colors.underline('underlined message');
      expect(result).toBe('underlined message');
    });
  });

  describe('Raw picocolors access', () => {
    it('should provide colored picocolors when enabled', () => {
      Colors.forceEnable();
      const result = Colors.pc.red('test');
      expect(result).not.toBe('test');
      expect(result).toContain('test');
    });

    it('should provide no-op picocolors when disabled', () => {
      Colors.setEnabled(false);
      const result = Colors.pc.red('test');
      expect(result).toBe('test');
    });
  });

  describe('Symbols', () => {
    it('should provide success symbol', () => {
      Colors.forceEnable();
      expect(symbols.success).toContain('✓');
    });

    it('should provide error symbol', () => {
      Colors.forceEnable();
      expect(symbols.error).toContain('✗');
    });

    it('should provide warning symbol', () => {
      Colors.forceEnable();
      expect(symbols.warning).toContain('⚠');
    });

    it('should provide info symbol', () => {
      Colors.forceEnable();
      expect(symbols.info).toContain('ℹ');
    });

    it('should provide plain symbols when colors disabled', () => {
      Colors.setEnabled(false);
      expect(symbols.success).toBe('✓');
      expect(symbols.error).toBe('✗');
      expect(symbols.warning).toBe('⚠');
      expect(symbols.info).toBe('ℹ');
    });
  });

  describe('Status formatters', () => {
    it('should format success status', () => {
      Colors.forceEnable();
      const result = status.success('Operation completed');
      expect(result).toContain('✓');
      expect(result).toContain('Operation completed');
    });

    it('should format error status', () => {
      Colors.forceEnable();
      const result = status.error('Operation failed');
      expect(result).toContain('✗');
      expect(result).toContain('Operation failed');
    });

    it('should format warning status', () => {
      Colors.forceEnable();
      const result = status.warning('Warning message');
      expect(result).toContain('⚠');
      expect(result).toContain('Warning message');
    });

    it('should format info status', () => {
      Colors.forceEnable();
      const result = status.info('Info message');
      expect(result).toContain('ℹ');
      expect(result).toContain('Info message');
    });

    it('should format plain status when colors disabled', () => {
      Colors.setEnabled(false);
      const result = status.success('Success message');
      expect(result).toBe('✓ Success message');
    });
  });

  describe('Exports', () => {
    it('should export Colors as colors', () => {
      expect(colors).toBe(Colors);
    });

    it('should export Colors as default', async () => {
      // Import the default export for testing
      const module = await import('../cli/utils/colors.js');
      expect(module.default).toBe(Colors);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle CI environment (NO_COLOR set)', () => {
      process.env['NO_COLOR'] = '1';
      process.env['CI'] = 'true';
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      
      Colors.reset();
      expect(Colors.enabled).toBe(false);
      expect(Colors.success('test')).toBe('test');
    });

    it('should handle terminal with TTY support', () => {
      delete process.env['NO_COLOR'];
      delete process.env['FORCE_COLOR'];
      Object.defineProperty(process.stdout, 'isTTY', { value: true, writable: true });
      
      Colors.reset();
      expect(Colors.enabled).toBe(true);
      // Force enable to test coloring regardless of current environment
      Colors.forceEnable();
      expect(Colors.success('test')).not.toBe('test');
    });

    it('should handle redirected output (non-TTY)', () => {
      delete process.env['NO_COLOR'];
      Object.defineProperty(process.stdout, 'isTTY', { value: false, writable: true });
      
      Colors.reset();
      expect(Colors.enabled).toBe(false);
      expect(Colors.success('test')).toBe('test');
    });
  });
});