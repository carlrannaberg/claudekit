# Codebase Map Hooks: Automated Project Context

## Overview

Claudekit includes intelligent codebase mapping that automatically provides AI assistants with project context at the start of each session and keeps the context updated as files change. The codebase-map system uses two complementary hooks to ensure Claude always has up-to-date understanding of your project structure, code relationships, and architectural patterns.

**Key Benefits:**
- **Automatic context** - No need to manually explain your project structure
- **Session-aware** - Provides context once per session, avoiding repetition  
- **Live updates** - Keeps the map current as you modify files
- **Configurable filtering** - Focus on relevant parts of your codebase
- **Multiple formats** - Choose the best representation for your project

## Quick Start

### New to Claudekit?

Install claudekit with codebase-map and enable both hooks with a single command:

```bash
npm install -g claudekit codebase-map && claudekit setup --yes --force --hooks codebase-map,codebase-map-update
```

### Already Have Claudekit?

Add codebase-map CLI and hooks to your existing project:

```bash
npm install -g codebase-map && claudekit setup --yes --force --hooks codebase-map,codebase-map-update
```

### Manual Configuration

You can manually add both hooks to `.claude/settings.json`. Choose one of these options:

**Option 1: SessionStart (Visible to Users)**

✅ **Pros:**
- No character limit (full output allowed)
- Claude gets complete context without truncation
- Transparent about what context Claude has

❌ **Cons:**
- Long DSL output visible at the start of each session
- Takes up significant visual space in the UI
- Can be distracting or overwhelming for users

**Best for:** When you need the full codebase context without any truncation risk and don't mind the visual clutter.

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run codebase-map"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run codebase-map-update"
          }
        ]
      }
    ]
  }
}
```

**Option 2: UserPromptSubmit (Hidden from Users)**

✅ **Pros:**
- Completely invisible to users (clean UI)
- Claude still gets the context automatically
- No visual clutter at session start
- Works seamlessly in the background

❌ **Cons:**
- Subject to 10,000 character limit (shared with other UserPromptSubmit hooks)
- May require configuration to stay under limit
- Must implement 9,000 char self-limit to leave room for other hooks

**Best for:** Most users who want a clean experience and have configured their codebase-map to stay under 9,000 characters.

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run codebase-map"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run codebase-map-update"
          }
        ]
      }
    ]
  }
}
```

### How to Choose Between SessionStart and UserPromptSubmit

**Choose SessionStart if:**
- Your codebase-map output exceeds 9,000 characters
- You want to verify the context is being loaded
- You're debugging or teaching

**Choose UserPromptSubmit if:**
- You prefer a clean, distraction-free UI (recommended for most users)
- Your codebase-map output is under 9,000 characters
- You've configured includes/excludes to optimize output size

**To check your output size:**
```bash
codebase-map scan && codebase-map format --format dsl | wc -c
```

If the result is over 9,000, either use SessionStart or configure filtering (see Configuration section below).

## Staying Under the 9,000 Character Limit

When using UserPromptSubmit hooks, Claude Code has a 10,000 character limit for all combined context. The codebase-map hook self-limits to 9,000 characters to leave room for other hooks (like thinking-level).

### Check Your Output Size

Create a simple script to monitor your codebase-map size:

```bash
#!/usr/bin/env bash
# save as: check-map-size.sh

# Test your current configuration
SIZE=$(codebase-map format --format dsl 2>/dev/null | wc -c | tr -d ' ')

echo "Codebase-map output: $SIZE characters"

if [ "$SIZE" -lt 9000 ]; then
  echo "✅ Under limit ($(( 9000 - SIZE )) chars available)"
else
  echo "❌ Over limit by $(( SIZE - 9000 )) chars"
fi
```

### Size Optimization Strategies

#### 1. Start Small, Add Gradually

Begin with core directories and expand as needed:

```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/**"],           // Start with just src
      "exclude": ["**/*.test.*"],
      "format": "dsl"
    }
  }
}
```

Check size, then add more:

```bash
# Test with just src
codebase-map format --format dsl --include "src/**" --exclude "**/*.test.*" 2>/dev/null | wc -c

# If under limit, add more directories
codebase-map format --format dsl --include "src/**" --include "lib/**" --exclude "**/*.test.*" 2>/dev/null | wc -c
```

