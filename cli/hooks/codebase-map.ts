import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { checkToolAvailable } from './utils.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

const execAsync = promisify(exec);

interface CodebaseMapConfig {
  command?: string | undefined;
  format?: string | undefined; // Output format: auto|json|dsl|graph|markdown
  updateOnChanges?: boolean | undefined;
}

export class CodebaseMapHook extends BaseHook {
  name = 'codebase-map';

  static metadata = {
    id: 'codebase-map',
    displayName: 'Codebase Map Generator',
    description: 'Generate project structure map using codebase-map CLI on session start',
    category: 'utility' as const,
    triggerEvent: 'SessionStart' as const,
    matcher: '*',
    dependencies: [],
  };

  private loadConfig(): CodebaseMapConfig {
    return getHookConfig<CodebaseMapConfig>('codebase-map') ?? {};
  }

  async execute(context: HookContext): Promise<HookResult> {
    const { projectRoot } = context;
    
    // Check if codebase-map is installed
    if (!(await checkToolAvailable('codebase-map', 'package.json', projectRoot))) {
      this.warning('codebase-map CLI not found. Install it from: https://github.com/carlrannaberg/codebase-map');
      this.progress('You can install it with: npm install -g codebase-map');
      return { exitCode: 0 };
    }

    const config = this.loadConfig();
    const format = config.format ?? 'auto';

    try {
      // First, scan the project to create/update the index
      this.progress('🗺️ Scanning project structure...');
      
      const scanCommand = config.command ?? 'codebase-map scan';
      await execAsync(scanCommand, {
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024
      });

      // Then format and display the result
      this.progress('📋 Generating codebase map...');
      
      const formatCommand = `codebase-map format --format ${format}`;
      const { stdout } = await execAsync(formatCommand, {
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024
      });

      // Display the formatted output
      if (stdout?.trim()) {
        this.progress('\n📍 Codebase Map:\n');
        this.progress(stdout);
        this.success('Codebase map generated successfully!');
      }

      return { exitCode: 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.error(
        'Codebase Map Generation Failed',
        errorMessage,
        [
          'Ensure codebase-map CLI is installed: npm install -g codebase-map',
          'Check that you have read permissions for all project files',
          'Try running codebase-map scan manually to diagnose issues',
        ]
      );
      // Don't block the session, just warn
      return { exitCode: 0 };
    }
  }
}

// Hook for updating codebase map on file changes
export class CodebaseMapUpdateHook extends BaseHook {
  name = 'codebase-map-update';
  private lastUpdateTime = 0;
  private updateDebounceMs = 5000; // Debounce updates to avoid excessive regeneration

  static metadata = {
    id: 'codebase-map-update',
    displayName: 'Codebase Map Updater',
    description: 'Update codebase map index when files change',
    category: 'utility' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['codebase-map'],
  };

  private loadConfig(): CodebaseMapConfig {
    return getHookConfig<CodebaseMapConfig>('codebase-map-update') ?? {};
  }

  private shouldUpdateMap(filePath: string | undefined): boolean {
    if (filePath === undefined || filePath.length === 0) {
      return false;
    }

    const config = this.loadConfig();
    if (config.updateOnChanges === false) {
      return false;
    }
    
    // Check if enough time has passed since last update (debounce)
    const now = Date.now();
    if (now - this.lastUpdateTime < this.updateDebounceMs) {
      return false;
    }
    
    // Only update for TypeScript/JavaScript files
    const isCodeFile = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'].some(ext => 
      filePath.endsWith(ext)
    );
    
    return isCodeFile;
  }

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot } = context;
    
    // Check if we should update the map
    if (!this.shouldUpdateMap(filePath)) {
      return { exitCode: 0 };
    }
    
    // Check if codebase-map is installed (silently skip if not available)
    if (!(await checkToolAvailable('codebase-map', 'package.json', projectRoot))) {
      return { exitCode: 0 };
    }
    
    // Check if index file exists (.codebasemap)
    try {
      await fs.access(path.join(projectRoot, '.codebasemap'));
    } catch {
      // No index file, skip update (will be created on next SessionStart)
      return { exitCode: 0 };
    }
    
    // Update the specific file in the index
    this.lastUpdateTime = Date.now();
    
    try {
      const config = this.loadConfig();
      const command = config.command ?? `codebase-map update "${filePath}"`;
      
      await execAsync(command, {
        cwd: projectRoot,
        maxBuffer: 10 * 1024 * 1024
      });
      
      // Silent success - don't interrupt workflow
    } catch (error) {
      // Silently fail on updates to avoid disrupting workflow
      console.error('Failed to update codebase map:', error);
    }
    
    return { exitCode: 0 };
  }
}