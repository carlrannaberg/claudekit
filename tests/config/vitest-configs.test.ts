/**
 * Tests for Vitest configuration validation
 * Ensures both main and hook configs are properly structured and load successfully
 */

import { describe, it, expect } from 'vitest';
import { performance } from 'perf_hooks';

describe('Vitest Configuration Validation', () => {
  describe('Main Configuration', () => {
    it('should load main vitest config without errors', async () => {
      // Import the config and verify it loads without throwing
      const config = await import('../../vitest.config');
      expect(config.default).toBeDefined();
      expect(config.default.test).toBeDefined();
    });

    it('should have required structural properties', async () => {
      const config = await import('../../vitest.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      // Verify essential structural requirements exist (not specific values)
      expect(testConfig).toHaveProperty('pool');
      expect(testConfig).toHaveProperty('testTimeout');
      expect(testConfig).toHaveProperty('hookTimeout');
      expect(testConfig).toHaveProperty('teardownTimeout');
      expect(testConfig).toHaveProperty('setupFiles');
    });
  });

  describe('Hook Configuration', () => {
    it('should load hook vitest config without errors', async () => {
      const config = await import('../../vitest.hook.config');
      expect(config.default).toBeDefined();
      expect(config.default.test).toBeDefined();
    });

    it('should have required structural properties', async () => {
      const config = await import('../../vitest.hook.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      // Verify essential structural requirements exist (not specific values)
      expect(testConfig).toHaveProperty('pool');
      expect(testConfig).toHaveProperty('testTimeout');
      expect(testConfig).toHaveProperty('hookTimeout'); 
      expect(testConfig).toHaveProperty('teardownTimeout');
      expect(testConfig).toHaveProperty('setupFiles');
      expect(testConfig).toHaveProperty('include');
      expect(testConfig).toHaveProperty('exclude');
      expect(testConfig).toHaveProperty('silent');
    });

    it('should include essential test files', async () => {
      const config = await import('../../vitest.hook.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      // Verify it includes critical hook test files (structural requirement)
      expect(testConfig?.include).toContain('tests/unit/typecheck-project.test.ts');
      expect(testConfig?.include).toContain('tests/unit/lint-project.test.ts');
    });
  });

  describe('Performance Validation', () => {
    it('should demonstrate config loading is fast', async () => {
      const start = performance.now();
      
      // Load both configs
      await Promise.all([
        import('../../vitest.config'),
        import('../../vitest.hook.config')
      ]);
      
      const duration = performance.now() - start;
      
      // Config loading should be nearly instantaneous (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should have different optimization strategies', async () => {
      const [mainConfig, hookConfig] = await Promise.all([
        import('../../vitest.config'),
        import('../../vitest.hook.config')
      ]);

      const main = mainConfig.default.test;
      const hook = hookConfig.default.test;

      expect(main).toBeDefined();
      expect(hook).toBeDefined();

      // Verify configs use different pool strategies (structural difference)
      expect(main?.pool).toBeDefined();
      expect(hook?.pool).toBeDefined();
      expect(main?.pool).not.toBe(hook?.pool);

      // Hook config should be more aggressive with timeouts (relative comparison)
      if (hook?.testTimeout !== undefined && main?.testTimeout !== undefined) {
        expect(hook.testTimeout).toBeLessThan(main.testTimeout);
      }
      if (hook?.hookTimeout !== undefined && main?.hookTimeout !== undefined) {
        expect(hook.hookTimeout).toBeLessThan(main.hookTimeout);
      }
      if (hook?.teardownTimeout !== undefined && main?.teardownTimeout !== undefined) {
        expect(hook.teardownTimeout).toBeLessThan(main.teardownTimeout);
      }

      // Hook config should have minimal setup vs main config (structural difference)
      expect(Array.isArray(hook?.setupFiles)).toBe(true);
      expect(Array.isArray(main?.setupFiles)).toBe(true);
      const mainSetupLength = main?.setupFiles?.length ?? 0;
      const hookSetupLength = hook?.setupFiles?.length ?? 0;
      expect(hookSetupLength).toBeLessThan(mainSetupLength);
    });
  });
});