#### 2. Common Size-Saving Exclusions

Add these to your exclude patterns to significantly reduce size:

```json
{
  "hooks": {
    "codebase-map": {
      "exclude": [
        "**/*.test.*",        // Test files
        "**/*.spec.*",        // Spec files
        "**/tests/**",        // Test directories
        "**/dist/**",         // Build output
        "**/build/**",        // Build directories
        "**/coverage/**",     // Test coverage
        "**/*.min.js",        // Minified files
        "**/vendor/**",       // Third-party code
        "**/node_modules/**", // Dependencies
        "**/__tests__/**",    // Jest test folders
        "**/__mocks__/**",    // Mock files
        "**/examples/**",     // Example code
        "**/*.md",            // Documentation
        "**/*.json"           // Config files
      ]
    }
  }
}
```

#### 3. Format Selection for Size Reduction

If DSL format is too large, consider these smaller alternatives:

- **Tree format**: ~75% smaller than DSL - Shows directory structure only
- **Graph format**: ~15% smaller than DSL - Shows dependency relationships

```bash
# Compare sizes
echo "DSL format (baseline):"
codebase-map format --format dsl 2>/dev/null | wc -c

echo "Graph format (15% smaller):"
codebase-map format --format graph 2>/dev/null | wc -c

echo "Tree format (75% smaller):"
codebase-map format --format tree 2>/dev/null | wc -c
```

Tree format is the most compact, ideal when you need maximum size reduction. Graph format provides a middle ground, preserving dependency information while saving some space.

#### 4. Framework-Specific Optimizations

**React Project (~5-7K chars)**
```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/components/**", "src/hooks/**", "src/utils/**"],
      "exclude": ["**/*.test.*", "**/*.stories.*", "**/node_modules/**"],
      "format": "dsl"
    }
  }
}
```

**Node.js API (~6-8K chars)**
```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/routes/**", "src/models/**", "src/middleware/**"],
      "exclude": ["**/*.test.*", "**/dist/**"],
      "format": "tree"  // Tree often better for APIs
    }
  }
}
```

**Large Monorepo (Focus on current package)**
```json
{
  "hooks": {
    "codebase-map": {
      "include": ["packages/current-package/src/**"],
      "exclude": ["**/*.test.*", "**/node_modules/**"],
      "format": "tree"
    }
  }
}
```

### Testing Multiple Include Patterns

When testing configurations with the CLI, use separate `--include` flags:

```bash
# ✅ CORRECT - Multiple --include flags
codebase-map format --format dsl \
  --include "src/**" \
  --include "lib/**" \
  --exclude "**/*.test.*"

# ❌ WRONG - Comma-separated (doesn't work)
codebase-map format --format dsl \
  --include "src/**,lib/**" \
  --exclude "**/*.test.*"
```

### Quick Size Reduction Checklist

If your output is over 9,000 characters:

1. **Remove test files**: Add `**/*.test.*`, `**/*.spec.*` to excludes
2. **Remove documentation**: Add `**/*.md` to excludes
3. **Focus on source only**: Change include from `**` to `src/**`
4. **Switch to tree format**: Change `"format": "dsl"` to `"format": "tree"`
5. **Exclude generated code**: Add `dist/**`, `build/**`, `coverage/**`
6. **Remove examples**: Add `examples/**`, `demos/**` to excludes

### Monitoring in Production

Add this to your package.json for easy monitoring:

```json
{
  "scripts": {
    "check:map-size": "codebase-map format --format dsl 2>/dev/null | wc -c",
    "check:map": "codebase-map format --format dsl | head -50"
  }
}
```

Then check regularly:

```bash
npm run check:map-size  # Shows character count
npm run check:map       # Shows first 50 lines of output
```

### Install codebase-map CLI

The hooks require the `codebase-map` CLI tool:

```bash
npm install -g codebase-map
# or
npm install --save-dev codebase-map
```

### Verify Setup

Test that codebase-map is working:

```bash
# Check if hooks are configured
claudekit list hooks | grep codebase-map

# Test the CLI tool directly
codebase-map scan
codebase-map format --format dsl
```

## How It Works

The codebase-map system consists of two complementary hooks:

