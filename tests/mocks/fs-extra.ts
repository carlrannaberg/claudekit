/**
 * Mock implementation for fs-extra
 * Provides comprehensive mocking for file system operations used in tests
 */

// vi import removed - not needed in this file
// Removed unused fs import

type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

// Track mock state for testing
interface MockState {
  files: Map<string, string>;
  directories: Set<string>;
  permissions: Map<string, number>;
  errors: Map<string, Error>;
}

const mockState: MockState = {
  files: new Map(),
  directories: new Set(),
  permissions: new Map(),
  errors: new Map(),
};

// Helper functions for test setup
export const mockFsExtra = {
  // State management
  reset(): void {
    mockState.files.clear();
    mockState.directories.clear();
    mockState.permissions.clear();
    mockState.errors.clear();
  },

  // File operations
  setFile(path: string, content: string): void {
    mockState.files.set(path, content);
    // Ensure parent directories exist
    const dirPath = path.substring(0, path.lastIndexOf('/'));
    if (dirPath !== '' && dirPath !== undefined) {
      mockState.directories.add(dirPath);
    }
  },

  getFile(path: string): string | undefined {
    return mockState.files.get(path);
  },

  setDirectory(path: string): void {
    mockState.directories.add(path);
  },

  hasDirectory(path: string): boolean {
    return mockState.directories.has(path);
  },

  setError(path: string, error: Error): void {
    mockState.errors.set(path, error);
  },

  removeError(path: string): void {
    mockState.errors.delete(path);
  },

  // Simulate file system structure
  createStructure(structure: Record<string, string | Record<string, unknown>>, basePath = ''): void {
    for (const [name, content] of Object.entries(structure)) {
      const fullPath = basePath ? `${basePath}/${name}` : name;

      if (typeof content === 'string') {
        this.setFile(fullPath, content);
      } else if (typeof content === 'object' && content !== null) {
        this.setDirectory(fullPath);
        this.createStructure(content as Record<string, string | Record<string, unknown>>, fullPath);
      }
    }
  },
};

interface MockStats {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
  size: number;
  mtime: Date;
  ctime: Date;
  atime: Date;
}

interface MockFsExtra {
  readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
  appendFile(path: string, data: string | Buffer): Promise<void>;
  unlink(path: string): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean; mode?: number }): Promise<string | undefined>;
  rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  readdir(path: string): Promise<string[]>;
  access(path: string, mode?: number): Promise<void>;
  stat(path: string): Promise<MockStats>;
  exists(path: string): Promise<boolean>;
  copy(src: string, dest: string): Promise<void>;
  move(src: string, dest: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  ensureFile(path: string): Promise<void>;
  remove(path: string): Promise<void>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  readJson(path: string): Promise<unknown>;
  writeJson(path: string, obj: unknown, options?: { spaces?: number }): Promise<void>;
}

