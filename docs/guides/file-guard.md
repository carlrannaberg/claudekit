# File Guard: Protecting Sensitive Files from AI Access

## Overview

The file-guard hook automatically prevents AI assistants from accessing sensitive files like environment variables, API keys, certificates, and credentials. It runs before any file access operation and blocks access to files that match protection patterns.

**Key Benefits:**
- **Automatic protection** - No manual oversight needed
- **Comprehensive defaults** - Protects common sensitive file types out-of-the-box
- **Customizable** - Add your own patterns via `.agentignore`
- **Non-intrusive** - Only blocks access, doesn't modify files

## Installation

```bash
# Install claudekit (if not already installed)
npm install -g claudekit

# Add file-guard hook to your project
claudekit setup --yes --force --hooks file-guard
```

This will:
- Add file-guard hook to your `.claude/settings.json` (PreToolUse event)
- Apply default protection patterns automatically
- Merge with any existing configuration (won't overwrite other hooks)

## How It Works

### Architecture

```
┌─────────────────────────────────────────────┐
│          File Access Request               │
│   Read, Edit, Write, MultiEdit, Bash       │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         file-guard Hook (PreToolUse)       │
│  • Checks file paths against patterns      │
│  • Parses Bash commands for file access    │
│  • Handles shell variable expansion        │
│  • Loads .agentignore or uses defaults     │
│  • Returns permit/deny decision            │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│              Result                         │
│    PERMIT: File access allowed             │
│    DENY: "File access blocked" message     │
└─────────────────────────────────────────────┘
```

### Protection Sources (Priority Order)

1. **Project .agentignore** - Custom patterns for your project
2. **Global .aiignore** - Patterns for all projects
3. **Default patterns** - Built-in protection for common sensitive files

### Bash Command Protection

File-guard analyzes Bash commands for file access patterns, including:

**Direct file access:**
```bash
cat .env                    # ❌ Blocked
head -5 config/secrets.yml  # ❌ Blocked
```

**Variable-based bypass attempts:**
```bash
FILE=.env; cat $FILE                    # ❌ Blocked
FILENAME=".env" && cat "$FILENAME"      # ❌ Blocked
E="env"; cat ".$E"                      # ❌ Blocked
```

**Legitimate files allowed:**
```bash
FILE=README.md; cat $FILE               # ✅ Allowed
head package.json                       # ✅ Allowed
```

The hook parses shell variable assignments and expansions to prevent sophisticated bypass attempts while allowing normal file operations.

## Configuration

### Custom Protection (.agentignore)

Create `.agentignore` in your project root:

```gitignore
# .agentignore - Custom protection patterns

# Environment files
.env
.env.*
config/secrets.yml

# Keys and certificates  
*.key
*.pem
*.crt

# Cloud credentials
.aws/credentials
.gcp/service-account.json

# Database files
*.sqlite3
production.db

# Allow example files
!.env.example
!config.sample.yml
```

### Pattern Syntax

Uses `.gitignore` syntax:
- `*.env` - All files ending in .env
- `.aws/**` - All files in .aws directory
- `!public.key` - Explicitly allow this file (negation)
- `# comment` - Comments for documentation

## Default Protection Patterns

When no `.agentignore` exists, file-guard protects:

**Environment & Config:**
- `.env`, `.env.*`, `*.env`
- `.npmrc`, `.pypirc`

**Keys & Certificates:**
- `*.key`, `*.pem`, `*.crt`
- `.ssh/**`, `id_rsa*`, `id_ed25519*`

**Cloud & Auth:**
- `.aws/**`, `.azure/**`, `.gcloud/**`
- `.docker/config.json`, `.kube/**`
- `.netrc`, `.git-credentials`

**Databases:**
- `production.db`, `prod*.db`, `*.sqlite3`
- `.pgpass`, `.my.cnf`

**Tokens & Secrets:**
- `*.token`, `token.*`, `secrets.*`
- `wallet.dat`, `*.wallet`

For complete list, see [`cli/hooks/sensitive-patterns.ts`](../../cli/hooks/sensitive-patterns.ts).

## Usage Examples

### Basic Protection
```bash
# Install and it works automatically
claudekit setup --yes --force --hooks file-guard

# Try to access protected file
# Claude Code will show: "File access blocked for security reasons"
```

### Custom Patterns
```bash
# Create project-specific protection
echo "api-keys.json" >> .agentignore
echo "private/**" >> .agentignore

# Test protection
echo '{"tool_name":"Read","tool_input":{"file_path":"api-keys.json"}}' | \
  claudekit-hooks run file-guard
# Output: {"permissionDecision": "deny"}
```

### Allow Exceptions  
```bash
# In .agentignore - protect all .env but allow example
.env*
!.env.example
```

## What Users See

When file-guard blocks access, users see:

```
🛡️ File access blocked for security reasons

The file 'config/secrets.yml' matches protection patterns in .agentignore.

If you need to access this file:
1. Review if it contains sensitive data
2. Add exception: !config/secrets.yml  
3. Or create sanitized copy for AI review
```

## Troubleshooting

### Hook Not Running
Check if hook is configured:
```bash
claudekit list hooks | grep file-guard
```

If missing, reinstall:
```bash
claudekit setup --yes --force --hooks file-guard
```

### Files Not Protected
Check pattern syntax in `.agentignore`:
```bash
# Test a specific file
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
  claudekit-hooks run file-guard

# Should output: {"permissionDecision": "deny"}
```

### Allow Specific Files
Add negation pattern to `.agentignore`:
```gitignore
# Block all .env files
.env*

# But allow example files  
!.env.example
!.env.template
```

### False Positives
If legitimate files are blocked, add exceptions:
```gitignore
# Your existing patterns
*.key

# Allow specific legitimate files
!public.key
!ssl/public.key
```

## Key Design Decisions

### Why PreToolUse Hook?
- **Prevention over reaction** - Blocks access before it happens
- **Universal coverage** - Works with Read, Edit, Write, MultiEdit, and Bash tools
- **Transparent operation** - Clear feedback when files are blocked

### Why .agentignore Format?
- **Familiar syntax** - Same as .gitignore patterns
- **Git integration** - Can be versioned and shared with team
- **Flexible** - Supports complex patterns and negations

### Why Defaults When No Config?
- **Zero-configuration security** - Works out of the box
- **Covers common cases** - Protects typical sensitive files
- **Overridable** - Creating .agentignore gives full control

## Limitations

- **Pattern-based protection** - Can't detect sensitive content in arbitrary files
- **Path matching** - Doesn't scan file contents for secrets
- **Complex shell constructs** - Advanced bash features may bypass detection
- **Project-scoped** - Each project needs separate .agentignore configuration
- **No encryption** - Blocked files remain on disk, just not accessible to AI
- **Claude Code only** - Protection only applies when using claudekit hooks

## Learn More

- [Sensitive Patterns Source](../../cli/hooks/sensitive-patterns.ts) - Complete default pattern list
- [Hook Configuration](../reference/hooks.md) - Advanced hook setup