### 1. Codebase Map Hook (`codebase-map`)
- **Trigger**: `SessionStart` or `UserPromptSubmit` (beginning of each session)
- **Purpose**: Provides initial project context to Claude
- **Behavior**: 
  - Runs once per session (tracked by session ID)
  - Scans entire project to build/update index
  - Formats and outputs context based on configuration
  - Skips if context already provided for current session
- **Context Visibility**:
  - `SessionStart`: Visible to users (wrapped in `<session-start-hook>` tags)
  - `UserPromptSubmit`: Hidden from users (only Claude sees it)

### 2. Codebase Map Update Hook (`codebase-map-update`)
- **Trigger**: `PostToolUse` after Write, Edit, or MultiEdit
- **Purpose**: Keeps the codebase map current as files change
- **Behavior**:
  - Updates index for modified TypeScript/JavaScript files
  - Debounced (5-second cooldown) to avoid excessive updates
  - Only processes code files (.ts, .tsx, .js, .jsx, .mjs, .cjs)
  - Silently skips if index doesn't exist

### Workflow Example

```bash
# 1. Start new Claude session
# → codebase-map hook triggers
# → Scans project and provides context: "📍 Codebase Map (loaded once per session)"

# 2. Edit a TypeScript file
# → codebase-map-update hook triggers  
# → Updates index for the modified file (silent)

# 3. Start new session later
# → codebase-map hook triggers again
# → Provides updated context reflecting recent changes
```

## Configuration

### Hook Configuration in .claude/settings.json

The hooks must be configured in your project's `.claude/settings.json`:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run codebase-map"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "claudekit-hooks run codebase-map-update"
          }
        ]
      }
    ]
  }
}
```

### Alternative Configuration Options

#### Only Initial Context (No Updates)
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [{"type": "command", "command": "claudekit-hooks run codebase-map"}]
      }
    ]
  }
}
```

#### Only Updates (Manual Initial Context)
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit", 
        "hooks": [{"type": "command", "command": "claudekit-hooks run codebase-map-update"}]
      }
    ]
  }
}
```

#### With Other Hooks
```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run codebase-map"},
          {"type": "command", "command": "claudekit-hooks run another-hook"}
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {"type": "command", "command": "claudekit-hooks run typecheck-changed"},
          {"type": "command", "command": "claudekit-hooks run codebase-map-update"}
        ]
      }
    ]
  }
}
```

## Customization

### Filtering Configuration in .claudekit/config.json

Customize what files are included in the codebase map by creating `.claudekit/config.json`:

```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/**", "lib/**", "components/**"],
      "exclude": ["**/*.test.ts", "**/*.spec.ts", "**/node_modules/**"],
      "format": "dsl"
    }
  }
}
```

#### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | string[] | All files | Glob patterns for files to include |
| `exclude` | string[] | `[]` | Glob patterns for files to exclude |
| `format` | string | `"auto"` | Output format (see Available Formats) |

#### Pattern Examples

```jsonc
{
  "hooks": {
    "codebase-map": {
      "include": [
        "src/**",           // All files in src directory
        "lib/**/*.ts",      // Only TypeScript files in lib
        "components/**"     // All files in components
      ],
      "exclude": [
        "**/*.test.*",      // All test files
        "**/*.spec.*",      // All spec files
        "**/tests/**",      // Tests directory
        "**/*.md",          // Markdown files
        "**/dist/**",       // Build output
        "**/node_modules/**" // Dependencies
      ],
      "format": "dsl"
    }
  }
}
```

### Framework-Specific Configurations

#### React Project
```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/**", "components/**", "hooks/**", "utils/**"],
      "exclude": ["**/*.test.*", "**/*.stories.*", "**/node_modules/**"],
      "format": "dsl"
    }
  }
}
```

#### Node.js API
```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/**", "lib/**", "routes/**", "models/**"],
      "exclude": ["**/*.test.*", "**/logs/**", "**/uploads/**"],
      "format": "tree"
    }
  }
}
```

#### Monorepo
```json
{
  "hooks": {
    "codebase-map": {
      "include": ["packages/*/src/**", "apps/*/src/**"],
      "exclude": ["**/node_modules/**", "**/dist/**", "**/*.test.*"],
      "format": "tree"
    }
  }
}
```

## Available Formats

The codebase-map tool supports multiple output formats optimized for different use cases:

### DSL Format (Recommended)
Shows code relationships, imports, exports, functions, and classes:

```bash
codebase-map format --format dsl
```

**Output example:**
```
cli/hooks/base.ts > @types/node
cli/hooks/codebase-map.ts > cli/hooks/base.js, cli/utils/claudekit-config.js
  class CodebaseMapHook extends BaseHook
  class CodebaseMapUpdateHook extends BaseHook
