import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs, constants } from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';

// Mock modules before importing the module under test
vi.mock('fs', async () => {
  return {
    promises: {
      stat: vi.fn(),
      mkdir: vi.fn(),
      access: vi.fn(),
      chmod: vi.fn(),
      readFile: vi.fn(),
      copyFile: vi.fn(),
      unlink: vi.fn(),
    },
    constants: {
      F_OK: 0,
      R_OK: 4,
      W_OK: 2,
      X_OK: 1,
    },
  };
});

vi.mock('os', async () => {
  return {
    default: {
      homedir: vi.fn(() => '/Users/testuser'),
    },
    homedir: vi.fn(() => '/Users/testuser'),
  };
});

vi.mock('crypto', async () => {
  return {
    default: {
      createHash: vi.fn(() => ({
        update: vi.fn(),
        digest: vi.fn(() => 'mocked-hash'),
      })),
    },
    createHash: vi.fn(() => ({
      update: vi.fn(),
      digest: vi.fn(() => 'mocked-hash'),
    })),
  };
});

// Import after mocking
import {
  validateProjectPath,
  ensureDirectoryExists,
  setExecutablePermission,
  checkWritePermission,
  getFileHash,
  needsUpdate,
  copyFileWithBackup,
  pathExists,
  getFileStats,
  safeRemove,
  expandHomePath,
  normalizePath,
} from '../../cli/lib/filesystem.js';

const mockFs = fs as any;
const mockOs = os as any;
const mockCrypto = crypto as any;

