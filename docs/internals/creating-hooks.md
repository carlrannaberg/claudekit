# Adding New Hooks to ClaudeKit

## Current Process (2 Steps)

Adding a new hook to ClaudeKit requires just 2 steps:

### Step 1: Create Your Hook Implementation

Create a new file in `cli/hooks/` with your hook class:

```typescript
// cli/hooks/my-new-hook.ts
import type { HookContext, HookResult } from './base.js';
import { BaseHook } from './base.js';

export class MyNewHook extends BaseHook {
  name = 'my-new-hook';

  static metadata = {
    id: 'my-new-hook',
    displayName: 'My New Hook',
    description: 'What this hook does',
    category: 'validation' as const,  // or 'testing', 'git', 'project-management', 'utility'
    triggerEvent: 'PostToolUse' as const,  // or 'Stop'
    matcher: 'Write|Edit|MultiEdit',  // Tool patterns that trigger this hook
    dependencies: ['tool1', 'tool2'],  // optional
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;
    
    // Your hook logic here
    
    return { exitCode: 0 };
  }
}
```

### Step 2: Export Your Hook

Add one export line to `cli/hooks/index.ts`:

```typescript
// cli/hooks/index.ts
export { MyNewHook } from './my-new-hook.js';
```

Everything else is handled automatically:
- Hook registry is built from exports
- Runner automatically discovers hooks via registry

## Hook Response Formats

### JSON Output Options

Hooks can return JSON responses using the `jsonResponse` field:

```typescript
// Return the complete JSON structure as expected by Claude Code
return {
  exitCode: 0,
  jsonResponse: {
    // Your complete JSON response here
  }
};
```

### PreToolUse Hook Example

PreToolUse hooks must wrap their response in `hookSpecificOutput` as per Claude Code documentation:

```typescript
return {
  exitCode: 0,
  jsonResponse: {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',  // or 'allow' or 'ask'
      permissionDecisionReason: 'Access denied to sensitive file'
    }
  }
};
```

This approach keeps the runner simple - it just outputs whatever is in `jsonResponse` without any hook-specific logic.
- CLI commands (`list`, `run`) work immediately
- Setup command includes it automatically
- Settings are generated from hook metadata
- Component discovery happens automatically

### UserPromptSubmit Hook Example

UserPromptSubmit hooks can inject additional context into user prompts:

```typescript
return {
  exitCode: 0,
  jsonResponse: {
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: 'Additional context to prepend to the prompt'
    }
  }
};
```

### Important Hook Processing Behaviors

**⚠️ OBSERVED BEHAVIOR:** Claude Code's hook processing has specific behaviors that may not match expectations when using multiple hooks with `additionalContext`.

#### Hook Output Processing Decision Tree

Claude Code follows this decision tree when processing hook output:

**Step 1: Exit Code Check**
- Exit code 0 → Use stdout as output
- Non-zero exit code → Use stderr as output

**Step 2: Output Format Detection**
- Output starts with `{` → Try to parse as JSON
- Output doesn't start with `{` → Treat as plain text → **IGNORED COMPLETELY**

**Step 3: JSON Parsing**
- Valid JSON → Extract `hookSpecificOutput.additionalContext`
- Invalid JSON → Treat as plain text → **IGNORED COMPLETELY**

**Step 4: Context Collection**
- Multiple hooks' `additionalContext` values are collected into arrays
- Contexts are joined with `\n\n` separator
- **IMPORTANT: Total combined context has a 10,000 character limit**
- If combined contexts exceed 10,000 characters, content is truncated

##### Critical Implications

**✅ Working Configuration:**
- Exit with code 0
- Output valid JSON to stdout
- Include `hookSpecificOutput.additionalContext` structure
- Multiple hooks' contexts are collected properly

**❌ Silent Failures:**
- Plain text output → Completely ignored, no context added
- Malformed JSON → Treated as plain text, ignored

#### Observed Behavior with Multiple Hooks