cli/utils/claudekit-config.ts > node:path, node:fs/promises
  function getHookConfig<T>(hookName: string): T | undefined
```

**Best for**: Understanding code architecture and dependencies

### Tree Format
Shows directory and file structure:

```bash
codebase-map format --format tree
```

**Output example:**
```
cli/
├── hooks/
│   ├── base.ts
│   ├── codebase-map.ts
│   └── utils.ts
├── utils/
│   ├── claudekit-config.ts
│   └── installer.ts
└── cli.ts
```

**Best for**: Understanding project organization and file locations

### Markdown Format
Comprehensive documentation-style output:

```bash
codebase-map format --format markdown
```

**Best for**: Documentation generation and detailed overviews

### JSON Format
Structured data for programmatic use:

```bash
codebase-map format --format json
```

**Best for**: Custom tooling and analysis scripts

### Graph Format
Dependency relationships in graph notation:

```bash
codebase-map format --format graph
```

**Best for**: Visualizing complex dependency relationships

### Auto Format (Default)
Automatically selects the best format based on project characteristics:

```bash
codebase-map format --format auto
```

**Logic**:
- DSL for TypeScript/JavaScript projects with complex relationships
- Tree for simple projects or when DSL would be too verbose
- Markdown for projects with extensive documentation

## Using the CLI

The codebase-map CLI can be used directly for manual operations:

### Basic Commands

```bash
# Scan project and create/update index
codebase-map scan

# Format and display the map
codebase-map format --format dsl

# Update index for a specific file
codebase-map update src/components/App.tsx

# List all files in the index
codebase-map list
```

### Advanced Usage

```bash
# Format with filtering
codebase-map format --format tree --include "src/**" --exclude "**/*.test.ts"

# Show statistics
codebase-map format --stats --format dsl

# Multiple include patterns
codebase-map format --include "src/**" "lib/**" --exclude "**/*.spec.ts"
```

### Integration with Development Workflow

```bash
# In package.json scripts
{
  "scripts": {
    "map": "codebase-map scan && codebase-map format --format dsl",
    "map:tree": "codebase-map format --format tree",
    "map:update": "codebase-map scan"
  }
}

# Use in CI/CD for documentation
codebase-map format --format markdown > ARCHITECTURE.md
```

## Best Practices

### 1. Choose the Right Format for Your Project

**DSL Format** - Use for:
- TypeScript/JavaScript projects
- Complex codebases with many interdependencies
- When you want Claude to understand code relationships

**Tree Format** - Use for:
- Simple projects or prototypes  
- When file organization is more important than code relationships
- Configuration-heavy projects

**Markdown Format** - Use for:
- Documentation generation
- Sharing project overviews
- Complex projects needing detailed explanations

### 2. Configure Appropriate Filtering

```json
{
  "hooks": {
    "codebase-map": {
      "include": ["src/**", "lib/**"],     // Focus on source code
      "exclude": [
        "**/*.test.*",                      // Exclude tests
        "**/*.spec.*", 
        "**/node_modules/**",               // Exclude dependencies
        "**/dist/**",                       // Exclude build output
        "**/*.md"                           // Exclude documentation
      ]
    }
  }
}
```

### 3. Regular Index Maintenance

```bash
# Weekly: Full rescan to catch structural changes
codebase-map scan

# Daily: Quick format to verify index health  
codebase-map format --stats
```

### 4. Team Coordination

```bash
# Add to your project README
## AI Assistant Setup

This project uses Claudekit for automatic codebase mapping.

```bash
# Install dependencies
npm install -g claudekit codebase-map

# Setup hooks (one-time)
claudekit setup --yes --force --hooks codebase-map,codebase-map-update
```
```

### 5. Monitor Hook Performance

```bash
# Check hook execution logs
tail -f ~/.claudekit/logs/hook-executions.jsonl | grep codebase-map

