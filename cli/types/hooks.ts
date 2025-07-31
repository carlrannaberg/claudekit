/**
 * Hook Type Definitions
 * Core types for the Claude Code hooks system
 */

import { z } from 'zod';

/**
 * Base payload structure for all hooks
 */
export interface HookPayload {
  tool?: string;
  tool_input?: Record<string, any>;
  tool_output?: any;
  timestamp?: string;
  [key: string]: any;
}

/**
 * Hook execution result
 */
export interface HookResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: string;
  hook?: string;
  duration?: number;
}

/**
 * Hook execution context
 */
export interface HookContext {
  workingDirectory: string;
  environment: string;
  timestamp: string;
  user?: string;
  project?: string;
  [key: string]: any;
}

/**
 * Hook configuration
 */
export interface HookConfig {
  name: string;
  description: string;
  enabled: boolean;
  triggers?: HookTrigger[];
  options?: Record<string, any>;
}

/**
 * Hook trigger definition
 */
export interface HookTrigger {
  event: HookEvent;
  tools?: string[];
  filePatterns?: string[];
  conditions?: HookCondition[];
}

/**
 * Hook events
 */
export enum HookEvent {
  PostToolUse = 'PostToolUse',
  Stop = 'Stop',
  PreToolUse = 'PreToolUse'
}

/**
 * Hook condition
 */
export interface HookCondition {
  type: 'and' | 'or';
  conditions: Array<{
    field: string;
    operator: 'equals' | 'contains' | 'matches' | 'exists';
    value?: any;
  }>;
}

/**
 * Hook matcher result
 */
export interface HookMatchResult {
  matches: boolean;
  hook: string;
  reason?: string;
}

/**
 * Legacy hook format for backward compatibility
 */
export interface LegacyHook {
  type: 'command';
  command: string;
}

/**
 * Settings file structure
 */
export interface ClaudeSettings {
  hooks?: {
    [event: string]: Array<{
      matcher: string;
      hooks: LegacyHook[];
    }>;
  };
}

/**
 * Hook metadata
 */
export interface HookMetadata {
  name: string;
  version: string;
  author?: string;
  description: string;
  tags?: string[];
  dependencies?: string[];
}

// Base hook configuration that all hooks share
export const BaseHookConfigSchema = z.object({
  command: z.string().optional(),
  timeout: z.number().optional().default(30000),
}).passthrough(); // Allow hook-specific fields like 'pattern', 'prefix', etc.

// Complete configuration schema
export const ClaudekitConfigSchema = z.object({
  hooks: z.record(z.string(), BaseHookConfigSchema).optional().default({}),
});

export type BaseHookConfig = z.infer<typeof BaseHookConfigSchema>;
export type ClaudekitConfig = z.infer<typeof ClaudekitConfigSchema>;