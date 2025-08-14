# Documentation Reorganization

## Status
Draft

## Authors
Claude - 2024-08-14

## Overview
Reorganize the `docs/` folder from a flat structure with 30+ files into a hierarchical, purpose-driven structure that improves discoverability, reduces duplication, and provides clear navigation paths for different user personas.

## Background/Problem Statement
The current documentation structure has grown organically to 30+ files in a flat directory, creating several issues:
- **Poor discoverability**: Users don't know where to find specific information
- **Duplication**: Multiple files cover similar topics (4 hook docs, 3 subagent docs, 2 command docs)
- **No clear hierarchy**: Mixing getting-started guides with internals and official specs
- **Maintenance burden**: Duplicate content needs updates in multiple places
- **Navigation confusion**: No clear path for different user journeys (new user vs. contributor vs. maintainer)

## Goals
- Create a clear, hierarchical documentation structure organized by purpose
- Eliminate duplicate documentation through merging
- Improve discoverability with logical folder groupings
- Maintain all existing documentation links through redirects or updates
- Provide clear navigation paths for different user personas
- Separate official Claude Code documentation from project-specific docs

## Non-Goals
- Rewriting documentation content (only reorganizing and merging)
- Changing documentation formats or tooling
- Creating new documentation (except for navigation aids like README indexes)
- Modifying source code or configuration files beyond link updates
- Automating documentation generation

## Technical Dependencies
- Git for version control and history preservation
- Markdown link validation tools (optional)
- No external libraries or frameworks required

## Detailed Design

### New Directory Structure

```
docs/
├── README.md                        # Documentation index
│
├── getting-started/
│   ├── installation.md             # From quick-start.md
│   ├── configuration.md            # From configuration.md
│   ├── troubleshooting.md          # From troubleshooting.md
│   └── first-commands.md           # New - quick tour
│
├── reference/
│   ├── commands.md                 # Merged from commands-reference.md + agent-commands-documentation.md
│   ├── hooks.md                    # Merged from hooks-documentation.md + hook-reference.md + hooks-reference.md
│   ├── subagents.md                # From subagents-list.md
│   └── cli.md                      # New - claudekit CLI reference
│
├── guides/
│   ├── creating-commands.md        # From create-command-documentation.md
│   ├── creating-subagents.md       # From subagent-development-guide.md
│   ├── creating-hooks.md           # From adding-hooks.md
│   ├── checkpoint-workflow.md      # From checkpoint-system.md
│   ├── spec-workflow.md            # From spec-documentation.md
│   ├── validation-workflow.md      # From validate-and-fix-documentation.md
│   ├── project-organization.md     # From file-organization.md
│   └── ai-migration.md             # From agent-migration-documentation.md
│
├── integrations/
│   ├── oracle.md                   # From oracle-setup.md
│   ├── mcp-context7.md            # From mcp-setup.md
│   ├── stm-tasks.md               # From stm-integration.md
│   ├── github-actions.md          # From github-release-setup.md
│   └── npm-publishing.md          # From npm-publishing.md
│
├── official/                        # Claude Code official docs
│   ├── hooks.md                    # From official-hooks-documentation.md
│   ├── commands.md                 # From official-slash-commands-documentation.md
│   └── subagents.md                # From official-subagents-documentation.md
│
└── internals/
    ├── principles.md                # From subagents-principles.md
    ├── claude-code-config.md       # From claude-code-configuration.md
    └── package-managers.md         # From package-manager-agnostic.md
```

### File Mapping and Actions

#### Files to Merge
1. **Hooks documentation** (4 files → 1):
   - `hooks-documentation.md` (primary)
   - `hook-reference.md` (merge content)
   - `hooks-reference.md` (merge content)
   - Result: `reference/hooks.md`

2. **Commands documentation** (2 files → 1):
   - `commands-reference.md` (primary)
   - `agent-commands-documentation.md` (merge content)
   - Result: `reference/commands.md`

#### Files to Delete
- `hook-reference.md` → DELETE after merging into `reference/hooks.md`
- `hooks-reference.md` → DELETE after merging into `reference/hooks.md`
- `agent-commands-documentation.md` → DELETE after merging into `reference/commands.md`
- `flexible-command-names.md` → DELETE (outdated)
- `getting-started.md` → DELETE (replaced by getting-started folder)

#### Link Updates Required

**Critical Links (Must Update)**:
1. README.md (9 links):
   - `docs/commands-reference.md` → `docs/reference/commands.md`
   - `docs/hooks-documentation.md` → `docs/reference/hooks.md`
   - `docs/subagents-list.md` → `docs/reference/subagents.md`
   - `docs/configuration.md` → `docs/getting-started/configuration.md`
   - `docs/troubleshooting.md` → `docs/getting-started/troubleshooting.md`
   - `docs/oracle-setup.md` → `docs/integrations/oracle.md`
   - `[Full docs](docs/)` remains unchanged

2. AGENT.md (3 links):
   - `docs/subagent-development-guide.md` → `docs/guides/creating-subagents.md`
   - `docs/hooks-documentation.md` → `docs/reference/hooks.md`
   - `docs/file-organization.md` → `docs/guides/project-organization.md`

3. examples/README.md (4 links) - update similarly

## User Experience

### For New Users
- Start at `getting-started/` for installation and configuration
- Clear progression: installation → configuration → first commands → troubleshooting
- Reference section easily discoverable when needed

### For Regular Users
- `reference/` provides quick lookup for commands, hooks, and subagents
- `guides/` offers task-specific tutorials
- Reduced confusion from duplicate files

### For Contributors
- `guides/creating-*.md` files provide clear contribution paths
- `internals/` contains architecture and principles
- `official/` preserves Claude Code standards

### For Maintainers
- Clear separation of concerns
- Easier to maintain with no duplicates
- Logical place for new documentation

## Testing Strategy

### Unit Tests
- Not applicable (documentation only)

### Integration Tests
- Validate all markdown links still resolve correctly
- Check for broken internal references
- Verify no documentation is lost during migration

### Manual Testing
- Navigate documentation as different user personas
- Verify all README links work
- Check that merged content is properly integrated
- Ensure no duplicate information remains

## Performance Considerations
- No runtime performance impact
- Improved developer productivity through better organization
- Faster documentation lookup with clear structure

## Security Considerations
- No security implications
- Documentation remains public
- No sensitive information exposed

## Documentation

### Updates Required
1. Create `docs/README.md` as navigation index
2. Update all internal cross-references
3. Add redirect notes in old locations (optional)
4. Update CONTRIBUTING.md with new documentation structure

### New Documentation
- `docs/README.md` - Main documentation index
- `getting-started/first-commands.md` - Quick command tour
- `reference/cli.md` - CLI reference (if not exists)

## Implementation Phases

### Phase 1: Preparation and Validation
- Create directory structure
- Inventory all documentation links
- Create mapping spreadsheet
- Backup current docs

### Phase 2: Core Migration
- Merge duplicate files
- Move files to new locations
- Create new index files
- Delete obsolete files

### Phase 3: Link Updates
- Update links in README.md
- Update links in AGENT.md
- Update links in examples/
- Search and update any missed references

### Phase 4: Validation and Cleanup
- Validate all links work
- Check for missing content
- Remove backup files
- Update CONTRIBUTING.md

## Open Questions
1. Should we create automatic redirects from old paths?
2. Should we version the documentation structure?
3. Should spec files be updated to reference new paths, or leave as historical record?
4. Should we add a documentation style guide?

## References
- Current documentation analysis from codebase search
- Common documentation patterns from popular open source projects
- Information Architecture principles
- Git history of documentation evolution