# Verify hooks are configured
claudekit list hooks | grep codebase-map
```

### 6. Optimize for Large Projects

For very large codebases:

```json
{
  "hooks": {
    "codebase-map": {
      "include": [
        "src/core/**",           // Focus on core modules
        "src/components/**",     // UI components
        "src/utils/**"           // Utilities
      ],
      "exclude": [
        "**/vendor/**",          // Third-party code
        "**/generated/**",       // Auto-generated code
        "**/*.min.js",          // Minified files
        "**/node_modules/**"     // Dependencies
      ],
      "format": "tree"          // Faster than DSL for large projects
    }
  }
}
```

## Troubleshooting

### Issue: "codebase-map CLI not found"

**Symptoms:**
```
codebase-map CLI not found. Install it from: https://github.com/carlrannaberg/codebase-map
```

**Solutions:**
1. **Install the CLI globally:**
   ```bash
   npm install -g codebase-map
   ```

2. **Or install locally and use npx:**
   ```bash
   npm install --save-dev codebase-map
   # CLI will automatically use npx when globally not available
   ```

3. **Check your PATH:**
   ```bash
   which codebase-map
   echo $PATH
   ```

### Issue: No Context Provided

**Symptoms:** Claude doesn't receive codebase context at session start

**Debugging steps:**
1. **Check hook is enabled:**
   ```bash
   claudekit list hooks | grep codebase-map
   ```

2. **Verify CLI is working:**
   ```bash
   codebase-map scan
   codebase-map format --format dsl
   ```

3. **Check session tracking:**
   ```bash
   ls ~/.claudekit/sessions/codebase-map-session-*.json
   ```

4. **Force new context:**
   ```bash
   # Remove session files to force context regeneration
   rm ~/.claudekit/sessions/codebase-map-session-*.json
   ```

### Issue: Updates Not Working

**Symptoms:** Map doesn't update after file changes

**Debugging steps:**
1. **Check update hook is enabled:**
   ```bash
   grep -A5 "PostToolUse" .claude/settings.json | grep codebase-map-update
   ```

2. **Verify index exists:**
   ```bash
   ls -la .codebasemap
   ```

3. **Test manual update:**
   ```bash
   codebase-map update src/example.ts
   ```

4. **Check file types:**
   ```bash
   # Update hook only processes these extensions:
   # .ts, .tsx, .js, .jsx, .mjs, .cjs
   ```

### Issue: Large Output/Performance

**Symptoms:** Context is too large or hook is slow

**Solutions:**
1. **Add filtering to reduce scope:**
   ```json
   {
     "hooks": {
       "codebase-map": {
         "include": ["src/**"],
         "exclude": ["**/*.test.*", "**/node_modules/**"]
       }
     }
   }
   ```

2. **Use tree format for large projects:**
   ```json
   {
     "hooks": {
       "codebase-map": {
         "format": "tree"
       }
     }
   }
   ```

3. **Check index size:**
   ```bash
   codebase-map list | wc -l
   ls -lh .codebasemap
   ```

### Issue: Duplicate Context

**Symptoms:** Codebase map appears multiple times in session

**Causes & Solutions:**
1. **Multiple hooks configured:**
   ```bash
   # Check for duplicates
   grep -c "codebase-map" .claude/settings.json
   ```

2. **Session tracking failure:**
   ```bash
   # Clear session files
   rm ~/.claudekit/sessions/codebase-map-session-*.json
   ```

3. **Configuration conflicts:**
   ```bash
   # Check both user and project settings
   cat ~/.claude/settings.json | grep codebase-map
   cat .claude/settings.json | grep codebase-map
   ```

### Issue: Format-Specific Problems

#### DSL Format Issues
```bash
# Check for TypeScript parsing errors
codebase-map scan --verbose
codebase-map format --format dsl --stats
```

#### Tree Format Issues  
```bash
# Verify directory structure
find . -name "*.ts" -o -name "*.js" | head -20
```

#### JSON Format Issues
```bash
# Validate JSON output
codebase-map format --format json | jq .
```

### Performance Considerations

#### Large Codebases (>10,000 files)

For very large projects, consider:

1. **Use aggressive filtering:**
   ```json
   {
     "hooks": {
       "codebase-map": {
         "include": ["src/**", "lib/**"],
         "exclude": ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**"]
       }
     }
   }
   ```

2. **Choose appropriate format:**
   - **Tree format**: Fastest, minimal parsing (best for >20,000 files)
   - **DSL format**: More detailed but slower (good for <10,000 files)
   - **JSON/YAML**: Slowest, avoid for large projects

3. **Memory usage expectations:**
   - Small projects (<1,000 files): ~50-100MB
   - Medium projects (1,000-10,000 files): ~100-300MB  
   - Large projects (>10,000 files): ~300-500MB+

4. **Performance tips:**
   - Exclude generated files (dist/, build/, coverage/)
   - Exclude dependency folders (node_modules/, vendor/)
   - Focus on source code directories only
   - Use `.codebasemap` index caching (automatic)

#### Monorepo Considerations

For monorepos, focus on specific packages:

```json
{
  "hooks": {
    "codebase-map": {
      "include": ["packages/core/**", "packages/shared/**"],
      "exclude": ["packages/*/node_modules/**", "packages/*/dist/**"]
    }
  }
}
```

### Common Configuration Errors

#### Wrong Hook Event
```json
// Wrong - SessionStart runs before tools are available
{
  "hooks": {
    "SessionStart": [
      {"matcher": "*", "hooks": [{"type": "command", "command": "claudekit-hooks run codebase-map"}]}
    ]
  }
}

