/**
 * cclint configuration for claudekit project
 *
 * This configuration extends the base Claude Code schemas with claudekit-specific
 * fields and validation rules to support the extended functionality of the toolkit.
 */

import { z } from 'zod';

/**
 * Valid agent categories used for grouping in the UI
 */
const AgentCategorySchema = z.enum([
  'general',
  'framework',
  'testing',
  'database',
  'frontend',
  'devops',
  'build',
  'linting',
  'tools',
  'universal', // For agents that apply universally
]);

export default {
  // Agent schema extensions for claudekit-specific features
  agentSchema: {
    extend: {
      category: AgentCategorySchema.optional().describe('Claudekit: category for grouping agents'),
      displayName: z.string().optional().describe('Claudekit: display name for UI'),
      bundle: z.array(z.string()).optional().describe('Claudekit: bundled subagent names'),
      disableHooks: z
        .array(z.string())
        .optional()
        .describe('Claudekit: hooks to disable for this subagent'),
    },
  },

  // Command schema extensions
  commandSchema: {
    extend: {
      // Extended categories for claudekit command organization
      category: z
        .enum([
          'workflow',
          'ai-assistant',
          'validation',
          'testing', // Added for claudekit test commands
          'development', // Added for dev tools
          'utility', // Added for utility commands
        ])
        .optional()
        .describe('Command category for organization'),
    },
  },

  // Settings schema extensions for claudekit-specific hooks
  settingsSchema: {
    extend: {
      hooks: z
        .object({
          // Standard Claude Code hooks
          PreToolUse: z.array(z.any()).optional(),
          PostToolUse: z.array(z.any()).optional(),
          Stop: z.array(z.any()).optional(),

          // Claudekit-specific hook events - recognize them as valid
          SubagentStop: z
            .array(z.any())
            .optional()
            .describe('Hook triggered when a subagent completes'),
          SessionStart: z.array(z.any()).optional().describe('Hook triggered at session start'),
          UserPromptSubmit: z
            .array(z.any())
            .optional()
            .describe('Hook triggered when user submits a prompt'),
          PreSubagentStart: z.array(z.any()).optional(),
          PostSubagentComplete: z.array(z.any()).optional(),
        })
        .passthrough(), // Allow additional hook types as claudekit evolves
    },
  },

  // General rules
  rules: {
    // Use strict mode to catch actual issues
    strict: true,

    // Treat unknown fields as warnings (not errors)
    unknownFields: 'warning',

    // Exclude test fixtures and temporary files
    excludePatterns: ['**/test-fixtures/**', '**/tmp/**', '**/*.backup-*', '**/node_modules/**'],
  },
};
