import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { list } from '../../cli/commands/list.js';
import * as paths from '../../cli/lib/paths.js';

interface AgentInfo {
  name: string;
  type: string;
  path: string;
  description: string;
  source: string;
  category: string;
  size: number;
  tokens: number;
  modified: Date;
}

interface CommandInfo {
  name: string;
  type: string;
  path: string;
  description: string;
  source: string;
  namespace: string;
  size: number;
  tokens: number;
  modified: Date;
}

interface ListResult {
  agents?: AgentInfo[];
  commands?: CommandInfo[];
}

describe('list command', () => {
  let tempDir: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let originalCwd: string;
  const createdDirs: string[] = [];

  // Clean up any stale test directories from previous runs
  beforeAll(async () => {
    const cwd = process.cwd();
    const entries = await fs.readdir(cwd);
    const staleTestDirs = entries.filter(entry => 
      entry.startsWith('test-temp-list-hooks-') || 
      entry.startsWith('test-temp-list-')
    );
    
    for (const dir of staleTestDirs) {
      try {
        await fs.remove(path.join(cwd, dir));
        console.log(`Cleaned up stale test directory: ${dir}`);
      } catch (error) {
        console.warn(`Failed to clean up stale directory ${dir}:`, error);
      }
    }
  });

  beforeEach(async () => {
    // Store original cwd
    originalCwd = process.cwd();

    // Create temp directory with unique name
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    tempDir = path.join(process.cwd(), `test-temp-list-${timestamp}-${random}`);
    createdDirs.push(tempDir);
    
    await fs.ensureDir(tempDir);
    await fs.ensureDir(path.join(tempDir, '.claude'));

    // Change to temp directory
    process.chdir(tempDir);

    // Mock the path functions to use our test directories
    vi.spyOn(paths, 'getProjectClaudeDirectory').mockReturnValue(path.join(tempDir, '.claude'));
    vi.spyOn(paths, 'getUserClaudeDirectory').mockReturnValue(path.join(tempDir, 'user-claude'));
    vi.spyOn(paths, 'findComponentsDirectory').mockResolvedValue(path.join(tempDir, 'src'));

    // Spy on console.log to capture output
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    // Always restore original cwd first
    try {
      process.chdir(originalCwd);
    } catch (error) {
      console.warn('Failed to restore working directory:', error);
    }

    // Clean up temp directory with retries
    if (tempDir) {
      let retries = 3;
      while (retries > 0) {
        try {
          await fs.remove(tempDir);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) {
            console.warn(`Failed to remove temp directory ${tempDir} after 3 attempts:`, error);
          } else {
            // Wait a bit before retrying
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }
    }

    // Restore console.log
    consoleLogSpy?.mockRestore();

    // Clear all mocks
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // Final cleanup to ensure all directories are removed
  afterAll(async () => {
    for (const dir of createdDirs) {
      try {
        if (await fs.pathExists(dir)) {
          await fs.remove(dir);
        }
      } catch (error) {
        console.warn(`Failed to clean up directory in afterAll: ${dir}`, error);
      }
    }
    createdDirs.length = 0;
  });

  describe('listAgents', () => {
    it('should display agent names from frontmatter, not filenames', async () => {
      // Purpose: Verify that the list command shows the actual agent name from frontmatter
      // metadata instead of just using the filename. This ensures users see meaningful
      // agent names like "typescript-expert" instead of just "expert".

      // Create agents directory structure
      const agentsDir = path.join(tempDir, '.claude', 'agents');
      await fs.ensureDir(path.join(agentsDir, 'typescript'));
      await fs.ensureDir(path.join(agentsDir, 'database'));

      // Create agent with frontmatter name different from filename
      await fs.writeFile(
        path.join(agentsDir, 'typescript', 'expert.md'),
        `---
name: typescript-expert
description: TypeScript and JavaScript expert
category: framework
---

# TypeScript Expert

Expert content here.`
      );

      // Create another agent
      await fs.writeFile(
        path.join(agentsDir, 'database', 'postgres.md'),
        `---
name: postgres-expert
description: PostgreSQL database expert
---

# Postgres Expert

Database expertise.`
      );

      // Create agent without name in frontmatter (should use filename)
      await fs.writeFile(
        path.join(agentsDir, 'oracle.md'),
        `---
description: General purpose oracle
---

# Oracle

Oracle content.`
      );

      // Run list command
      await list('agents', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      expect(jsonOutput).toBeDefined();

      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Verify agents array exists
      expect(result.agents).toBeDefined();
      expect(Array.isArray(result.agents)).toBe(true);

      // Find our test agents
      const agents = result.agents ?? [];
      const tsExpert = agents.find((a: AgentInfo) => a.name === 'typescript-expert');
      const pgExpert = agents.find((a: AgentInfo) => a.name === 'postgres-expert');
      const oracle = agents.find((a: AgentInfo) => a.name === 'oracle');

      // Verify names are from frontmatter and source is separate
      expect(tsExpert).toBeDefined();
      expect(tsExpert?.name).toBe('typescript-expert'); // Name from frontmatter
      expect(tsExpert?.source).toBe('project'); // Source in separate field
      expect(tsExpert?.category).toBe('framework'); // Category from frontmatter

      expect(pgExpert).toBeDefined();
      expect(pgExpert?.name).toBe('postgres-expert'); // Name from frontmatter
      expect(pgExpert?.source).toBe('project'); // Source in separate field
      expect(pgExpert?.category).toBe('database');

      // Verify fallback to filename when no name in frontmatter
      expect(oracle).toBeDefined();
      expect(oracle?.name).toBe('oracle'); // Filename since no name in frontmatter
      expect(oracle?.source).toBe('project'); // Source in separate field
      expect(oracle?.category).toBe('general');
    });

    it('should filter agents by the frontmatter name, not filename', async () => {
      // Purpose: Ensure that when filtering agents, we filter by the actual agent name
      // from frontmatter, not the filename. This is important for user experience.

      const agentsDir = path.join(tempDir, '.claude', 'agents');
      await fs.ensureDir(path.join(agentsDir, 'typescript'));

      // Create agent with specific frontmatter name
      await fs.writeFile(
        path.join(agentsDir, 'typescript', 'expert.md'),
        `---
name: typescript-expert
description: TypeScript expert
---

Content`
      );

      // Filter by frontmatter name (should find it)
      await list('agents', { format: 'json', filter: 'typescript-expert' });

      let calls = consoleLogSpy.mock.calls;
      let jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      let result = JSON.parse(jsonOutput as string) as ListResult;

      expect(result.agents).toBeDefined();
      expect(result.agents).toHaveLength(1);
      expect(result.agents?.[0]?.name).toBe('typescript-expert');
      expect(result.agents?.[0]?.source).toBe('project');

      // Clear spy
      consoleLogSpy.mockClear();

      // Filter by filename (should NOT find it since we use frontmatter name)
      await list('agents', { format: 'json', filter: '^expert$' });

      calls = consoleLogSpy.mock.calls;
      jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      result = JSON.parse(jsonOutput as string) as ListResult;

      expect(result.agents).toBeDefined();
      expect(result.agents).toHaveLength(0);
    });
  });

  describe('listCommands', () => {
    it('should extract description from frontmatter for commands', async () => {
      // Purpose: Verify that command descriptions are properly extracted from frontmatter
      // using the refactored extractFrontmatter helper function.

      const commandsDir = path.join(tempDir, '.claude', 'commands');
      await fs.ensureDir(path.join(commandsDir, 'git'));

      // Create command with frontmatter
      await fs.writeFile(
        path.join(commandsDir, 'git', 'status.md'),
        `---
description: Show git status with insights
allowed-tools: Bash
---

# Git Status Command

Show repository status.`
      );

      // Run list command
      await list('commands', { format: 'json' });

      // Get the JSON output
      const calls = consoleLogSpy.mock.calls;
      const jsonOutput = calls.find((call) => {
        const arg = call[0];
        return typeof arg === 'string' && arg.includes('{');
      })?.[0];
      const result = JSON.parse(jsonOutput as string) as ListResult;

      // Verify command has correct description
      const commands = result.commands ?? [];
      const gitStatus = commands.find((c: CommandInfo) => c.name.includes('git:status'));
      expect(gitStatus).toBeDefined();
      expect(gitStatus?.description).toBe('Show git status with insights');
    });
  });
});