// Correct - UserPromptSubmit runs when user submits first prompt
{
  "hooks": {
    "UserPromptSubmit": [
      {"matcher": "*", "hooks": [{"type": "command", "command": "claudekit-hooks run codebase-map"}]}
    ]
  }
}
```

#### Wrong Matcher Pattern
```json
// Wrong - Too specific
{
  "matcher": "UserPrompt",  // Should be "*"
  "hooks": [{"type": "command", "command": "claudekit-hooks run codebase-map"}]
}

// Correct - Universal matcher
{
  "matcher": "*",
  "hooks": [{"type": "command", "command": "claudekit-hooks run codebase-map"}]
}
```

## Migration and Integration

### From Manual Context Provision

If you've been manually explaining your project structure:

**Before:**
```
This is a React project with:
- src/ for source code
- components/ for UI components  
- utils/ for utilities
- The main app is in src/App.tsx
```

**After:** Automatic context from codebase-map hooks - no manual explanation needed!

### Migrating Existing Projects

```bash
# 1. Install required tools
npm install -g claudekit codebase-map

# 2. Add hooks to existing project
claudekit setup --yes --force --hooks codebase-map,codebase-map-update

# 3. Configure filtering (optional)
echo '{
  "hooks": {
    "codebase-map": {
      "include": ["src/**"],
      "exclude": ["**/*.test.*"],
      "format": "dsl"
    }
  }
}' > .claudekit/config.json

# 4. Test the setup
codebase-map scan
codebase-map format --format dsl
```

### Integration with CI/CD

```yaml
# .github/workflows/update-docs.yml
- name: Update Architecture Documentation
  run: |
    npm install -g codebase-map
    codebase-map scan
    codebase-map format --format markdown > docs/ARCHITECTURE.md
    
- name: Validate Codebase Map
  run: |
    npm install -g codebase-map
    codebase-map scan
    codebase-map format --format json > /dev/null  # Validate JSON output
```

### Team Onboarding Script

Create `scripts/setup-dev.sh`:

```bash
#!/bin/bash
echo "Setting up development environment..."

# Install Claudekit and codebase-map
npm install -g claudekit codebase-map

# Setup hooks
claudekit setup --yes --force --hooks codebase-map,codebase-map-update

# Initial scan
codebase-map scan

