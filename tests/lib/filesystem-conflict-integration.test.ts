import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { copyFileWithBackup, getFileHash } from '../../cli/lib/filesystem';

describe('File Conflict Detection - Integration Tests', () => {
  let tempDir: string;
  let sourceFile: string;
  let targetFile: string;

  beforeEach(async () => {
    // Create a temporary directory for testing
    tempDir = path.join(os.tmpdir(), `claudekit-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    sourceFile = path.join(tempDir, 'source.txt');
    targetFile = path.join(tempDir, 'target.txt');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('copyFileWithBackup - real file operations', () => {
    it('should skip copy when files are identical', async () => {
      const content = 'identical content for both files';
      
      // Create both files with identical content
      await fs.writeFile(sourceFile, content);
      await fs.writeFile(targetFile, content);
      
      const initialTargetHash = await getFileHash(targetFile);
      const onConflict = vi.fn();
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify onConflict was not called (files are identical)
      expect(onConflict).not.toHaveBeenCalled();
      
      // Verify target file wasn't modified
      const finalTargetHash = await getFileHash(targetFile);
      expect(finalTargetHash).toBe(initialTargetHash);
      
      // Verify no backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(0);
    });

    it('should call onConflict when files differ', async () => {
      // Create files with different content
      await fs.writeFile(sourceFile, 'source content');
      await fs.writeFile(targetFile, 'target content');
      
      const onConflict = vi.fn().mockResolvedValue(true);
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify onConflict was called
      expect(onConflict).toHaveBeenCalledWith(sourceFile, targetFile);
      
      // Verify file was copied (content should match source)
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent).toBe('source content');
      
      // Verify backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(1);
    });

    it('should not copy when user declines overwrite', async () => {
      // Create files with different content
      await fs.writeFile(sourceFile, 'source content');
      await fs.writeFile(targetFile, 'target content - should remain');
      
      const onConflict = vi.fn().mockResolvedValue(false);
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify onConflict was called
      expect(onConflict).toHaveBeenCalledWith(sourceFile, targetFile);
      
      // Verify file was NOT copied (content should remain as target)
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent).toBe('target content - should remain');
      
      // Verify no backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(0);
    });

    it('should create backup when overwriting different file', async () => {
      const targetContent = 'original target content';
      
      // Create files with different content
      await fs.writeFile(sourceFile, 'new content from source');
      await fs.writeFile(targetFile, targetContent);
      
      const onConflict = vi.fn().mockResolvedValue(true);
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(1);
      
      // Verify backup contains original content
      const backupPath = path.join(tempDir, backupFiles[0]);
      const backupContent = await fs.readFile(backupPath, 'utf-8');
      expect(backupContent).toBe(targetContent);
      
      // Verify target was overwritten
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent).toBe('new content from source');
    });

    it('should not create backup when backup=false', async () => {
      // Create files with different content
      await fs.writeFile(sourceFile, 'source content');
      await fs.writeFile(targetFile, 'target content');
      
      const onConflict = vi.fn().mockResolvedValue(true);
      
      await copyFileWithBackup(sourceFile, targetFile, false, onConflict);
      
      // Verify no backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(0);
      
      // Verify file was still copied
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent).toBe('source content');
    });

    it('should handle missing target file (no conflict)', async () => {
      // Create only source file
      await fs.writeFile(sourceFile, 'source content');
      
      const onConflict = vi.fn();
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify onConflict was NOT called (no existing file)
      expect(onConflict).not.toHaveBeenCalled();
      
      // Verify file was copied
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent).toBe('source content');
      
      // Verify no backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(0);
    });

    it('should handle force mode (no onConflict callback)', async () => {
      // Create files with different content
      await fs.writeFile(sourceFile, 'source content');
      await fs.writeFile(targetFile, 'target content');
      
      // Call without onConflict callback (force mode)
      await copyFileWithBackup(sourceFile, targetFile, true);
      
      // Verify file was copied
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent).toBe('source content');
      
      // Verify backup was created
      const backupFiles = (await fs.readdir(tempDir)).filter(f => f.includes('.backup-'));
      expect(backupFiles).toHaveLength(1);
    });
  });

  describe('conflict scenarios with different file types', () => {
    it('should handle binary files correctly', async () => {
      // Create binary content
      const binaryContent = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE]);
      const differentBinary = Buffer.from([0x10, 0x11, 0x12, 0x13, 0xEF, 0xEE]);
      
      await fs.writeFile(sourceFile, binaryContent);
      await fs.writeFile(targetFile, differentBinary);
      
      const onConflict = vi.fn().mockResolvedValue(true);
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify onConflict was called
      expect(onConflict).toHaveBeenCalled();
      
      // Verify binary content was copied correctly
      const finalContent = await fs.readFile(targetFile);
      expect(finalContent).toEqual(binaryContent);
    });

    it('should handle large files correctly', async () => {
      // Create a larger file (1MB)
      const largeContent = 'x'.repeat(1024 * 1024);
      const differentLarge = 'y'.repeat(1024 * 1024);
      
      await fs.writeFile(sourceFile, largeContent);
      await fs.writeFile(targetFile, differentLarge);
      
      const onConflict = vi.fn().mockResolvedValue(true);
      
      await copyFileWithBackup(sourceFile, targetFile, true, onConflict);
      
      // Verify onConflict was called
      expect(onConflict).toHaveBeenCalled();
      
      // Verify content was copied correctly
      const finalContent = await fs.readFile(targetFile, 'utf-8');
      expect(finalContent.length).toBe(largeContent.length);
      expect(finalContent[0]).toBe('x');
    });
  });
});