import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';

interface FocusArea {
  name: string;
  questions: string[];
}

interface SelfReviewConfig {
  triggerProbability?: number | undefined;
  timeout?: number | undefined;
  focusAreas?: FocusArea[] | undefined;
}

export class SelfReviewHook extends BaseHook {
  name = 'self-review';

  static metadata = {
    id: 'self-review',
    displayName: 'Self Review',
    description: 'Prompts a critical self-review to catch integration and refactoring issues',
    category: 'validation' as const,
    triggerEvent: 'Stop' as const,
    matcher: '*',
  };

  private readonly defaultFocusAreas: FocusArea[] = [
    {
      name: "Refactoring & Integration",
      questions: [
        "Did you just add code on top without integrating it properly?",
        "Should you extract the new functionality into cleaner abstractions?",
        "Would refactoring the surrounding code make everything simpler?",
        "Does the code structure still make sense after your additions?",
        "Should you consolidate similar functions that now exist?",
        "Did you leave any temporary workarounds or hacks?"
      ]
    },
    {
      name: "Code Quality",
      questions: [
        "Did you leave the code better than you found it?",
        "Is there duplicated logic that should be extracted?",
        "Are you using different patterns than the existing code uses?",
        "Is the code more complex now than it needs to be?",
        "Did you clean up after making your changes work?",
        "Is every piece of code still serving a clear purpose?"
      ]
    },
    {
      name: "Consistency & Completeness",
      questions: [
        "Should other parts of the codebase be updated to match your improvements?",
        "Did you update all the places that depend on what you changed?",
        "Are there related files that need the same changes?",
        "Did you create a utility that existing code could benefit from?",
        "Should your solution be applied elsewhere for consistency?",
        "Did you finish what you started or leave work half-done?"
      ]
    }
  ];

  private selectRandomQuestionFromArea(area: FocusArea): string {
    const index = Math.floor(Math.random() * area.questions.length);
    const question = area.questions[index];
    if (question === undefined || question === null || question === '') {
      // Fallback to first question if somehow index is invalid
      return area.questions[0] ?? "Is the code clean and well-integrated?";
    }
    return question;
  }

  private getReviewQuestions(config: SelfReviewConfig): Array<{ area: string; question: string }> {
    const focusAreas = config.focusAreas ?? this.defaultFocusAreas;
    return focusAreas.map(area => ({
      area: area.name,
      question: this.selectRandomQuestionFromArea(area)
    }));
  }

  private async hasRecentCodeChanges(transcriptPath?: string): Promise<boolean> {
    if (transcriptPath === undefined || transcriptPath === '') {
      // No transcript path means we're not in a Claude Code session
      return false;
    }
    
    try {
      // Expand ~ to home directory
      const expandedPath = transcriptPath.replace(/^~/, homedir());
      
      if (!existsSync(expandedPath)) {
        // Transcript doesn't exist, no changes
        return false;
      }
      
      // Read the JSONL transcript
      const content = readFileSync(expandedPath, 'utf-8');
      const lines = content.split('\n').filter(line => line.trim());
      
      // Code editing tools to look for
      const codeEditingTools = ['Write', 'Edit', 'MultiEdit', 'NotebookEdit'];
      
      // Code file extensions to trigger on
      const codeExtensions = [
        '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.cpp', '.c', '.cs', 
        '.go', '.rs', '.swift', '.kt', '.rb', '.php', '.scala', '.clj',
        '.vue', '.svelte', '.astro', '.sol', '.dart', '.lua', '.r', '.m'
      ];
      
      // Documentation/config files to ignore
      const ignorePatterns = [
        'README', 'CHANGELOG', 'LICENSE', '.md', '.txt', '.json', '.yaml', 
        '.yml', '.toml', '.ini', '.env', '.gitignore', '.dockerignore'
      ];
      
      // Check last 20 entries for code edits (reading from end)
      const recentLineCount = Math.min(20, lines.length);
      for (let i = lines.length - 1; i >= lines.length - recentLineCount; i--) {
        const line = lines[i];
        if (line === undefined || line === '') {
          continue;
        }
        
        try {
          const entry = JSON.parse(line) as { 
            toolName?: string; 
            toolInput?: { file_path?: string; path?: string } 
          };
          
          // Check if this is a code editing tool
          if (entry.toolName !== undefined && codeEditingTools.includes(entry.toolName)) {
            const filePath = (entry.toolInput?.file_path ?? entry.toolInput?.path ?? '').toString();
            
            // Skip if it's a documentation or config file
            const shouldIgnore = ignorePatterns.some(pattern => 
              filePath.toUpperCase().includes(pattern.toUpperCase())
            );
            if (shouldIgnore) {
              continue;
            }
            
            // Check if it's a code file
            const isCodeFile = codeExtensions.some(ext => 
              filePath.toLowerCase().endsWith(ext)
            );
            if (isCodeFile) {
              return true;
            }
          }
        } catch {
          // Not valid JSON, skip this line
          continue;
        }
      }
      
      return false;
    } catch (error) {
      // If we can't read or parse the transcript, assume no changes
      if (process.env['DEBUG'] === 'true') {
        console.error('Error reading transcript:', error);
      }
      return false;
    }
  }