// Mock implementation
const createMockFsExtra = (): MockFsExtra => {
  const checkError = (path: string): void => {
    const error = mockState.errors.get(path);
    if (error) {
      throw error;
    }
  };

  return {
    // File operations
    async readFile(path: string, encoding?: BufferEncoding): Promise<string | Buffer> {
      checkError(path);
      const content = mockState.files.get(path);
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${path}'`);
        (error as Error & { code: string }).code = 'ENOENT';
        throw error;
      }
      return encoding ? content : Buffer.from(content);
    },

    async writeFile(path: string, data: string | Buffer): Promise<void> {
      checkError(path);
      const content = typeof data === 'string' ? data : data.toString();
      mockState.files.set(path, content);

      // Ensure parent directory exists
      const dirPath = path.substring(0, path.lastIndexOf('/'));
      if (dirPath !== '' && dirPath !== undefined) {
        mockState.directories.add(dirPath);
      }
    },

    async appendFile(path: string, data: string | Buffer): Promise<void> {
      checkError(path);
      const existing = mockState.files.get(path) ?? '';
      const newContent = typeof data === 'string' ? data : data.toString();
      mockState.files.set(path, existing + newContent);
    },

    async unlink(path: string): Promise<void> {
      checkError(path);
      if (!mockState.files.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, unlink '${path}'`);
        (error as Error & { code: string }).code = 'ENOENT';
        throw error;
      }
      mockState.files.delete(path);
    },

    // Directory operations
    async mkdir(
      path: string,
      options?: { recursive?: boolean; mode?: number }
    ): Promise<string | undefined> {
      checkError(path);
      if (options?.recursive === true) {
        // Create all parent directories
        const parts = path.split('/').filter(Boolean);
        let currentPath = '';
        for (const part of parts) {
          currentPath += `/${part}`;
          mockState.directories.add(currentPath);
        }
      } else {
        // Check if parent exists
        const parentPath = path.substring(0, path.lastIndexOf('/'));
        if (parentPath !== '' && parentPath !== undefined && !mockState.directories.has(parentPath)) {
          const error = new Error(`ENOENT: no such file or directory, mkdir '${path}'`);
          (error as Error & { code: string }).code = 'ENOENT';
          throw error;
        }
        mockState.directories.add(path);
      }
      return path;
    },

    async rmdir(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
      checkError(path);
      if (options?.recursive === true || options?.force === true) {
        // Remove directory and all contents
        mockState.directories.delete(path);
        for (const filePath of mockState.files.keys()) {
          if (filePath.startsWith(`${path}/`)) {
            mockState.files.delete(filePath);
          }
        }
        for (const dirPath of mockState.directories) {
          if (dirPath.startsWith(`${path}/`)) {
            mockState.directories.delete(dirPath);
          }
        }
      } else {
        if (!mockState.directories.has(path)) {
          const error = new Error(`ENOENT: no such file or directory, rmdir '${path}'`);
          (error as Error & { code: string }).code = 'ENOENT';
          throw error;
        }
        mockState.directories.delete(path);
      }
    },

    async readdir(path: string): Promise<string[]> {
      checkError(path);
      if (!mockState.directories.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, scandir '${path}'`);
        (error as Error & { code: string }).code = 'ENOENT';
        throw error;
      }

      const items = new Set<string>();

      // Add files in this directory
      for (const filePath of mockState.files.keys()) {
        if (filePath.startsWith(`${path}/`)) {
          const relativePath = filePath.substring(path.length + 1);
          const firstPart = relativePath.split('/')[0];
          if (firstPart !== undefined && firstPart !== '') {
            items.add(firstPart);
          }
        }
      }

      // Add subdirectories
      for (const dirPath of mockState.directories) {
        if (dirPath.startsWith(`${path}/`)) {
          const relativePath = dirPath.substring(path.length + 1);
          const firstPart = relativePath.split('/')[0];
          if (firstPart !== undefined && firstPart !== '') {
            items.add(firstPart);
          }
        }
      }

      return Array.from(items).sort();
    },

    // File/directory checks
    async access(path: string, _mode?: number): Promise<void> {
      checkError(path);
      const exists = mockState.files.has(path) || mockState.directories.has(path);
      if (!exists) {
        const error = new Error(`ENOENT: no such file or directory, access '${path}'`);
        (error as Error & { code: string }).code = 'ENOENT';
        throw error;
      }
    },

    async stat(path: string): Promise<MockStats> {
      checkError(path);
      const isFile = mockState.files.has(path);
      const isDir = mockState.directories.has(path);

      if (!isFile && !isDir) {
        const error = new Error(`ENOENT: no such file or directory, stat '${path}'`);
        (error as Error & { code: string }).code = 'ENOENT';
        throw error;
      }

      return {
        isFile: () => isFile,
        isDirectory: () => isDir,
        isSymbolicLink: () => false,
        size: isFile ? (mockState.files.get(path)?.length ?? 0) : 0,
        mtime: new Date(),
        ctime: new Date(),
        atime: new Date(),
      };
    },

    async exists(path: string): Promise<boolean> {
      return mockState.files.has(path) || mockState.directories.has(path);
    },

    // Advanced operations
    async copy(src: string, dest: string): Promise<void> {
      checkError(src);
      checkError(dest);

      const content = mockState.files.get(src);
      if (content === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${src}'`);
        (error as Error & { code: string }).code = 'ENOENT';
        throw error;
      }

      mockState.files.set(dest, content);
    },

    async move(src: string, dest: string): Promise<void> {
      await this.copy(src, dest);
      await this.unlink(src);
    },

    async ensureDir(path: string): Promise<void> {
      await this.mkdir(path, { recursive: true });
    },

    async ensureFile(path: string): Promise<void> {
      if (!mockState.files.has(path)) {
        await this.writeFile(path, '');
      }
    },

    async remove(path: string): Promise<void> {
      // Remove files or directories
      if (mockState.files.has(path)) {
        mockState.files.delete(path);
      } else if (mockState.directories.has(path)) {
        await this.rmdir(path, { recursive: true });
      }
    },

    // Alias for compatibility
    rm: async (path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> => {
      if (mockState.files.has(path)) {
        mockState.files.delete(path);
      } else {
        if (mockState.directories.has(path)) {
          await mockFs.rmdir(path, options);
        }
      }
    },

    // JSON operations
    async readJson(path: string): Promise<unknown> {
      const content = (await this.readFile(path, 'utf-8')) as string;
      try {
        return JSON.parse(content);
      } catch (error) {
        const parseError = new Error(`Invalid JSON in ${path}`);
        (parseError as Error & { cause: unknown }).cause = error;
        throw parseError;
      }
    },

    async writeJson(path: string, obj: unknown, options?: { spaces?: number }): Promise<void> {
      const content = JSON.stringify(obj, null, options?.spaces ?? 2);
      await this.writeFile(path, content);
    },
  };
};

// Export the mock and state management
export const mockFs = createMockFsExtra();
export { mockState };

// Default mock for vitest
export default mockFs;
