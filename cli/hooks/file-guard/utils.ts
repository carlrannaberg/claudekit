/**
 * Shared utilities for file-guard service classes
 * Provides common fallback implementations when optional dependencies aren't available
 */

import * as path from 'node:path';

/**
 * Fallback implementation of glob-to-regexp when picomatch isn't available
 * Converts basic glob patterns to RegExp objects
 */
export const globToRegExp = (glob: string, options?: Record<string, unknown>): RegExp => {
  const flags = (options?.['flags'] as string) || '';
  
  // Escape special regex characters except * which we want to convert to .*
  const escaped = glob
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // Escape special chars
    .replace(/\\\*/g, '.*');                  // Convert \* back to .*
  
  return new RegExp(escaped, flags);
};

/**
 * Fallback implementation of untildify when the package isn't available
 * Expands ~ to home directory path
 */
export const untildify = (str: string): string => {
  if (str.startsWith('~')) {
    const home = process.env['HOME'];
    if (home !== null && home !== undefined && home !== '') {
      return path.join(home, str.slice(1));
    }
  }
  return str;
};