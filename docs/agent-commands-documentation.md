# AGENT.md Commands Documentation

claudekit provides two commands for working with the [AGENT.md standard](https://agent.md):

## `/agent:init` - Create or Improve AGENT.md

Use this command to create a new AGENT.md or enhance an existing one with intelligent codebase analysis.

### What it does:
1. **Analyzes your codebase** to understand:
   - Project type and technologies
   - Build commands and scripts
   - Test frameworks and patterns
   - Code style conventions
   - Existing AI configurations
2. **Creates or improves AGENT.md** with discovered information
3. **Adds directory structure** (reports/, temp/) and file organization guidelines
4. **Merges existing configs** from .cursorrules, copilot-instructions.md, etc.
5. **Sets up symlinks** for all AI assistants

### When to use:
- **New projects** that need AGENT.md
- **Existing projects** to improve/update existing AGENT.md
- Want intelligent analysis of your codebase
- Need to add new features (directory structure, latest best practices)
- Replacing Claude's `/init` command

### Safety:
✅ **Safe to run on existing AGENT.md files** - it improves rather than overwrites
✅ **Can be run multiple times** to keep AGENT.md updated
✅ **Preserves existing content** while adding enhancements

### Example workflows:
```bash
# New project
/agent:init
# Creates comprehensive AGENT.md from scratch

# Existing project with AGENT.md
/agent:init
# Enhances existing AGENT.md with latest analysis and features

# Edit AGENT.md to match your project
# Commit the changes
git add AGENT.md CLAUDE.md .cursorrules ...
git commit -m "Initialize/improve project with AGENT.md"
```

## `/agent:migration` - Convert Other AI Config Files to AGENT.md

Use this command when you have **non-AGENT.md** configuration files that you want to convert to the AGENT.md standard.

### What it does:
1. **Analyzes all existing config files** (CLAUDE.md, .cursorrules, .windsurfrules, etc.)
2. **Detects content differences** and chooses appropriate migration strategy:
   - **Single file**: Simple move to AGENT.md
   - **Identical files**: Move primary, symlink others
   - **Different content**: Smart merging or user-guided resolution
3. **Creates symlinks** so all AI tools use the same file
4. **Handles conflicts intelligently** with user guidance when needed

### Migration Strategies:
- **🔄 Auto-merge**: Combines unique content from all files
- **📋 Backup approach**: Keeps primary file, backs up others (.bak extension)
- **🎯 Selective**: Interactive selection of content blocks
- **🛠️ Manual**: Step-by-step merge assistance

### When to use:
- You have existing **CLAUDE.md** or **.cursorrules** files
- Want to migrate from tool-specific configs to universal AGENT.md standard
- **Multiple AI config files** with different content that need merging
- **DO NOT use** if you already have AGENT.md (use `/agent:init` instead)

### Conflict Resolution:
✅ **Seamless**: Identical files are automatically handled
✅ **Smart merging**: Different sections are combined when possible
✅ **User guidance**: Conflicts are clearly presented with merge options
✅ **Backup safety**: Original files can be preserved as .bak files

### Not for:
❌ Projects that already have AGENT.md (use `/agent:init` instead)
❌ Creating AGENT.md from scratch (use `/agent:init` instead)

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