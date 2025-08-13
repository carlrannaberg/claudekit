import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface ReviewPrompt {
  framework: string;
  questions: string[];
  focus: string;
}

interface SeniorPersona {
  name: string;
  style: string;
  catchphrase: string;
}

interface ConversationMessage {
  role: string;
  content: unknown;
  tool_uses?: Array<{
    name: string;
    input?: unknown;
  }>;
}

export class SelfReviewHook extends BaseHook {
  name = 'self-review';

  static metadata = {
    id: 'self-review',
    displayName: 'Self Review',
    description: 'Prompts a critical self-review as if a senior developer will examine the code',
    category: 'validation' as const,
    triggerEvent: 'Stop' as const,
    matcher: '*',
  };

  private readonly reviewPrompts: ReviewPrompt[] = [
    {
      framework: "thorough code review",
      focus: "code coherence and cleanliness",
      questions: [
        "Looking at the code now, does it need refactoring to be more coherent?",
        "Did your changes make the existing code messier?",
        "Should you extract the new functionality into cleaner abstractions?",
        "Is there duplicated logic that emerged from your changes?",
        "Did you just add code on top without integrating it properly?",
        "Would refactoring the surrounding code make everything simpler?"
      ]
    },
    {
      framework: "careful analysis",
      focus: "integration and simplicity",
      questions: [
        "Does the code structure still make sense after your additions?",
        "Should you consolidate similar functions that now exist?",
        "Did you leave any temporary workarounds or hacks?",
        "Is the code more complex now than it needs to be?",
        "Can you see patterns that should be unified?",
        "Did you clean up after making your changes work?"
      ]
    },
    {
      framework: "quality assessment",
      focus: "overall code health",
      questions: [
        "Is there old code that should now be removed or refactored?",
        "Did you leave the code better than you found it?",
        "Are you using different patterns than the existing code uses?",
        "Should similar logic be consolidated into shared functions?",
        "Is every piece of code still serving a clear purpose?",
        "Does the code tell a coherent story or is it a patchwork?"
      ]
    }
  ];

  private readonly seniorPersonas: SeniorPersona[] = [
    {
      name: "a pragmatic senior engineer",
      style: "values simplicity above all",
      catchphrase: "Perfection is achieved when there is nothing left to take away."
    },
    {
      name: "a seasoned tech lead",
      style: "focused on clean, maintainable code",
      catchphrase: "Simple code is debuggable code."
    },
    {
      name: "an experienced developer",
      style: "allergic to over-engineering",
      catchphrase: "YAGNI - You Aren't Gonna Need It."
    },
    {
      name: "a practical code reviewer",
      style: "looking for clarity and purpose",
      catchphrase: "If it's not being used, it shouldn't be there."
    },
    {
      name: "a minimalist architect",
      style: "believes less is more",
      catchphrase: "The best code is no code."
    }
  ];

  private selectRandomPrompt(): ReviewPrompt {
    if (this.reviewPrompts.length === 0) {
      throw new Error('No review prompts available');
    }
    const index = Math.floor(Math.random() * this.reviewPrompts.length);
    const selected = this.reviewPrompts[index];
    if (!selected) {
      // This shouldn't happen with valid index, but TypeScript needs the check
      const fallback = this.reviewPrompts[0];
      if (!fallback) {
        throw new Error('No review prompts available');
      }
      return fallback;
    }
    return selected;
  }

  private selectRandomPersona(): SeniorPersona {
    if (this.seniorPersonas.length === 0) {
      throw new Error('No senior personas available');
    }
    const index = Math.floor(Math.random() * this.seniorPersonas.length);
    const selected = this.seniorPersonas[index];
    if (!selected) {
      // This shouldn't happen with valid index, but TypeScript needs the check
      const fallback = this.seniorPersonas[0];
      if (!fallback) {
        throw new Error('No senior personas available');
      }
      return fallback;
    }
    return selected;
  }

  private selectRandomQuestions(questions: string[], count = 3): string[] {
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, questions.length));
  }

  private hasRecentCodeChanges(): boolean {
    try {
      // Look for conversation transcript in standard location
      const claudeDir = join(homedir(), '.claude');
      const conversationFile = join(claudeDir, 'conversation.json');
      
      if (!existsSync(conversationFile)) {
        // If no conversation file, assume there might be changes to be safe
        return true;
      }
      
      const conversationData = readFileSync(conversationFile, 'utf-8');
      const conversation = JSON.parse(conversationData) as { messages: ConversationMessage[] };
      
      if (!Array.isArray(conversation.messages) || conversation.messages.length === 0) {
        return false;
      }
      
      // Check last 5 messages for code editing tools
      const recentMessages = conversation.messages.slice(-5);
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
      
      for (const message of recentMessages) {
        if (message.role === 'assistant' && message.tool_uses) {
          for (const toolUse of message.tool_uses) {
            if (codeEditingTools.includes(toolUse.name)) {
              // Check if the edited file is a code file
              const input = toolUse.input as unknown as { file_path?: string; path?: string };
              const filePath = (input?.file_path ?? input?.path ?? '').toString();
              
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
          }
        }
      }
      
      return false;
    } catch {
      // If we can't read the conversation, assume there might be changes
      return true;
    }
  }

  async execute(context: HookContext): Promise<HookResult> {
    const stopHookActive = context.payload?.stop_hook_active;
    
    // Don't trigger if already in a stop hook loop
    if (stopHookActive === true) {
      return { exitCode: 0, suppressOutput: true };
    }

    // Check if there were recent code changes
    if (!this.hasRecentCodeChanges()) {
      return { exitCode: 0, suppressOutput: true };
    }

    // Randomly decide whether to trigger (70% chance)
    if (Math.random() > 0.7) {
      return { exitCode: 0, suppressOutput: true };
    }

    const prompt = this.selectRandomPrompt();
    const persona = this.selectRandomPersona();
    const questions = this.selectRandomQuestions(prompt.questions, 2);

    const reviewMessage = this.constructReviewMessage(persona, prompt, questions);

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

  private constructReviewMessage(persona: SeniorPersona, prompt: ReviewPrompt, questions: string[]): string {
    const templates: Array<() => string> = [
      (): string => `⚠️ **Stop and Review Your Work**

Before it's reviewed by ${persona.name} (${persona.style}):

"${persona.catchphrase}"

**Consider:**
${questions.map(q => `• ${q}`).join('\n')}

Take a moment to address any issues you notice.`,

      (): string => `🔍 **Code Review Required**

Before proceeding, ${persona.name} needs these questions answered.
They're ${persona.style}.

Remember: "${persona.catchphrase}"

**Review questions:**
${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Address any concerns before proceeding.`,

      (): string => `📋 **Quality Check**

${persona.catchphrase}

Focus: ${prompt.focus}

**Self-review checklist:**
${questions.map(q => `□ ${q}`).join('\n')}

Consider addressing these points.`,

      (): string => `🎯 **Required Improvements**

${persona.name} would look for these during their ${prompt.framework}:

"${persona.catchphrase}"

**Points to review:**
${questions.map(q => `→ ${q}`).join('\n')}

Please review and improve where needed.`,

      (): string => `⚡ **Code Issues Detected**

${persona.name} (${persona.style}) would check:

"${persona.catchphrase}"

**Review points:**
${questions.map(q => `- ${q}`).join('\n')}

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