When multiple UserPromptSubmit hooks return `additionalContext`:
- The system collects ALL contexts correctly into arrays
- Processing appears to handle multiple contexts appropriately
- If you observe missing context, investigate other factors such as:
  - Hook execution order in `.claude/settings.json`
  - Individual hook failures (check each hook's output independently)
  - JSON formatting issues in specific hooks

#### Hook Context Visibility and Limits

**UserPromptSubmit vs SessionStart Behavior:**

| Feature          | UserPromptSubmit                       | SessionStart              |
|------------------|-----------------------------------------|---------------------------|
| Character Limit  | 10,000                                  | None                      |
| Hidden from User | ✅ Yes (`isVisibleInTranscriptOnly`)   | ❌ No (visible in UI)     |
| Wrapped in Tags  | `<user-prompt-submit-hook>`            | `<session-start-hook>`    |
| Use Case         | Hidden context injection                | Visible session setup     |

**UserPromptSubmit Context Length Limit:**

Claude Code enforces a 10,000 character limit on the combined `additionalContext` from UserPromptSubmit hooks.

**Processing behavior:**
1. All UserPromptSubmit hooks' `additionalContext` values are collected
2. Contexts are joined with `\n\n` separator between each
3. If the total exceeds 10,000 characters, content is truncated at character 10,000
4. A truncation message is appended: `[output truncated - exceeded 10000 characters]`

**Implications:**
- Large context outputs can cause subsequent hooks' contexts to be truncated
- Hook execution order affects which contexts are preserved
- Hooks generating large output should implement self-imposed limits

**Example implementation:**
The codebase-map hook implements a 9,000 character limit to ensure space for other hooks:
```typescript
const MAX_CONTEXT_LENGTH = 9000; // Leave 1,000 chars for other hooks
if (contextMessage.length > MAX_CONTEXT_LENGTH) {
  contextMessage = `${contextMessage.substring(0, MAX_CONTEXT_LENGTH)}\n\n[output truncated - exceeded 9000 characters]`;
}
```

#### Best Practices for Multiple Hooks

When using multiple hooks that provide `additionalContext`:

**1. Verify Individual Hook Output**
Test each hook independently to ensure it outputs valid JSON:
```bash
echo '{"hook_event_name": "UserPromptSubmit"}' | claudekit-hooks run your-hook-name
```

**2. Check Hook Order**
The order in `.claude/settings.json` determines execution sequence. Place smaller, critical contexts last to avoid truncation.

**3. Monitor Context Sizes**
```bash
# Test combined output length
echo '{"hook_event_name": "UserPromptSubmit"}' | claudekit-hooks run your-hook | jq -r '.hookSpecificOutput.additionalContext' | wc -c
```

**4. Implement Self-Limiting**
For hooks that generate large output, implement character limits to leave room for other hooks:
- Consider 8,000-9,000 character limits for large context generators
- Add truncation messages when limits are exceeded
- Configure include/exclude patterns to reduce output naturally

**5. Debug Hook Failures**
If context appears missing:
- Check if total context exceeds 10,000 characters
- Verify each hook's output format (must be valid JSON starting with `{`)
- Verify exit codes (must be 0 for successful context addition)
- Test hook order impact by checking which contexts appear

## Optional Steps

For a production-ready hook, you may also want to:

3. **Add configuration support** (see "Making Hooks Configurable" section below)
4. **Add tests** in `tests/unit/hooks/my-new-hook.test.sh`
5. **Update documentation** in `docs/reference/hooks.md`

## Hook Metadata Fields

### Required Fields

- `id`: Unique identifier for the hook (should match the `name` property)
- `displayName`: Human-readable name shown in UI
- `description`: Brief description of what the hook does
- `category`: One of: `'validation'`, `'testing'`, `'git'`, `'project-management'`, `'utility'`
- `triggerEvent`: When the hook runs - either `'PostToolUse'` (after file edits) or `'Stop'` (when Claude stops)
- `matcher`: Tool patterns that trigger this hook (e.g., `'Write|Edit|MultiEdit'` for file modifications)

### Optional Fields

- `dependencies`: Array of tool names this hook requires (e.g., `['typescript', 'tsc']`)

## Hook Context

Your hook receives a context object with:

- `filePath`: The file being edited (may be undefined)
- `projectRoot`: The project root directory
- `payload`: The full Claude payload
- `packageManager`: Detected package manager with utilities

### Working with Transcripts (Stop Hooks)

Stop hooks receive a `transcript_path` in the payload that points to a JSONL (JSON Lines) file containing the conversation history. This is different from a regular JSON file - each line is a separate JSON object.

```typescript
// Access transcript path in Stop hooks
const transcriptPath = context.payload?.transcript_path as string | undefined;
if (transcriptPath) {
  // Expand ~ to home directory
  const expandedPath = transcriptPath.replace(/^~/, process.env['HOME'] ?? '');
  
  // Read JSONL format (one JSON object per line)
  const content = await this.readFile(expandedPath);
  const lines = content.split('\n').filter(line => line.trim());
  
  // Parse each line as separate JSON
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      // Process entry...
    } catch {
      // Not valid JSON, skip line
    }
  }
}
```

**Important:** The transcript is in JSONL format, NOT a single JSON object. Each line contains:
- Various entry types: user messages, assistant messages, system updates, and tool uses
- The most recent entries are at the end of the file
- Read from the end backwards to find the most recent state
- **Message Boundaries**: You can track conversation turns by counting `type: 'user'` and `type: 'assistant'` entries
- **Tool Uses**: Found in assistant entries with `content[].type === 'tool_use'`
- **Grouping**: Assistant entries with the same `message.id` are parts of the same response

#### Understanding UI Message Counting

**Important:** Claude Code UI dots (⏺) don't map 1:1 to transcript entries. When users say "5 messages ago", they mean 5 dots in the UI, not 5 transcript entries.

**UI Message Grouping Rules:**
- Assistant message with text starts a new UI message (gets a dot)
- Following tool-only assistant messages belong to the same UI message
- Standalone tool uses (TodoWrite) get their own dot
- User messages are included but don't create dots

A single UI message can contain dozens of transcript entries. When implementing "last N messages" logic, you must group transcript entries to match what users see in the UI.

#### JSONL Entry Schema

The transcript contains various types of entries. Each line is a JSON object that can be one of several types:

```typescript
// Base fields shared by all entries
interface BaseEntry {
  uuid: string;                    // Unique identifier for this entry
  parentUuid: string | null;       // Links to previous entry in conversation
  sessionId: string;               // Session identifier (consistent across conversation)
  timestamp: string;               // ISO 8601 timestamp
  type: 'user' | 'assistant' | 'system';
  isSidechain: boolean;            // Whether this is a side conversation
  userType: 'external';           // Type of user
  cwd: string;                    // Current working directory
  version: string;                // Claude Code version (e.g., "1.0.77")
  gitBranch: string;              // Current git branch
}

// User entry - can include tool results
interface UserEntry extends BaseEntry {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{
      type: 'text' | 'tool_result';
      text?: string;              // For text content
      tool_use_id?: string;       // Links to tool use
      content?: any;              // Tool result content
      is_error?: boolean;         // Whether tool failed
    }>;
  };
  toolUseResult?: {               // Rich tool output data
    filePath?: string;
    oldString?: string;
    newString?: string;
    structuredPatch?: any[];
    newTodos?: Array<{
      content: string;
      status: 'pending' | 'in_progress' | 'completed';
      id: string;
    }>;
    // ... varies by tool type
  };
}

// Assistant entry - contains tool uses
interface AssistantEntry extends BaseEntry {
  type: 'assistant';
  requestId: string;
  message: {
    id: string;                   // Message ID (same across related entries)
    type: 'message';
    role: 'assistant';
    model: string;                // e.g., "claude-opus-4-1-20250805"
    content: Array<{
      type: 'text' | 'tool_use';
      text?: string;              // For text content
      // For tool_use:
      id?: string;                // Tool use ID
      name?: string;              // Tool name (Edit, Write, Bash, etc.)
      input?: {                   // Tool parameters
        file_path?: string;
        old_string?: string;
        new_string?: string;
        command?: string;
        todos?: any[];
        // ... tool-specific fields
      };
    }>;
    stop_reason: null | string;
    usage: {
      input_tokens: number;
      output_tokens: number;
      // ... token usage details
    };
  };
}

// System entry - status updates and hook results
interface SystemEntry extends BaseEntry {
  type: 'system';
  content: string;                // e.g., "Stop [claudekit-hooks run typecheck-project] completed"
  isMeta: boolean;               // Whether this is meta information
  level: 'info' | 'warning' | 'error';
  toolUseID?: string;            // Associated tool use ID
}
```

**Key Insights:**
- **Message Boundaries**: Assistant entries with the same `message.id` are parts of one response
- **Tool Pattern**: Tool uses in assistant entries, results in subsequent user entries
- **Conversation Chain**: Follow `parentUuid` to traverse conversation order
- **Session Consistency**: `sessionId` stays constant for entire conversation

#### Example JSONL Entries

Here are actual examples from a transcript:

```jsonl
// Assistant entries with tool uses
{"type":"assistant","message":{"id":"msg_01...","role":"assistant","content":[{"type":"tool_use","name":"Edit","input":{"file_path":"src/index.ts","old_string":"const foo = 1;","new_string":"const foo = 2;"}}]},"timestamp":"2025-08-13T12:58:30.044Z"}

// User entries with tool results  
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_01...","content":"File updated successfully"}]},"toolUseResult":{"filePath":"src/index.ts"},"timestamp":"2025-08-13T12:58:35.123Z"}

// System entries (hook execution results)
{"type":"system","content":"Stop [claudekit-hooks run typecheck-project] completed successfully","level":"info","toolUseID":"13d484b7-cd07-4319-8248-b56e10cc26a6","timestamp":"2025-08-13T12:58:16.459Z"}

// User message entries
{"type":"user","message":{"role":"user","content":"Please fix the bug in the login function"},"timestamp":"2025-08-13T12:58:23.099Z"}

// Assistant message entries
{"type":"assistant","message":{"role":"assistant","model":"claude-opus-4-1-20250805","content":[{"type":"text","text":"I'll fix that bug now."}]},"timestamp":"2025-08-13T12:58:30.044Z"}
```


Example of checking for recent code changes in last 5 messages:
```typescript
// Parse transcript to find code changes in recent messages
let messageCount = 0;
const targetMessages = 5;

for (let i = lines.length - 1; i >= 0 && messageCount < targetMessages; i--) {
  const line = lines[i];
  if (!line) continue;
  
  try {
    const entry = JSON.parse(line);
    
    // Count conversation turns
    if (entry.type === 'user' || entry.type === 'assistant') {
      messageCount++;
    }
    
    // Check for tool uses in assistant messages
    if (entry.type === 'assistant' && entry.message?.content) {
      for (const content of entry.message.content) {
        if (content.type === 'tool_use' && 
            ['Edit', 'Write', 'MultiEdit'].includes(content.name)) {
          const filePath = content.input?.file_path;
          // Check if it's a code file...
          if (filePath?.endsWith('.ts') || filePath?.endsWith('.js')) {
            return true; // Found code change in recent messages
          }
        }
      }
    }
  } catch {
    // Skip invalid lines
  }
}
```

## Hook Results

Return an object with:

- `exitCode`: 
  - `0` for success
  - `2` to block the operation with an error
- `suppressOutput`: Optional boolean to suppress output
- `jsonResponse`: Optional JSON data to return

## Utility Methods

BaseHook provides these utilities:

- `this.progress(message)`: Show progress message
- `this.success(message)`: Show success message
- `this.warning(message)`: Show warning message
- `this.error(title, details, instructions)`: Show formatted error
- `this.shouldSkipFile(filePath, extensions)`: Check if file should be skipped
- `this.execCommand(command, args, options)`: Execute shell commands
- `this.fileExists(path)`: Check if file exists
- `this.readFile(path)`: Read file contents

## Testing Your Hook

1. Build the project: `npm run build`
2. Test directly: `echo '{"tool_input": {"file_path": "/path/to/file.ts"}}' | claudekit-hooks run my-new-hook`
3. Test in Claude Code by triggering the appropriate event

## Example: TypeScript Validation Hook

```typescript
export class TypecheckChangedHook extends BaseHook {
  name = 'typecheck-changed';

  static metadata = {
    id: 'typecheck-changed',
    displayName: 'TypeScript Type Checking (Changed Files)',
    description: 'Run TypeScript type checking on file changes',
    category: 'validation' as const,
    triggerEvent: 'PostToolUse' as const,
    matcher: 'Write|Edit|MultiEdit',
    dependencies: ['typescript', 'tsc'],
  };

  async execute(context: HookContext): Promise<HookResult> {
    const { filePath, projectRoot, packageManager } = context;

    // Skip non-TypeScript files
    if (this.shouldSkipFile(filePath, ['.ts', '.tsx'])) {
      return { exitCode: 0 };
    }

    // Check if TypeScript is available
    if (!(await checkToolAvailable('tsc', 'tsconfig.json', projectRoot))) {
      this.warning('No TypeScript configuration found, skipping check');
      return { exitCode: 0 };
    }

    this.progress(`📘 Type-checking ${filePath}`);

    // Run TypeScript compiler
    const command = this.config.command ?? `${packageManager.exec} tsc --noEmit`;
    const result = await this.execCommand(command, [], { cwd: projectRoot });

    if (result.exitCode !== 0) {
      this.error('TypeScript compilation failed', result.stderr || result.stdout, [
        'Fix ALL TypeScript errors shown above',
        'Run the type check command to verify',
      ]);
      return { exitCode: 2 };
    }

    this.success('TypeScript check passed!');
    return { exitCode: 0 };
  }
}
```

## Making Hooks Configurable

To add configuration support to your hook, follow these steps:

### Step 1: Add Configuration to Schema

Edit `cli/types/claudekit-config.ts` to add your hook's configuration:

```typescript
// Add your hook's config schema (before HooksConfigurationSchema)
const MyHookConfigSchema = z.object({
  myOption: z.string().optional(),
  timeout: z.number().min(1000).max(300000).optional(),
  enabled: z.boolean().optional(),
});

// Add to HooksConfigurationSchema
const HooksConfigurationSchema = z.object({
  // ... existing hooks ...
  'my-new-hook': MyHookConfigSchema.optional(),
  // ... rest of hooks ...
});
```

### Step 2: Define Config Interface in Your Hook

```typescript
// In your hook file
interface MyHookConfig {
  myOption?: string | undefined;
  timeout?: number | undefined;
  enabled?: boolean | undefined;
}
```

**Important:** Use `| undefined` for optional properties when using `exactOptionalPropertyTypes: true` in TypeScript.

### Step 3: Load Configuration in Your Hook

Use the `getHookConfig` utility to load your hook's configuration:

```typescript
import { getHookConfig } from '../utils/claudekit-config.js';

export class MyNewHook extends BaseHook {
  private loadConfig(): MyHookConfig {
    return getHookConfig<MyHookConfig>('my-new-hook') ?? {};
  }

  async execute(context: HookContext): Promise<HookResult> {
    const config = this.loadConfig();
    const myOption = config.myOption ?? 'default-value';
    const timeout = config.timeout ?? 30000;
    
    // Use your configuration values
    // ...
  }
}
```

The `getHookConfig` utility handles:
- Loading the `.claudekit/config.json` file
- Validating the configuration with Zod
- Returning your hook's specific configuration
- Graceful fallback to empty object if not found

### Step 4: Document Configuration Options

1. Create an example config file `.claudekit/config.json.example`:

```json
{
  "hooks": {
    "my-new-hook": {
      "myOption": "value",
      "timeout": 30000,
      "enabled": true
    }
  }
}
```

2. Update README.md to document the configuration:

```markdown
### Hook Configuration

Some hooks support additional configuration through `.claudekit/config.json`:

- **my-new-hook.myOption**: Description of what this option does (default: "default-value")
- **my-new-hook.timeout**: Maximum execution time in milliseconds (default: 30000)
- **my-new-hook.enabled**: Enable/disable the hook (default: true)
```

### Step 5: Build and Test

```bash
npm run build
```

Test with a config file:
```bash
# Create test config
cat > .claudekit/config.json << EOF
{
  "hooks": {
    "my-new-hook": {
      "myOption": "test-value"
    }
  }
}
EOF

# Test the hook
echo '{}' | claudekit-hooks run my-new-hook
```

### Common Configuration Patterns


#### Command Override Configuration
```typescript
const MyHookConfigSchema = z.object({
  command: z.string().optional(),
});

// In execute():
const command = config.command ?? 'default-command';
```

#### File Pattern Configuration
```typescript
const MyHookConfigSchema = z.object({
  targetPatterns: z.array(z.string()).optional(), // Supports glob patterns with ! for negation
});
```

### Preventing Duplicate Hook Triggers

For Stop hooks that should only trigger once per set of changes, use marker-based detection: include a unique marker in your hook's output, then check for that marker in the transcript on subsequent runs to avoid duplicate triggers for the same changes.

### Configuration Best Practices

1. **Always provide defaults** - Hooks should work without configuration
2. **Validate ranges** - Use Zod's min/max for numeric values
3. **Use proper types** - Avoid `any`, use specific interfaces
4. **Document defaults** - Clearly state default values in documentation
5. **Test both cases** - Test with and without configuration
6. **Fail gracefully** - If config is invalid, use defaults and continue

## Previous Process (Historical Reference)

Previously, adding a hook required changes in 8 different places:
1. Hook Implementation
2. Hook Registry  
3. Hook Index
4. Hook Runner
5. CLI List Command (2 places)
6. Setup Command  
7. Component Registry
8. Tests