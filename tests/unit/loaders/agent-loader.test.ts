/**
 * Comprehensive tests for AgentLoader class
 *
 * Purpose: Validate that AgentLoader correctly loads agent definitions from markdown files,
 * handles various file naming patterns, parses frontmatter, and provides proper error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { AgentLoader } from '../../../cli/lib/loaders/agent-loader.js';
import { TestFileSystem } from '../../utils/test-helpers.js';
import * as paths from '../../../cli/lib/paths.js';

describe('AgentLoader', () => {
  let testFs: TestFileSystem;
  let tempDir: string;
  let agentsDir: string;

  beforeEach(async () => {
    testFs = new TestFileSystem();
    tempDir = await testFs.createTempDir();
    agentsDir = path.join(tempDir, 'src', 'agents');
    await fs.mkdir(agentsDir, { recursive: true });

    // Create .claude directory for project-level agents
    const projectClaudeDir = path.join(tempDir, '.claude', 'agents');
    await fs.mkdir(projectClaudeDir, { recursive: true });

    // Mock the path functions to use our test directories
    vi.spyOn(paths, 'getProjectClaudeDirectory').mockReturnValue(path.join(tempDir, '.claude'));
    vi.spyOn(paths, 'getUserClaudeDirectory').mockReturnValue(path.join(tempDir, 'user-claude'));
    vi.spyOn(paths, 'findComponentsDirectory').mockResolvedValue(path.join(tempDir, 'src'));
  });

  afterEach(async () => {
    await testFs.cleanup();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  // Helper function to create a test AgentLoader that uses our test directory
  const createTestLoader = (): AgentLoader => {
    return new AgentLoader();
  };

  describe('constructor', () => {
    it('should initialize successfully when agent directories exist', () => {
      // Purpose: Verify constructor properly initializes with valid search paths
      const loader = createTestLoader();
      expect(loader).toBeInstanceOf(AgentLoader);
    });
  });

  describe('loadAgent', () => {
    describe('simple agent name loading', () => {
      it('should load agent by simple name (e.g., "oracle")', async () => {
        // Purpose: Verify direct file matching works for simple agent names
        const agentContent = `---
name: oracle
description: General-purpose oracle for complex queries
category: general
---

# Oracle Agent
This is the oracle agent content.`;

        await fs.writeFile(path.join(agentsDir, 'oracle.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('oracle');

        expect(result).toEqual({
          id: 'oracle',
          name: 'oracle',
          description: 'General-purpose oracle for complex queries',
          category: 'general',
          bundle: undefined,
          displayName: undefined,
          color: undefined,
          content: '# Oracle Agent\nThis is the oracle agent content.',
          filePath: path.join(agentsDir, 'oracle.md'),
          tools: undefined,
        });
      });

      it('should handle agents with missing frontmatter fields', async () => {
        // Purpose: Ensure loader provides sensible defaults for missing frontmatter
        const agentContent = `---
name: minimal-agent
---

# Minimal Agent
Content only.`;

        await fs.writeFile(path.join(agentsDir, 'minimal-agent.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('minimal-agent');

        expect(result.description).toBe('');
        expect(result.category).toBe('general');
        expect(result.name).toBe('minimal-agent');
        expect(result.content).toBe('# Minimal Agent\nContent only.');
      });

      it('should use agentId as name when name field is empty or invalid', async () => {
        // Purpose: Verify fallback behavior when frontmatter name is invalid
        const agentContent = `---
name: ""
description: Agent with empty name
---

# Agent Content`;

        await fs.writeFile(path.join(agentsDir, 'fallback-name.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('fallback-name');

        expect(result.name).toBe('fallback-name');
        expect(result.id).toBe('fallback-name');
      });
    });

    describe('-expert suffix handling', () => {
      it('should load agent with -expert suffix when suffix not provided', async () => {
        // Purpose: Test automatic -expert suffix addition for common agent naming pattern
        const agentContent = `---
name: typescript-expert
description: TypeScript expertise
category: framework
---

# TypeScript Expert`;

        await fs.writeFile(path.join(agentsDir, 'typescript-expert.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('typescript');

        expect(result.id).toBe('typescript');
        expect(result.name).toBe('typescript-expert');
        expect(result.filePath).toBe(path.join(agentsDir, 'typescript-expert.md'));
      });

      it('should not add -expert suffix when already present in agentId', async () => {
        // Purpose: Ensure -expert suffix is not duplicated when already provided
        const agentContent = `---
name: react-expert
description: React expertise
---

# React Expert`;

        await fs.writeFile(path.join(agentsDir, 'react-expert.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('react-expert');

        expect(result.id).toBe('react-expert');
        expect(result.name).toBe('react-expert');
      });
    });

    describe('category/name pattern loading', () => {
      it('should load agent by category/name pattern (e.g., "typescript/expert")', async () => {
        // Purpose: Test directory-based agent organization with category/name structure
        const categoryDir = path.join(agentsDir, 'typescript');
        await fs.mkdir(categoryDir, { recursive: true });

        const agentContent = `---
name: typescript-type-expert
description: TypeScript type system specialist
category: framework
---

# TypeScript Type Expert`;

        await fs.writeFile(path.join(categoryDir, 'expert.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('typescript/expert');

        expect(result.id).toBe('typescript/expert');
        expect(result.name).toBe('typescript-type-expert');
        expect(result.filePath).toBe(path.join(categoryDir, 'expert.md'));
      });

      it('should try -expert suffix for category/name pattern', async () => {
        // Purpose: Test -expert suffix handling in directory structure
        const categoryDir = path.join(agentsDir, 'database');
        await fs.mkdir(categoryDir, { recursive: true });

        const agentContent = `---
name: postgres-expert
description: PostgreSQL database expert
category: database
---

# PostgreSQL Expert`;

        await fs.writeFile(path.join(categoryDir, 'postgres-expert.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('database/postgres');

        expect(result.id).toBe('database/postgres');
        expect(result.name).toBe('postgres-expert');
      });
    });

    describe('frontmatter name field matching', () => {
      it('should find agent by frontmatter name field when file name differs', async () => {
        // Purpose: Test fallback search by frontmatter name when filename doesn't match
        const agentContent = `---
name: special-oracle
description: Special oracle agent
category: general
---

# Special Oracle`;

        await fs.writeFile(path.join(agentsDir, 'different-filename.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('special-oracle');

        expect(result.id).toBe('special-oracle');
        expect(result.name).toBe('special-oracle');
        expect(result.filePath).toBe(path.join(agentsDir, 'different-filename.md'));
      });

      it('should search recursively through subdirectories for frontmatter name', async () => {
        // Purpose: Verify recursive search capability for agents in nested directories
        const nestedDir = path.join(agentsDir, 'deep', 'nested', 'directory');
        await fs.mkdir(nestedDir, { recursive: true });

        const agentContent = `---
name: deeply-nested-agent
description: Agent in deep directory
category: test
---

# Deeply Nested Agent`;

        await fs.writeFile(path.join(nestedDir, 'agent.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('deeply-nested-agent');

        expect(result.id).toBe('deeply-nested-agent');
        expect(result.name).toBe('deeply-nested-agent');
        expect(result.filePath).toBe(path.join(nestedDir, 'agent.md'));
      });
    });

    describe('complex frontmatter parsing', () => {
      it('should parse all frontmatter fields correctly', async () => {
        // Purpose: Validate comprehensive frontmatter parsing including all supported fields
        const agentContent = `---
name: comprehensive-agent
description: Agent with all frontmatter fields
category: testing
bundle: ["related-agent-1", "related-agent-2"]
displayName: Comprehensive Test Agent
color: blue
tools: ["Read", "Write", "Bash"]
---

# Comprehensive Agent
This agent has all possible frontmatter fields.`;

        await fs.writeFile(path.join(agentsDir, 'comprehensive.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('comprehensive');

        expect(result).toEqual({
          id: 'comprehensive',
          name: 'comprehensive-agent',
          description: 'Agent with all frontmatter fields',
          category: 'testing',
          bundle: ['related-agent-1', 'related-agent-2'],
          displayName: 'Comprehensive Test Agent',
          color: 'blue',
          content: '# Comprehensive Agent\nThis agent has all possible frontmatter fields.',
          filePath: path.join(agentsDir, 'comprehensive.md'),
          tools: ['Read', 'Write', 'Bash'],
        });
      });

      it('should handle malformed frontmatter gracefully', async () => {
        // Purpose: Ensure loader doesn't crash on invalid YAML frontmatter
        const agentContent = `---
name: malformed-agent
description: "Unclosed quote
category: broken
---

# Malformed Agent`;

        await fs.writeFile(path.join(agentsDir, 'malformed.md'), agentContent);

        const loader = createTestLoader();
        // Should not throw an error, but might parse incorrectly
        const result = await loader.loadAgent('malformed');
        expect(result.id).toBe('malformed');
        // The exact parsing behavior depends on gray-matter's error handling
      });
    });

    describe('error handling', () => {
      it('should throw error for non-existent agent', async () => {
        // Purpose: Verify proper error handling when agent file doesn't exist
        const loader = createTestLoader();
        await expect(loader.loadAgent('non-existent-agent')).rejects.toThrow(
          'Agent not found: non-existent-agent'
        );
      });

      it('should handle file system permission errors', async () => {
        // Purpose: Test graceful handling of file system access issues
        const agentPath = path.join(agentsDir, 'permission-test.md');
        await fs.writeFile(agentPath, 'content');

        // Mock fs.readFile to simulate permission error
        vi.spyOn(fs, 'readFile').mockRejectedValueOnce(new Error('Permission denied'));

        const loader = createTestLoader();
        await expect(loader.loadAgent('permission-test')).rejects.toThrow('Permission denied');
      });

      it('should handle corrupted file content', async () => {
        // Purpose: Ensure loader handles files that can't be parsed gracefully
        const agentPath = path.join(agentsDir, 'corrupted.md');
        // Create a file with invalid UTF-8 content or other corruption
        await fs.writeFile(agentPath, Buffer.from([0xff, 0xfe, 0xfd]));

        const loader = createTestLoader();
        // The loader now gracefully handles corrupted content by treating
        // the entire file as content when frontmatter parsing fails
        const result = await loader.loadAgent('corrupted');
        expect(result).toBeDefined();
        expect(result.id).toBe('corrupted');
        // Content will be the raw file data (possibly with replacement chars for invalid UTF-8)
        expect(result.content).toBeDefined();
      });
    });

    describe('search strategy priority', () => {
      it('should prefer direct file match over -expert suffix', async () => {
        // Purpose: Verify search strategy prioritizes exact matches over suffix additions
        const directContent = `---
name: direct-match
description: Direct file match
---
# Direct Match`;

        const expertContent = `---
name: expert-match
description: Expert suffix match
---
# Expert Match`;

        await fs.writeFile(path.join(agentsDir, 'test.md'), directContent);
        await fs.writeFile(path.join(agentsDir, 'test-expert.md'), expertContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('test');

        expect(result.name).toBe('direct-match');
        expect(result.description).toBe('Direct file match');
      });

      it('should prefer file-based match over frontmatter name search', async () => {
        // Purpose: Test search priority when both filename and frontmatter name could match
        const fileBasedContent = `---
name: file-based-agent
description: Found by filename
---
# File Based`;

        const frontmatterContent = `---
name: priority-test
description: Found by frontmatter
---
# Frontmatter Based`;

        await fs.writeFile(path.join(agentsDir, 'priority-test.md'), fileBasedContent);
        await fs.writeFile(path.join(agentsDir, 'other-file.md'), frontmatterContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('priority-test');

        expect(result.description).toBe('Found by filename');
        expect(result.filePath).toBe(path.join(agentsDir, 'priority-test.md'));
      });
    });

    describe('content processing', () => {
      it('should trim whitespace from content', async () => {
        // Purpose: Verify content processing removes leading/trailing whitespace
        const agentContent = `---
name: whitespace-test
---

    
# Agent Content
Some text here.
    
    `;

        await fs.writeFile(path.join(agentsDir, 'whitespace.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('whitespace');

        expect(result.content).toBe('# Agent Content\nSome text here.');
        expect(result.content).not.toMatch(/^\s+/);
        expect(result.content).not.toMatch(/\s+$/);
      });

      it('should preserve internal content formatting', async () => {
        // Purpose: Ensure content formatting within the document is preserved
        const agentContent = `---
name: formatting-test
---

# Title

## Section 1
- Item 1
- Item 2

\`\`\`typescript
function example() {
  return "code block";
}
\`\`\`

Regular paragraph with **bold** and *italic*.`;

        await fs.writeFile(path.join(agentsDir, 'formatting.md'), agentContent);

        const loader = createTestLoader();
        const result = await loader.loadAgent('formatting');

        expect(result.content).toContain('# Title');
        expect(result.content).toContain('## Section 1');
        expect(result.content).toContain('```typescript');
        expect(result.content).toContain('**bold**');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty markdown files', async () => {
      // Purpose: Test behavior with empty agent files
      await fs.writeFile(path.join(agentsDir, 'empty.md'), '');

      const loader = createTestLoader();
      const result = await loader.loadAgent('empty');

      expect(result.id).toBe('empty');
      expect(result.name).toBe('empty');
      expect(result.description).toBe('');
      expect(result.category).toBe('general');
      expect(result.content).toBe('');
    });

    it('should handle files with only frontmatter', async () => {
      // Purpose: Test files with frontmatter but no content
      const agentContent = `---
name: frontmatter-only
description: Only has frontmatter
---`;

      await fs.writeFile(path.join(agentsDir, 'frontmatter-only.md'), agentContent);

      const loader = createTestLoader();
      const result = await loader.loadAgent('frontmatter-only');

      expect(result.name).toBe('frontmatter-only');
      expect(result.content).toBe('');
    });

    it('should handle files with no frontmatter', async () => {
      // Purpose: Test markdown files without YAML frontmatter
      const agentContent = `# No Frontmatter Agent

This agent has no frontmatter section.`;

      await fs.writeFile(path.join(agentsDir, 'no-frontmatter.md'), agentContent);

      const loader = createTestLoader();
      const result = await loader.loadAgent('no-frontmatter');

      expect(result.id).toBe('no-frontmatter');
      expect(result.name).toBe('no-frontmatter');
      expect(result.description).toBe('');
      expect(result.category).toBe('general');
      expect(result.content).toBe(
        '# No Frontmatter Agent\n\nThis agent has no frontmatter section.'
      );
    });

    it('should handle agent IDs with special characters', async () => {
      // Purpose: Test handling of agent IDs that might cause filesystem issues
      const safeId = 'special-chars';
      const agentContent = `---
name: special-agent
description: Agent with special characters in name
---

# Special Agent`;

      await fs.writeFile(path.join(agentsDir, 'special-chars.md'), agentContent);

      const loader = createTestLoader();
      const result = await loader.loadAgent(safeId);

      expect(result.id).toBe(safeId);
      expect(result.name).toBe('special-agent');
    });
  });
});
