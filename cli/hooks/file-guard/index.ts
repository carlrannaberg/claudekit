import { BaseHook } from '../base.js';
import type { HookContext, HookResult } from '../base.js';
import * as path from 'node:path';
import { BashCommandParser } from './bash-command-parser.js';
import { SecurityHeuristicsEngine } from './security-heuristics-engine.js';
import { FileProtectionService } from './file-protection-service.js';

// Re-export for backward compatibility
export { DEFAULT_PATTERNS } from '../sensitive-patterns.js';

export class FileGuardHook extends BaseHook {
  name = 'file-guard';
  
  static metadata = {
    id: 'file-guard',
    displayName: 'File Guard',
    description: 'Prevents AI from accessing sensitive files based on ignore file patterns',
    category: 'validation' as const,
    triggerEvent: 'PreToolUse' as const,
    matcher: 'Read|Edit|MultiEdit|Write|Bash',
    dependencies: [],
  };

  private bashParser = new BashCommandParser();
  private securityEngine = new SecurityHeuristicsEngine();
  private fileProtectionService = new FileProtectionService();
  private isInitialized = false;

  async execute(context: HookContext): Promise<HookResult> {
    const { payload, projectRoot } = context;
    
    // Only process relevant tools
    const toolName = payload.tool_name;
    const supportedTools = ['Read', 'Edit', 'MultiEdit', 'Write', 'Bash'];
    if (toolName === undefined || toolName === null || !supportedTools.includes(toolName)) {
      return { exitCode: 0 };
    }
    
    // Initialize services if not already done
    if (!this.isInitialized) {
      await this.fileProtectionService.initialize(projectRoot);
      this.isInitialized = true;
    }
    
    // Handle Bash commands by scanning for file path candidates
    if (toolName === 'Bash') {
      const toolInput = payload.tool_input as Record<string, unknown> | undefined;
      const command = toolInput?.['command'] as string | undefined;
      if (command === undefined || command === null || command.trim() === '') {
        return { exitCode: 0 };
      }

      // Sensitive-name heuristics for pipelines that read via xargs/cat or find/xargs/cat
      if (this.securityEngine.detectSensitivePipelines(command)) {
        return this.deny('Access denied: pipeline constructs or locates sensitive filenames for cat.');
      }
      // Heuristic: find -name '.env' ... | xargs -0 cat
      const findEnvToCat = /\bfind\b[\s\S]*?-name\s+(["'])?\.env\1?[\s\S]*?\|[\s\S]*?\bxargs\b[\s\S]*?\bcat\b/i;
      if (findEnvToCat.test(command)) {
        return this.deny("Access denied: pipeline locates '.env' and passes to 'cat'.");
      }

      const candidates = await this.extractPathsFromCommand(command, projectRoot);
      
      // If the command is composed only of echo/printf operations (optionally with var assignments)
      // and does not pipe to xargs+cat, allow to avoid false positives like: echo '.env'
      const isEchoOnly = this.bashParser.isEchoOnlyCommand(command);
      const hasXargsCat = /\bxargs\b[\s\S]*\bcat\b/.test(command);
      if (isEchoOnly && !hasXargsCat) {
        return this.allow();
      }
      for (const candidate of candidates) {
        if (await this.fileProtectionService.isFileProtected(candidate)) {
          const ignoreFiles = this.fileProtectionService.getIgnoreFilesFound();
          const reason = `Access denied: '${path.basename(candidate)}' is protected by ${ignoreFiles.length > 0 ? ignoreFiles.join(', ') : 'default patterns'}. This path in the Bash command matches patterns that prevent AI assistant access.`;
          return this.deny(reason);
        }
      }

      // If no candidates matched protection, allow
      return this.allow();
    }

    // Non-Bash tools: Extract file path from tool input
    const filePath = payload.tool_input?.file_path;
    if (filePath === undefined || filePath === null || String(filePath).trim() === '') {
      return { exitCode: 0 };
    }

    // Check if file is protected
    if (await this.fileProtectionService.isFileProtected(filePath)) {
      const ignoreFiles = this.fileProtectionService.getIgnoreFilesFound();
      const reason = `Access denied: '${path.basename(filePath)}' is protected by ${ignoreFiles.length > 0 ? ignoreFiles.join(', ') : 'default patterns'}. This file matches patterns that prevent AI assistant access.`;
      return this.deny(reason);
    }
    
    // Allow access if not protected
    return this.allow();
  }

  private allow(): HookResult {
    return {
      exitCode: 0,
      jsonResponse: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
        },
      },
    };
  }

  private deny(reason: string): HookResult {
    return {
      exitCode: 0,
      jsonResponse: {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: reason,
        },
      },
    };
  }


  // --- Bash parsing helpers ---
  private async extractPathsFromCommand(command: string, projectRoot: string): Promise<string[]> {
    // EARLY EXIT: Skip expensive parsing for obviously safe commands
    if (this.bashParser.isDefinitelySafeCommand(command)) {
      return [];
    }
    
    // OPTIMIZATION: Pre-filter potential sensitive content before full parse
    if (!this.bashParser.needsComprehensiveParsing(command)) {
      return this.bashParser.extractPathsLightweight(command, projectRoot);
    }
    
    // Full parsing for potentially risky commands
    return this.bashParser.extractPathsComprehensive(command, projectRoot);
  }

}
