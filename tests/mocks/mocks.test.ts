/**
 * Tests for mock implementations
 * Ensures that our mocks behave correctly and provide the expected interfaces
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mockFs, mockFsExtra, mockState } from './fs-extra.js';
import { mockInquirer, mockState as inquirerMockState } from './inquirer-prompts.js';

describe('Mock implementations', () => {
  describe('fs-extra mock', () => {
    beforeEach(() => {
      mockFsExtra.reset();
    });

    afterEach(() => {
      mockFsExtra.reset();
    });

    it('should provide working file operations', async () => {
      // Test file creation and reading
      await mockFs.writeFile('/test/file.txt', 'test content');
      const content = await mockFs.readFile('/test/file.txt', 'utf-8');
      expect(content).toBe('test content');
    });

    it('should handle file not found errors', async () => {
      await expect(mockFs.readFile('/nonexistent.txt', 'utf-8')).rejects.toThrow('ENOENT');
    });

    it('should track directory creation', async () => {
      await mockFs.mkdir('/test/dir', { recursive: true });
      expect(mockFsExtra.hasDirectory('/test/dir')).toBe(true);
      
      // Should be able to create files in the directory
      await mockFs.writeFile('/test/dir/file.txt', 'content');
      const content = await mockFs.readFile('/test/dir/file.txt', 'utf-8');
      expect(content).toBe('content');
    });

    it('should handle directory operations', async () => {
      await mockFs.mkdir('/test/dir', { recursive: true });
      await mockFs.writeFile('/test/dir/file1.txt', 'content1');
      await mockFs.writeFile('/test/dir/file2.txt', 'content2');
      
      const files = await mockFs.readdir('/test/dir');
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toHaveLength(2);
    });

    it('should support JSON operations', async () => {
      const testObj = { test: true, number: 42, array: [1, 2, 3] };
      
      await mockFs.writeJson('/test/config.json', testObj);
      const loaded = await mockFs.readJson('/test/config.json');
      
      expect(loaded).toEqual(testObj);
    });

    it('should handle access checks', async () => {
      // File doesn't exist
      await expect(mockFs.access('/nonexistent.txt')).rejects.toThrow('ENOENT');
      
      // File exists
      await mockFs.writeFile('/existing.txt', 'content');
      await expect(mockFs.access('/existing.txt')).resolves.not.toThrow();
    });

    it('should support structure creation helper', () => {
      mockFsExtra.createStructure({
        'src': {
          'index.ts': 'export * from "./lib";',
          'lib': {
            'utils.ts': 'export const util = () => {};'
          }
        },
        'package.json': '{"name": "test"}'
      });

      expect(mockFsExtra.getFile('src/index.ts')).toBe('export * from "./lib";');
      expect(mockFsExtra.getFile('src/lib/utils.ts')).toBe('export const util = () => {};');
      expect(mockFsExtra.getFile('package.json')).toBe('{"name": "test"}');
      expect(mockFsExtra.hasDirectory('src')).toBe(true);
      expect(mockFsExtra.hasDirectory('src/lib')).toBe(true);
    });

    it('should support error simulation', async () => {
      const customError = new Error('Custom test error');
      mockFsExtra.setError('/error-file.txt', customError);

      await expect(mockFs.readFile('/error-file.txt', 'utf-8')).rejects.toThrow('Custom test error');
      await expect(mockFs.writeFile('/error-file.txt', 'content')).rejects.toThrow('Custom test error');
    });

    it('should support stat operations', async () => {
      await mockFs.writeFile('/file.txt', 'content');
      await mockFs.mkdir('/dir', { recursive: true });

      const fileStat = await mockFs.stat('/file.txt');
      expect(fileStat.isFile()).toBe(true);
      expect(fileStat.isDirectory()).toBe(false);

      const dirStat = await mockFs.stat('/dir');
      expect(dirStat.isFile()).toBe(false);
      expect(dirStat.isDirectory()).toBe(true);
    });

    it('should handle file removal', async () => {
      await mockFs.writeFile('/temp.txt', 'content');
      await mockFs.unlink('/temp.txt');
      
      await expect(mockFs.readFile('/temp.txt', 'utf-8')).rejects.toThrow('ENOENT');
    });

    it('should handle directory removal', async () => {
      await mockFs.mkdir('/temp/nested', { recursive: true });
      await mockFs.writeFile('/temp/nested/file.txt', 'content');
      
      await mockFs.rmdir('/temp', { recursive: true });
      
      expect(mockFsExtra.hasDirectory('/temp')).toBe(false);
      expect(mockFsExtra.hasDirectory('/temp/nested')).toBe(false);
      expect(mockFsExtra.getFile('/temp/nested/file.txt')).toBeUndefined();
    });
  });

  describe('inquirer prompts mock', () => {
    beforeEach(() => {
      mockInquirer.reset();
    });

    afterEach(() => {
      mockInquirer.reset();
    });

    it('should track prompt history', async () => {
      const { input, confirm } = await import('./inquirer-prompts.js');
      
      await input({ message: 'Enter name', name: 'username' });
      await confirm({ message: 'Are you sure?', name: 'confirmed' });
      
      const history = mockInquirer.getPromptHistory();
      expect(history).toHaveLength(2);
      expect(history[0].type).toBe('input');
      expect(history[0].message).toBe('username');
      expect(history[1].type).toBe('confirm');
      expect(history[1].message).toBe('confirmed');
    });

    it('should return configured responses', async () => {
      const { input, select } = await import('./inquirer-prompts.js');
      
      mockInquirer.setResponse('username', 'john-doe');
      mockInquirer.setResponse('language', 'typescript');
      
      const name = await input({ message: 'Enter name', name: 'username' });
      const lang = await select({ 
        message: 'Choose language', 
        name: 'language',
        choices: ['javascript', 'typescript']
      });
      
      expect(name).toBe('john-doe');
      expect(lang).toBe('typescript');
    });

    it('should provide default responses when not configured', async () => {
      const { input, confirm, number } = await import('./inquirer-prompts.js');
      
      const name = await input({ message: 'Enter name' });
      const confirmed = await confirm({ message: 'Confirm?' });
      const count = await number({ message: 'Enter count' });
      
      expect(name).toBe('mock-input');
      expect(confirmed).toBe(true);
      expect(count).toBe(42);
    });

    it('should handle error simulation', async () => {
      const { input } = await import('./inquirer-prompts.js');
      
      const customError = new Error('User interrupted');
      mockInquirer.setShouldThrow(true, customError);
      
      await expect(input({ message: 'Enter name' })).rejects.toThrow('User interrupted');
    });

    it('should support multiple response setup', async () => {
      const { input, confirm, select } = await import('./inquirer-prompts.js');
      
      mockInquirer.setResponses({
        'name': 'test-user',
        'confirmed': false,
        'choice': 'option-b'
      });
      
      const name = await input({ name: 'name', message: 'Enter name' });
      const confirmed = await confirm({ name: 'confirmed', message: 'Confirm?' });
      const choice = await select({ 
        name: 'choice', 
        message: 'Choose',
        choices: ['option-a', 'option-b', 'option-c']
      });
      
      expect(name).toBe('test-user');
      expect(confirmed).toBe(false);
      expect(choice).toBe('option-b');
    });

    it('should handle checkbox selections', async () => {
      const { checkbox } = await import('./inquirer-prompts.js');
      
      mockInquirer.setResponse('features', ['typescript', 'eslint']);
      
      const selected = await checkbox({
        name: 'features',
        message: 'Select features',
        choices: ['typescript', 'eslint', 'prettier', 'jest']
      });
      
      expect(selected).toEqual(['typescript', 'eslint']);
    });

    it('should provide fallback for choices', async () => {
      const { select, checkbox } = await import('./inquirer-prompts.js');
      
      // Without configured response, should pick first choice
      const single = await select({
        message: 'Choose one',
        choices: [
          { value: 'first', name: 'First Option' },
          { value: 'second', name: 'Second Option' }
        ]
      });
      
      const multiple = await checkbox({
        message: 'Choose multiple',
        choices: ['a', 'b', 'c']
      });
      
      expect(single).toBe('first');
      expect(multiple).toEqual(['a']);
    });

    it('should clear history independently of responses', async () => {
      const { input } = await import('./inquirer-prompts.js');
      
      mockInquirer.setResponse('test', 'value');
      await input({ name: 'test', message: 'Test' });
      
      expect(mockInquirer.getPromptHistory()).toHaveLength(1);
      
      mockInquirer.clearHistory();
      
      expect(mockInquirer.getPromptHistory()).toHaveLength(0);
      
      // Response should still be available
      const result = await input({ name: 'test', message: 'Test again' });
      expect(result).toBe('value');
    });
  });
});