describe('filesystem module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateProjectPath', () => {
    it('should return false for invalid inputs', () => {
      expect(validateProjectPath('')).toBe(false);
      expect(validateProjectPath(null as any)).toBe(false);
      expect(validateProjectPath(undefined as any)).toBe(false);
      expect(validateProjectPath(123 as any)).toBe(false);
    });

    it('should return false for system directories', () => {
      expect(validateProjectPath('/')).toBe(false);
      expect(validateProjectPath('/usr')).toBe(false);
      expect(validateProjectPath('/bin')).toBe(false);
      expect(validateProjectPath('/etc')).toBe(false);
    });

    it('should return false for critical user directories', () => {
      expect(validateProjectPath('/Users/testuser')).toBe(false);
      expect(validateProjectPath('/Users/testuser/Library')).toBe(false);
      expect(validateProjectPath('/Users/testuser/.ssh')).toBe(false);
      expect(validateProjectPath('/Users/testuser/.gnupg')).toBe(false);
    });

    it('should return false for paths with directory traversal', () => {
      expect(validateProjectPath('/some/path/../../../etc')).toBe(false);
      expect(validateProjectPath('../../etc/passwd')).toBe(false);
    });

    it('should return false for paths with control characters', () => {
      expect(validateProjectPath('/path/with\x00null')).toBe(false);
      expect(validateProjectPath('/path/with\x1fcontrol')).toBe(false);
    });

    it('should return false for excessively long paths', () => {
      const longPath = '/very/' + 'long/'.repeat(200) + 'path';
      expect(validateProjectPath(longPath)).toBe(false);
    });

    it('should return true for valid project paths', () => {
      expect(validateProjectPath('/Users/testuser/projects/myapp')).toBe(true);
      expect(validateProjectPath('/Users/testuser/Development/claudekit')).toBe(true);
      expect(validateProjectPath('/opt/projects/website')).toBe(true);
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should throw error for invalid paths', async () => {
      await expect(ensureDirectoryExists('')).rejects.toThrow('Invalid directory path');
      await expect(ensureDirectoryExists('/usr')).rejects.toThrow('Invalid directory path');
    });

    it('should return early if directory already exists', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      
      await ensureDirectoryExists('/Users/testuser/projects/test');
      
      expect(mockFs.stat).toHaveBeenCalledWith('/Users/testuser/projects/test');
      expect(mockFs.mkdir).not.toHaveBeenCalled();
    });

    it('should throw error if path exists but is not directory', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => false });
      
      await expect(ensureDirectoryExists('/Users/testuser/projects/file.txt'))
        .rejects.toThrow('Path exists but is not a directory');
    });

    it('should create directory if it does not exist', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.mkdir.mockResolvedValue(undefined);
      
      await ensureDirectoryExists('/Users/testuser/projects/newdir');
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('/Users/testuser/projects/newdir', {
        recursive: true,
        mode: 0o755,
      });
    });

    it('should throw error if directory creation fails', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      
      await expect(ensureDirectoryExists('/Users/testuser/projects/newdir'))
        .rejects.toThrow('Failed to create directory');
    });
  });

  describe('setExecutablePermission', () => {
    it('should throw error for invalid paths', async () => {
      await expect(setExecutablePermission('/usr')).rejects.toThrow('Invalid file path');
    });

    it('should throw error if file does not exist', async () => {
      mockFs.access.mockRejectedValue({ code: 'ENOENT' });
      
      await expect(setExecutablePermission('/Users/testuser/projects/nonexistent'))
        .rejects.toThrow('File not found');
    });

    it('should set executable permissions on existing file', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);
      
      await setExecutablePermission('/Users/testuser/projects/script.sh');
      
      expect(mockFs.access).toHaveBeenCalledWith('/Users/testuser/projects/script.sh', constants.F_OK);
      expect(mockFs.chmod).toHaveBeenCalledWith('/Users/testuser/projects/script.sh', 0o755);
    });

    it('should throw error if chmod fails', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.chmod.mockRejectedValue(new Error('Permission denied'));
      
      await expect(setExecutablePermission('/Users/testuser/projects/script.sh'))
        .rejects.toThrow('Failed to set executable permission');
    });
  });

  describe('checkWritePermission', () => {
    it('should return true for writable directory', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await checkWritePermission('/Users/testuser/projects');
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/Users/testuser/projects', constants.W_OK);
    });

    it('should return true for writable file', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => false });
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await checkWritePermission('/Users/testuser/projects/file.txt');
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/Users/testuser/projects/file.txt', constants.W_OK);
    });

    it('should check parent directory if file does not exist', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await checkWritePermission('/Users/testuser/projects/newfile.txt');
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/Users/testuser/projects', constants.W_OK);
    });

    it('should return false if no write permission', async () => {
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.access.mockRejectedValue(new Error('Permission denied'));
      
      const result = await checkWritePermission('/Users/testuser/readonly');
      
      expect(result).toBe(false);
    });
  });

  describe('getFileHash', () => {
    it('should return SHA-256 hash of file content', async () => {
      const mockHash = {
        update: vi.fn(),
        digest: vi.fn(() => 'abc123hash'),
      };
      mockCrypto.createHash.mockReturnValue(mockHash);
      mockFs.readFile.mockResolvedValue(Buffer.from('test content'));
      
      const result = await getFileHash('/Users/testuser/projects/file.txt');
      
      expect(result).toBe('abc123hash');
      expect(mockCrypto.createHash).toHaveBeenCalledWith('sha256');
      expect(mockHash.update).toHaveBeenCalledWith(Buffer.from('test content'));
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
    });

    it('should throw error if file cannot be read', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));
      
      await expect(getFileHash('/Users/testuser/projects/missing.txt'))
        .rejects.toThrow('Failed to hash file');
    });
  });

  describe('needsUpdate', () => {
    it('should return true if target does not exist', async () => {
      mockFs.access.mockRejectedValue({ code: 'ENOENT' });
      
      const result = await needsUpdate('/source.txt', '/target.txt');
      
      expect(result).toBe(true);
    });

    it('should return true if hashes differ', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      // Mock different hashes for source and target
      const mockHash1 = { update: vi.fn(), digest: vi.fn(() => 'hash1') };
      const mockHash2 = { update: vi.fn(), digest: vi.fn(() => 'hash2') };
      mockCrypto.createHash.mockReturnValueOnce(mockHash1).mockReturnValueOnce(mockHash2);
      mockFs.readFile.mockResolvedValue(Buffer.from('content'));
      
      const result = await needsUpdate('/source.txt', '/target.txt');
      
      expect(result).toBe(true);
    });

    it('should return false if hashes are identical', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      // Mock identical hashes
      const mockHash = { update: vi.fn(), digest: vi.fn(() => 'samehash') };
      mockCrypto.createHash.mockReturnValue(mockHash);
      mockFs.readFile.mockResolvedValue(Buffer.from('content'));
      
      const result = await needsUpdate('/source.txt', '/target.txt');
      
      expect(result).toBe(false);
    });

    it('should return true if hash comparison fails', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockRejectedValue(new Error('Read error'));
      
      const result = await needsUpdate('/source.txt', '/target.txt');
      
      expect(result).toBe(true);
    });
  });

  describe('copyFileWithBackup', () => {
    beforeEach(() => {
      // Mock successful path validation by setting up valid paths
      vi.spyOn(path, 'resolve').mockImplementation((p) => `/resolved${p}`);
      vi.spyOn(path, 'normalize').mockImplementation((p) => p);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should throw error for invalid paths', async () => {
      // Restore actual path functions temporarily for this test
      vi.restoreAllMocks();
      
      await expect(copyFileWithBackup('/usr', '/target')).rejects.toThrow('Invalid source or target path');
      
      // Re-setup mocks for other tests
      vi.spyOn(path, 'resolve').mockImplementation((p) => `/resolved${p}`);
      vi.spyOn(path, 'normalize').mockImplementation((p) => p);
    });

    it('should copy file without backup when target does not exist', async () => {
      // Setup mocks for valid operation
      mockFs.access
        .mockResolvedValueOnce(undefined) // source readable
        .mockResolvedValueOnce(undefined) // write permission check
        .mockRejectedValueOnce({ code: 'ENOENT' }); // target doesn't exist
      
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' }); // dir doesn't exist
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      
      await copyFileWithBackup('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt', true);
      
      expect(mockFs.copyFile).toHaveBeenCalledWith('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt');
    });

    it('should create backup when target exists and backup is requested', async () => {
      // Setup mocks for backup scenario
      mockFs.access
        .mockResolvedValueOnce(undefined) // source readable
        .mockResolvedValueOnce(undefined) // target writable
        .mockResolvedValueOnce(undefined); // target exists for backup
      
      mockFs.stat.mockResolvedValue({ isDirectory: () => true }); // dir exists
      mockFs.copyFile.mockResolvedValue(undefined);
      
      // Mock Date to control timestamp
      const mockDate = new Date('2024-01-01T12:00:00.000Z');
      vi.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      await copyFileWithBackup('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt', true);
      
      expect(mockFs.copyFile).toHaveBeenCalledTimes(2);
      expect(mockFs.copyFile).toHaveBeenNthCalledWith(1, '/Users/testuser/projects/target.txt', '/Users/testuser/projects/target.txt.backup-2024-01-01T12-00-00-000Z');
      expect(mockFs.copyFile).toHaveBeenNthCalledWith(2, '/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt');
    });

    it('should not create backup when backup is false', async () => {
      mockFs.access
        .mockResolvedValueOnce(undefined) // source readable
        .mockResolvedValueOnce(undefined); // target writable
      
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.copyFile.mockResolvedValue(undefined);
      
      await copyFileWithBackup('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt', false);
      
      expect(mockFs.copyFile).toHaveBeenCalledTimes(1);
      expect(mockFs.copyFile).toHaveBeenCalledWith('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt');
    });

    it('should throw error if write permission check fails', async () => {
      // Mock write permission check (fails)
      mockFs.access.mockRejectedValue(new Error('Permission denied'));
      
      await expect(copyFileWithBackup('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt'))
        .rejects.toThrow('No write permission for target');
    });

    it('should throw error if source is not accessible', async () => {
      // Need to mock both checkWritePermission (which calls fs.stat and fs.access)
      // and the direct fs.access call for source file verification
      
      // First, mock fs.stat for checkWritePermission to return a file
      mockFs.stat.mockResolvedValueOnce({ isDirectory: () => false });
      // Then mock the first fs.access call (for write permission) to succeed
      // Then mock the second fs.access call (for source file) to fail
      mockFs.access
        .mockResolvedValueOnce(undefined) // write permission check passes
        .mockRejectedValueOnce(new Error('Permission denied')); // source access fails
      
      await expect(copyFileWithBackup('/Users/testuser/projects/source.txt', '/Users/testuser/projects/target.txt'))
        .rejects.toThrow('Source file not accessible');
    });

    it('should throw error if copy operation fails', async () => {
      mockFs.access
        .mockResolvedValueOnce(undefined) // source readable
        .mockResolvedValueOnce(undefined) // target writable
        .mockRejectedValueOnce({ code: 'ENOENT' }); // target doesn't exist
      
      mockFs.stat.mockResolvedValue({ isDirectory: () => true });
      mockFs.copyFile.mockRejectedValue(new Error('Disk full'));
      
      await expect(copyFileWithBackup('/valid/source.txt', '/valid/target.txt'))
        .rejects.toThrow('Failed to copy');
    });
  });

  describe('pathExists', () => {
    it('should return true if path exists', async () => {
      mockFs.access.mockResolvedValue(undefined);
      
      const result = await pathExists('/existing/path');
      
      expect(result).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/existing/path', constants.F_OK);
    });

    it('should return false if path does not exist', async () => {
      mockFs.access.mockRejectedValue({ code: 'ENOENT' });
      
      const result = await pathExists('/nonexistent/path');
      
      expect(result).toBe(false);
    });
  });

  describe('getFileStats', () => {
    it('should return file stats if file exists', async () => {
      const mockStats = { size: 1024, isFile: () => true };
      mockFs.stat.mockResolvedValue(mockStats);
      
      const result = await getFileStats('/existing/file.txt');
      
      expect(result).toBe(mockStats);
    });

    it('should return null if file does not exist', async () => {
      mockFs.stat.mockRejectedValue({ code: 'ENOENT' });
      
      const result = await getFileStats('/nonexistent/file.txt');
      
      expect(result).toBe(null);
    });

    it('should throw error for other stat failures', async () => {
      mockFs.stat.mockRejectedValue(new Error('Permission denied'));
      
      await expect(getFileStats('/restricted/file.txt')).rejects.toThrow('Permission denied');
    });
  });

  describe('safeRemove', () => {
    it('should return true if file was removed', async () => {
      mockFs.unlink.mockResolvedValue(undefined);
      
      const result = await safeRemove('/file/to/remove.txt');
      
      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith('/file/to/remove.txt');
    });

    it('should return false if file does not exist', async () => {
      mockFs.unlink.mockRejectedValue({ code: 'ENOENT' });
      
      const result = await safeRemove('/nonexistent/file.txt');
      
      expect(result).toBe(false);
    });

    it('should throw error for other unlink failures', async () => {
      mockFs.unlink.mockRejectedValue(new Error('Permission denied'));
      
      await expect(safeRemove('/restricted/file.txt')).rejects.toThrow('Permission denied');
    });
  });

  describe('expandHomePath', () => {
    it('should expand tilde to home directory', () => {
      expect(expandHomePath('~/projects')).toBe('/Users/testuser/projects');
      expect(expandHomePath('~')).toBe('/Users/testuser');
    });

    it('should not modify paths without tilde', () => {
      expect(expandHomePath('/absolute/path')).toBe('/absolute/path');
      expect(expandHomePath('relative/path')).toBe('relative/path');
      expect(expandHomePath('not~tilde')).toBe('not~tilde');
    });
  });

  describe('normalizePath', () => {
    beforeEach(() => {
      vi.spyOn(path, 'resolve').mockImplementation((p) => {
        // Simulate path.resolve behavior which normalizes paths
        if (p === '/Users/testuser/work') {
          return '/Users/testuser/work';
        }
        return `/resolved${p}`;
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should expand home directory and resolve path', () => {
      const result = normalizePath('~/work');
      
      expect(result).toBe('/Users/testuser/work');
    });

    it('should resolve relative paths', () => {
      const result = normalizePath('./relative/path');
      
      expect(result).toBe('/resolved./relative/path');
    });

    it('should handle absolute paths', () => {
      const result = normalizePath('/absolute/path');
      
      expect(result).toBe('/resolved/absolute/path');
    });
  });
});