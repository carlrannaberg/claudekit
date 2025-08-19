/**
 * Tests for Vitest configuration validation
 * Ensures both main and hook configs are properly structured
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

    it('should have performance optimizations enabled', async () => {
      const config = await import('../../vitest.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      // Verify key performance settings
      expect(testConfig?.pool).toBe('forks');
      expect(testConfig?.poolOptions?.forks?.isolate).toBe(false);
      expect(testConfig?.deps?.optimizer?.web?.enabled).toBe(true);
      expect(testConfig?.server?.deps?.inline).toBe(true);
    });

    it('should have appropriate timeouts configured', async () => {
      const config = await import('../../vitest.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      expect(testConfig?.testTimeout).toBe(5000);
      expect(testConfig?.hookTimeout).toBe(2000);
      expect(testConfig?.teardownTimeout).toBe(500);
    });
  });

  describe('Hook Configuration', () => {
    it('should load hook vitest config without errors', async () => {
      const config = await import('../../vitest.hook.config');
      expect(config.default).toBeDefined();
      expect(config.default.test).toBeDefined();
    });

    it('should be optimized for maximum speed', async () => {
      const config = await import('../../vitest.hook.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      // Verify ultra-fast settings
      expect(testConfig?.pool).toBe('threads');
      expect(testConfig?.poolOptions?.threads?.singleThread).toBe(true);
      expect(testConfig?.poolOptions?.threads?.isolate).toBe(false);
      expect(testConfig?.silent).toBe(true);
      expect(testConfig?.setupFiles).toEqual([]);
    });

    it('should have aggressive timeouts for speed', async () => {
      const config = await import('../../vitest.hook.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      expect(testConfig?.testTimeout).toBe(2000);
      expect(testConfig?.hookTimeout).toBe(1000);
      expect(testConfig?.teardownTimeout).toBe(100);
    });

    it('should limit test discovery to essential files', async () => {
      const config = await import('../../vitest.hook.config');
      const testConfig = config.default.test;
      
      expect(testConfig).toBeDefined();
      
      expect(testConfig?.include).toContain('tests/unit/typecheck-project.test.ts');
      expect(testConfig?.include).toContain('tests/unit/lint-project.test.ts');
      expect(testConfig?.exclude).toContain('tests/integration/**');
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

      // Main config uses forks for compatibility, hook uses threads for speed
      expect(main?.pool).toBe('forks');
      expect(hook?.pool).toBe('threads');

      // Hook config is more aggressive with timeouts
      if (hook?.testTimeout !== undefined && main?.testTimeout !== undefined) {
        expect(hook.testTimeout).toBeLessThan(main.testTimeout);
      }
      if (hook?.hookTimeout !== undefined && main?.hookTimeout !== undefined) {
        expect(hook.hookTimeout).toBeLessThan(main.hookTimeout);
      }
      if (hook?.teardownTimeout !== undefined && main?.teardownTimeout !== undefined) {
        expect(hook.teardownTimeout).toBeLessThan(main.teardownTimeout);
      }

      // Hook config has minimal setup, main has standard setup
      expect(hook?.setupFiles).toEqual([]);
      expect(main?.setupFiles).toContain('./tests/setup.ts');
    });
  });
});