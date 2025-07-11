# AGENT.md Commands Documentation

claudekit provides two commands for working with the [AGENT.md standard](https://agent.md):

## `/agent-init` - For New Projects

Use this command when starting a new project or when you want to create a fresh AGENT.md with a comprehensive template.

### What it does:
1. **Analyzes your codebase** to understand:
   - Project type and technologies
   - Build commands and scripts
   - Test frameworks and patterns
   - Code style conventions
   - Existing AI configurations
2. **Creates a comprehensive AGENT.md** with discovered information
3. **Merges existing configs** from .cursorrules, copilot-instructions.md, etc.
4. **Sets up symlinks** for all AI assistants

### When to use:
- Any project that needs AGENT.md
- Want intelligent analysis of your codebase
- Need to merge multiple AI config files
- Replacing Claude's `/init` command

### Example workflow:
```bash
# In a new project
/agent-init
# Edit AGENT.md to match your project
# Commit the changes
git add AGENT.md CLAUDE.md .cursorrules ...
git commit -m "Initialize project with AGENT.md"
```

## `/agent-migration` - For Existing Projects

Use this command when you already have AI configuration files (like CLAUDE.md or .cursorrules) that you want to convert to AGENT.md.

### What it does:
1. Finds your existing config file (CLAUDE.md, .cursorrules, etc.)
2. Renames it to AGENT.md
3. Creates symlinks so all AI tools use the same file

### When to use:
- You have an existing CLAUDE.md or .cursorrules
- Want to preserve your current configuration
- Migrating from tool-specific configs to universal standard

### Example workflow:
```bash
# In a project with existing CLAUDE.md
/agent-migration
# Your CLAUDE.md content is now in AGENT.md
# All AI tools will use the same configuration
```

## Comparison

| Feature | `/agent-init` | `/agent-migration` |
|---------|--------------|-------------------|
| Analyzes codebase | ✅ Smart analysis | ❌ Simple rename |
| Creates new AGENT.md | ✅ Based on analysis | ❌ Uses existing content |
| Merges existing configs | ✅ Incorporates all | ❌ Just moves one |
| Best for | Any project | Simple migration |
| Intelligence | High - infers from code | Low - just renames |
| Symlinks created | All AI tools | All AI tools |

## Supported AI Assistants

Both commands create symlinks for:
- Claude Code (CLAUDE.md)
- Cline (.clinerules)
- Cursor (.cursorrules)
- Windsurf (.windsurfrules)
- GitHub Copilot (.github/copilot-instructions.md)
- Replit (.replit.md)
- Gemini CLI (GEMINI.md)
- OpenAI Codex (GEMINI.md)
- OpenCode (GEMINI.md)
- Firebase Studio (.idx/airules.md)

## Template Customization

The `/agent-init` template includes sections for:
- Project overview and architecture
- Build commands and development setup
- Code style and conventions
- Testing requirements
- Security guidelines
- Git workflow

After running `/agent-init`, customize the template to match your project's specific needs.

## Best Practices

1. **Review the content**: Whether using init or migration, review AGENT.md to ensure it accurately reflects your project

2. **Keep it updated**: As your project evolves, update AGENT.md with new conventions, commands, or architectural changes

3. **Team alignment**: Share AGENT.md with your team and get agreement on conventions

4. **Version control**: Always commit AGENT.md and its symlinks to your repository

5. **Regular updates**: Periodically review and update the file as tools and practices evolve