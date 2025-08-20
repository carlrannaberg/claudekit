import { z } from 'zod';

// Hook-specific configuration schemas
const TypecheckConfigSchema = z.object({
  command: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
});

const EslintConfigSchema = z.object({
  fix: z.boolean().optional(),
  extensions: z.array(z.string()).optional(),
  timeout: z.number().min(1000).max(300000).optional(),
  command: z.string().optional(),
});

const AutoCheckpointConfigSchema = z.object({
  prefix: z.string().optional(),
  maxCheckpoints: z.number().min(1).max(100).optional(),
});

const TestConfigSchema = z.object({
  command: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
});

const PrettierConfigSchema = z.object({
  command: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
});

const SelfReviewConfigSchema = z.object({
  timeout: z.number().min(1000).max(300000).optional(),
  targetPatterns: z.array(z.string()).optional(),
  focusAreas: z
    .array(
      z.object({
        name: z.string(),
        questions: z.array(z.string()),
      })
    )
    .optional(),
});

const CodebaseMapConfigSchema = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  format: z.enum(['auto', 'json', 'dsl', 'graph', 'markdown', 'tree']).or(z.string()).optional(),
});

// Global configuration that applies to all hooks
const GlobalHookConfigSchema = z.object({
  timeout: z.number().min(1000).max(300000).optional(),
  enabled: z.boolean().optional(),
});

// Complete hooks configuration
const HooksConfigurationSchema = z.object({
  // Hook-specific configs
  typecheck: TypecheckConfigSchema.optional(),
  'typecheck-changed': TypecheckConfigSchema.optional(),
  'typecheck-project': TypecheckConfigSchema.optional(),
  eslint: EslintConfigSchema.optional(),
  'lint-changed': EslintConfigSchema.optional(),
  'lint-project': EslintConfigSchema.optional(),
  'auto-checkpoint': AutoCheckpointConfigSchema.optional(),
  'create-checkpoint': AutoCheckpointConfigSchema.optional(),
  'run-related-tests': TestConfigSchema.optional(),
  'test-changed': TestConfigSchema.optional(),
  'test-project': TestConfigSchema.optional(),
  prettier: PrettierConfigSchema.optional(),
  'self-review': SelfReviewConfigSchema.optional(),
  'check-any-changed': z
    .object({
      timeout: z.number().min(1000).max(300000).optional(),
    })
    .optional(),
  'check-todos': z
    .object({
      timeout: z.number().min(1000).max(300000).optional(),
    })
    .optional(),
  'codebase-map': CodebaseMapConfigSchema.optional(),

  // Global config
  global: GlobalHookConfigSchema.optional(),
});

// Main claudekit configuration schema
export const ClaudekitConfigSchema = z.object({
  hooks: HooksConfigurationSchema.optional(),
  packageManager: z.enum(['npm', 'yarn', 'pnpm', 'bun']).optional(),
  environment: z.record(z.string()).optional(),
});

// Type exports
export type ClaudekitConfig = z.infer<typeof ClaudekitConfigSchema>;
export type HooksConfiguration = z.infer<typeof HooksConfigurationSchema>;

// Validation function
export function validateClaudekitConfig(data: unknown): {
  valid: boolean;
  errors?: string[];
  data?: ClaudekitConfig;
} {
  try {
    const parsed = ClaudekitConfigSchema.parse(data);
    return { valid: true, data: parsed };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      return { valid: false, errors };
    }
    return { valid: false, errors: ['Invalid configuration format'] };
  }
}
