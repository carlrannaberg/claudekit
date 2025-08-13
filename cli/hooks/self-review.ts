import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { getHookConfig } from '../utils/claudekit-config.js';
import { TranscriptParser } from '../utils/transcript-parser.js';

interface FocusArea {
  name: string;
  questions: string[];
}

interface SelfReviewConfig {
  triggerProbability?: number | undefined;
  timeout?: number | undefined;
  focusAreas?: FocusArea[] | undefined;
  messageWindow?: number | undefined;  // Number of UI-visible messages (user/assistant turns) to check for changes
  targetExtensions?: string[] | undefined;  // File extensions to review (e.g., ['.ts', '.js'] for code, ['.md'] for docs)
}

// Unique marker to identify self-review messages in the transcript
const SELF_REVIEW_MARKER = '📋 **Self-Review**';

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

  private async hasRecentFileChanges(messageWindow: number, targetExtensions: string[] | undefined, transcriptPath?: string): Promise<boolean> {
    if (transcriptPath === undefined || transcriptPath === '') {
      // No transcript path means we're not in a Claude Code session
      return false;
    }
    
    const parser = new TranscriptParser(transcriptPath);
    if (!parser.exists()) {
      // Transcript doesn't exist, no changes
      return false;
    }
    
    // First check if there are any new file changes since the last review
    const hasNewChanges = parser.hasFileChangesSinceMarker(SELF_REVIEW_MARKER, targetExtensions);
    if (!hasNewChanges) {
      if (process.env['DEBUG'] === 'true') {
        console.error('Self-review: No new file changes since last review');
      }
      return false;
    }
    
    // Then check if changes are within the message window
    return parser.hasRecentFileChanges(messageWindow, targetExtensions);
  }

  private loadConfig(): SelfReviewConfig {
    return getHookConfig<SelfReviewConfig>('self-review') ?? {};
  }

  async execute(context: HookContext): Promise<HookResult> {
    if (process.env['DEBUG'] === 'true') {
      console.error('Self-review: Hook starting');
    }
    const stopHookActive = context.payload?.stop_hook_active;
    
    // Don't trigger if already in a stop hook loop
    if (stopHookActive === true) {
      if (process.env['DEBUG'] === 'true') {
        console.error('Self-review: Skipping due to stop_hook_active');
      }
      return { exitCode: 0, suppressOutput: true };
    }

    // Load configuration
    const config = this.loadConfig();
    const messageWindow = config.messageWindow ?? 15; // Default: check last 15 UI-visible messages (user/assistant turns)
    const triggerProbability = config.triggerProbability ?? 0.7;
    
    if (process.env['DEBUG'] === 'true') {
      console.error(`Self-review: Config loaded - messageWindow=${messageWindow}, probability=${triggerProbability}`);
    }

    // Check if there were recent file changes matching target extensions
    const transcriptPath = context.payload?.transcript_path as string | undefined;
    const targetExtensions = config.targetExtensions;
    const hasChanges = await this.hasRecentFileChanges(messageWindow, targetExtensions, transcriptPath);
    if (!hasChanges) {
      if (process.env['DEBUG'] === 'true') {
        console.error(`Self-review: No recent file changes detected in last ${messageWindow} messages`);
      }
      return { exitCode: 0, suppressOutput: true };
    }

    // Randomly decide whether to trigger based on configured probability
    if (Math.random() > triggerProbability) {
      if (process.env['DEBUG'] === 'true') {
        console.error(`Self-review: Skipped due to probability (${triggerProbability})`);
      }
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
    // Use consistent header for easy detection in transcript
    return `${SELF_REVIEW_MARKER}

Please review these aspects of your changes:

${questions.map(q => `**${q.area}:**\n• ${q.question}`).join('\n\n')}

Address any concerns before proceeding.`;
  }
}