echo "✅ Development environment ready!"
echo "Claude will now automatically understand your project structure."
```

## Advanced Use Cases

### Custom Format Selection

```json
{
  "hooks": {
    "codebase-map": {
      "format": "auto",  // Let codebase-map choose
      "include": ["src/**"],
      "exclude": ["**/*.test.*"]
    }
  }
}
```

### Multi-Project Workspace

For monorepos or multi-project setups:

```json
{
  "hooks": {
    "codebase-map": {
      "include": [
        "packages/core/src/**",
        "packages/ui/src/**", 
        "apps/web/src/**"
      ],
      "exclude": ["**/node_modules/**", "**/*.test.*"],
      "format": "tree"
    }
  }
}
```

### Conditional Context

Different contexts for different scenarios:

```bash
# Development context (detailed)
export CODEBASE_MAP_FORMAT=dsl
claudekit setup --hooks codebase-map

# Production context (minimal)
export CODEBASE_MAP_FORMAT=tree
claudekit setup --hooks codebase-map
```

### Integration with Other Tools

```bash
# Generate documentation
codebase-map format --format markdown | pandoc -o ARCHITECTURE.pdf

# Create dependency graph
codebase-map format --format graph | dot -Tpng -o deps.png

# Export for analysis
codebase-map format --format json | jq '.files[] | .path' > file-list.txt
```

## Understanding the Output

### What Claude Sees

When the codebase-map hook runs, Claude receives context like this:

#### DSL Format (Default - Best for Understanding Code)

```
📍 Codebase Map (loaded once per session):

# Legend: fn=function cl=class cn=constant m=methods p=properties

cli/hooks/base.ts > @types/node
  cl BaseHook(11m,3p)
    abstract execute(context: HookContext): Promise<HookResult>
    abstract validate(input: unknown): boolean
    
cli/hooks/codebase-map.ts > cli/hooks/base, cli/utils/claudekit-config
  cl CodebaseMapHook(5m,3p) extends BaseHook
  cl CodebaseMapUpdateHook(2m,4p) extends BaseHook
  
cli/utils/config.ts > node:path, node:fs/promises  
  fn loadConfig(): Config async
  fn saveConfig(config: Config): Promise<void> async
  cn DEFAULT_CONFIG: Config
```

The DSL format shows:
- File paths with their imports/dependencies
- Classes with method/property counts
- Functions with signatures and async markers
- Constants and their types
- Inheritance relationships

#### Tree Format (Best for Directory Structure)

```
📍 Codebase Map (loaded once per session):

cli/
├── hooks/
│   ├── base.ts (361 lines)
│   ├── codebase-map.ts (245 lines)
│   ├── check-todos.ts (89 lines)
│   └── utils.ts (178 lines)
├── utils/
│   ├── config.ts (156 lines)
│   └── logger.ts (203 lines)
└── cli.ts (412 lines)

7 files, 1644 lines total
```

The tree format shows:
- Directory hierarchy
- File names with line counts
- Total statistics

#### Markdown Format (Best for Documentation)

```
📍 Codebase Map (loaded once per session):

## Project Structure

### Core Hooks (`cli/hooks/`)
- **base.ts** - Abstract base class for all hooks
- **codebase-map.ts** - Codebase mapping implementation
- **check-todos.ts** - TODO validation hook

### Utilities (`cli/utils/`)
- **config.ts** - Configuration management
- **logger.ts** - Logging utilities

### Main Entry
- **cli.ts** - CLI application entry point
```

### Silent Updates

The `codebase-map-update` hook runs silently in the background when you modify files. It:
- Updates the `.codebasemap` index file without any output
- Debounces updates (waits 5 seconds between updates to avoid excessive processing)
- Only processes TypeScript/JavaScript files (.ts, .tsx, .js, .jsx, .mjs, .cjs)
- Ensures the next session has an up-to-date map without interrupting your workflow

No messages are shown to avoid cluttering the conversation.

---

## Summary

Claudekit's codebase mapping provides:

✅ **Automatic context** - No manual project explanations needed  
✅ **Session awareness** - Loads once per session, avoids repetition  
✅ **Live updates** - Keeps context current as files change  
✅ **Configurable filtering** - Focus on relevant code  
✅ **Multiple formats** - Choose the best representation  
✅ **Performance optimization** - Debounced updates and selective processing  
✅ **Team-friendly** - Easy setup and consistent experience  

The two-hook system ensures Claude always has current, comprehensive understanding of your project without manual intervention or performance overhead.

For questions or issues, see the [troubleshooting section](#troubleshooting) or check our [GitHub Issues](https://github.com/carlrannaberg/claudekit/issues).