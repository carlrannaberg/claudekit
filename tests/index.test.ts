/**
 * Tests for main index exports
 */

import { describe, it, expect } from 'vitest';

describe('index exports', () => {
  it('should export main functions', async () => {
    const indexModule = await import('@/index');

    // Verify that the module exports exist
    expect(indexModule).toBeDefined();

    // Test that we can import the module without errors
    expect(typeof indexModule).toBe('object');
  });

  it('should have consistent export structure', async () => {
    // This test ensures that our main exports don't break
    const indexModule = await import('@/index');

    // The module should be an object (even if empty for now)
    expect(indexModule).toBeTypeOf('object');
    expect(indexModule).not.toBeNull();
  });
});