  private loadConfig(): SelfReviewConfig {
    return getHookConfig<SelfReviewConfig>('self-review') ?? {};
  }

  async execute(context: HookContext): Promise<HookResult> {
    const stopHookActive = context.payload?.stop_hook_active;
    
    // Don't trigger if already in a stop hook loop
    if (stopHookActive === true) {
      return { exitCode: 0, suppressOutput: true };
    }

    // Check if there were recent code changes
    const transcriptPath = context.payload?.transcript_path as string | undefined;
    const hasChanges = await this.hasRecentCodeChanges(transcriptPath);
    if (!hasChanges) {
      return { exitCode: 0, suppressOutput: true };
    }

    // Load configuration
    const config = this.loadConfig();
    const triggerProbability = config.triggerProbability ?? 0.7;

    // Randomly decide whether to trigger based on configured probability
    if (Math.random() > triggerProbability) {
      return { exitCode: 0, suppressOutput: true };
    }

    const questions = this.getReviewQuestions(config);
    const reviewMessage = this.constructReviewMessage(questions);

    // For Stop hooks, use exit code 0 with JSON output to control decision
    console.error(reviewMessage);
    this.jsonOutput({
      decision: 'block',
      reason: reviewMessage
    });
    
    return { 
      exitCode: 0
    };
  }

  private constructReviewMessage(questions: Array<{ area: string; question: string }>): string {
    const templates: Array<() => string> = [
      (): string => `⚠️ **Stop and Review Your Work**

Before your code is reviewed, consider these critical questions:

${questions.map(q => `**${q.area}:**\n• ${q.question}`).join('\n\n')}

Take a moment to address any issues you notice.`,

      (): string => `🔍 **Self-Review Required**

Please review these aspects of your changes:

${questions.map((q, i) => `**${i + 1}. ${q.area}:**\n   ${q.question}`).join('\n\n')}

Address any concerns before proceeding.`,

      (): string => `📋 **Code Quality Check**

Review your work against these criteria:

${questions.map(q => `**${q.area}:**\n□ ${q.question}`).join('\n\n')}

Consider addressing these points.`,

      (): string => `🎯 **Review Checklist**

Critical questions to consider:

${questions.map(q => `**${q.area}:**\n→ ${q.question}`).join('\n\n')}

Please review and improve where needed.`,

      (): string => `⚡ **Self-Review Time**

Check these aspects of your implementation:

${questions.map(q => `**${q.area}:**\n- ${q.question}`).join('\n\n')}

Consider improvements in these areas.`
    ];

    if (templates.length === 0) {
      throw new Error('No templates available');
    }
    const index = Math.floor(Math.random() * templates.length);
    const template = templates[index];
    if (!template) {
      // This shouldn't happen with valid index, but TypeScript needs the check
      const fallback = templates[0];
      if (!fallback) {
        throw new Error('No templates available');
      }
      return fallback();
    }
    return template();
  }
}