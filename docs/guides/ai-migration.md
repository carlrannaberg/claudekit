# AGENTS.md Migration Command Documentation

The `/agent-migration` command helps you migrate to the [AGENTS.md standard](https://agent.md) - a universal configuration format for AI coding assistants.

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
| OpenAI Codex | GEMINI.md | → AGENTS.md |
| OpenCode | GEMINI.md | → AGENTS.md |
| Firebase Studio | .idx/airules.md | → ../AGENTS.md |

## How It Works

1. **Searches for existing config files** in priority order:
   - CLAUDE.md
   - .clinerules
   - .cursorrules
   - .windsurfrules
   - .replit.md
   - .github/copilot-instructions.md
   - GEMINI.md

2. **Moves the first found config** to AGENTS.md (if AGENTS.md doesn't already exist)

3. **Creates symlinks** for all supported AI assistants pointing to AGENTS.md

4. **Creates necessary directories** (.github, .idx) if needed for certain tools

## Usage Examples

### New Project
If you're starting fresh with CLAUDE.md:
```bash
# Before: CLAUDE.md exists
/agent-migration
# After: AGENTS.md exists with symlinks from all AI config files
```

### Existing AGENTS.md
If AGENTS.md already exists:
```bash
# Creates any missing symlinks without modifying AGENTS.md
/agent-migration
```

### Migration from Other Tools
If you have .cursorrules but no CLAUDE.md:
```bash
# Moves .cursorrules to AGENTS.md and creates all symlinks
/agent-migration
```

## Benefits

- **Single Source of Truth**: One file to maintain instead of 10+
- **Automatic Updates**: Change AGENTS.md and all AI tools see the updates
- **Future Proof**: New AI tools can be added without changing existing content
- **Version Control Friendly**: Track changes in one file instead of many

## Git Integration

After running the command, you'll typically want to:

```bash
# Add all changes
git add AGENTS.md CLAUDE.md .clinerules .cursorrules .windsurfrules .replit.md GEMINI.md .github/copilot-instructions.md .idx/airules.md

# Commit
git commit -m "Adopt AGENTS.md standard for AI assistant configuration"
```

## Troubleshooting

### Permission Denied
If you get permission errors creating symlinks:
- Check file permissions: `ls -la`
- Run with appropriate permissions

### Symlink Already Exists
The command will skip existing symlinks and only create missing ones.

### Wrong Symlink Target
If a symlink points to the wrong file:
1. Remove the incorrect symlink: `rm symlink-name`
2. Run `/agent-migration` again

## Learn More

Visit [agent.md](https://agent.md) for the full AGENTS.md specification and best practices.