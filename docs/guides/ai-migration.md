# AGENTS.md Migration Command

The `/agents-md:migration` command helps you migrate to the [AGENTS.md standard](https://agents.md) - a universal configuration format for AI coding assistants.

## Installation

```bash
# Install claudekit globally
npm install -g claudekit

# Initialize commands in your project
claudekit setup --yes --force --commands agents-md
```

## Supported AI Assistants

The command creates symlinks for the following AI tools:

| AI Assistant | Config File | Symlink Target |
|-------------|------------|----------------|
| Claude Code | CLAUDE.md | → AGENTS.md |
| Cline | .clinerules | → AGENTS.md |
| Cursor | .cursorrules | → AGENTS.md |
| Windsurf | .windsurfrules | → AGENTS.md |
| GitHub Copilot | .github/copilot-instructions.md | → ../AGENTS.md |
| Replit | .replit.md | → AGENTS.md |
| Gemini CLI | GEMINI.md | → AGENTS.md |
| Legacy Support | AGENT.md | → AGENTS.md |
| Firebase Studio | .idx/airules.md | → ../AGENTS.md |

## How It Works

1. **Analyzes existing config files** in priority order:
   - CLAUDE.md
   - .clinerules
   - .cursorrules
   - .windsurfrules
   - .github/copilot-instructions.md
   - .replit.md
   - GEMINI.md

2. **Handles content intelligently**:
   - **Single file**: Moves to AGENTS.md
   - **Multiple identical files**: Keeps one, symlinks others
   - **Different content**: Offers merge options (auto-merge, backup, selective, manual)

3. **Creates symlinks** for all supported AI assistants pointing to AGENTS.md

4. **Creates necessary directories** (.github, .idx) if needed for certain tools

## Usage Examples

### Simple Migration
```bash
# Single config file exists
/agents-md:migration
# Result: Moves to AGENTS.md, creates all symlinks
```

### Conflict Resolution
When multiple config files with different content exist:
```bash
/agents-md:migration
# Shows differences and offers options:
# 1. Auto-merge - Combine all unique content
# 2. Backup - Keep primary, backup others as .bak
# 3. Selective - Choose which sections to include
# 4. Manual - Step-by-step merge assistance
```

### Existing AGENTS.md
```bash
# Creates any missing symlinks without modifying AGENTS.md
/agents-md:migration
```

## Benefits

- **Single Source of Truth**: One file to maintain instead of 10+
- **Automatic Updates**: Change AGENTS.md and all AI tools see the updates
- **Future Proof**: New AI tools can be added without changing existing content
- **Version Control Friendly**: Track changes in one file instead of many

## Git Integration

After successful migration, the command:
- Shows git status including new AGENTS.md and any .bak files
- Identifies which files were created, modified, or backed up
- Suggests reviewing backup files before deletion
- Recommends appropriate git commands for staging changes

Example output guidance the command provides:
```
✓ Migration complete! Next steps:

1. Review changes:
   git status
   
2. Check backup files (if any):
   ls -la *.bak
   
3. Stage and commit:
   git add AGENTS.md CLAUDE.md .clinerules .cursorrules
   git commit -m "feat: adopt AGENTS.md standard"
```

## Key Features

### Smart Content Merging
- Detects identical files and deduplicates automatically
- Offers merge strategies for different content
- Creates backups (.bak) when needed
- Preserves important sections from all configs

### Conflict Resolution
- Shows clear differences between files
- Provides multiple resolution options
- Guides through manual merging if needed
- Never loses data (creates backups)

## Limitations

- Symlinks may not work on some Windows systems without developer mode
- Manual merge may be needed for significantly different configs
- Some tools may cache old config files (restart may be needed)

## Learn More

Visit [agents.md](https://agents.md) for the full AGENTS.md specification and best practices.