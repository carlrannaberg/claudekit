// cli/hooks/constants.ts
// Performance and display constants for claudekit hooks

/**
 * Performance thresholds for hook execution and output
 */
export const PERFORMANCE_THRESHOLDS = {
  /** Hook execution time considered slow (5 seconds) */
  SLOW_EXECUTION_MS: 5000,
  
  /** Character count threshold for warning about Claude Code limits (9k chars) */
  CHAR_LIMIT_WARNING: 9000,
  
  /** Character count threshold that will be truncated by Claude Code (10k chars) */
  CHAR_LIMIT_ERROR: 10000,
  
  /** Estimated characters per token for rough token counting */
  TOKENS_PER_CHAR: 4,
  
  /** Maximum length for truncated display strings */
  TRUNCATE_LENGTH: 40,
  
  /** Width of the profile results table */
  TABLE_WIDTH: 84
} as const;

/**
 * Claude Code specific limits based on UserPromptSubmit behavior
 */
export const CLAUDE_CODE_LIMITS = {
  /** Maximum output characters before Claude Code truncates */
  MAX_OUTPUT_CHARS: 10000,
  
  /** Safe output character limit to avoid truncation warnings */
  SAFE_OUTPUT_CHARS: 9000
} as const;
