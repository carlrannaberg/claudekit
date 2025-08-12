# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

## [0.3.1] - 2025-08-12

### Added
- **Check Comment Replacement Hook**: New validation hook that detects when functional code is replaced with comments during edits, helping maintain clean codebases
- **Symlinks Management Script**: New `npm run symlinks` command and `scripts/create-symlinks.sh` for creating/updating symlinks from `.claude/` to `src/` directories for development

### Changed
- **Hook Registration System**: Simplified hook registration from 8 manual steps to just 2 steps using metadata-driven approach
  - Hooks now use a single source of truth pattern with automatic registry building
  - Settings generation automated from hook metadata via matcher field
  - Components discovery now fully automated
  - Eliminated 60+ line switch statement in favor of metadata-driven logic

### Fixed
- **TypeScript 'any' Detection**: Improved `check-any-changed` hook to avoid false positives in strings, comments, and test utilities
  - Added `removeStringsAndComments()` method to strip content before validation
  - Uses dynamic regex construction to prevent self-detection
  - Preserves original line content in error messages while analyzing cleaned content
  - Handles single/double quotes, template literals, and both comment styles
- **Code Formatting**: Applied prettier formatting across 12+ files to ensure consistent code style

### Security
- Enhanced comment replacement detection to prevent code being hidden behind explanatory comments instead of clean deletion

## [0.3.0] - 2025-08-11

### Added
- **Domain Expert Subagents Suite**: Comprehensive library of 24+ specialized AI subagents across 7 categories
  - **Build Tools**: Vite Expert, Webpack Expert with advanced build optimization expertise
  - **Code Quality**: General linting expert with cross-language support
  - **Database**: MongoDB Expert, PostgreSQL Expert, and general database expert
  - **DevOps**: Docker Expert, GitHub Actions Expert, and general DevOps specialist
  - **Framework**: Next.js Expert with App Router and Server Components expertise
  - **Frontend**: Accessibility Expert (WCAG 2.1/2.2), CSS Styling Expert with modern CSS features
  - **Git**: Git Expert with merge conflicts, branching strategies, and repository management
  - **Node.js**: Node.js Expert with async patterns, performance optimization, and ecosystem knowledge
  - **React**: React Expert and React Performance Expert for optimization challenges
  - **Testing**: Jest Expert, Vitest Expert, and general testing framework specialist
  - **TypeScript**: TypeScript Expert, TypeScript Build Expert, and TypeScript Type Expert for advanced type system challenges
- **Agent Selection System**: Intelligent categorized agent selection with radio group interface
- **Non-Interactive Agent Installation**: `--agents` flag for automated CI/CD workflows (e.g., `--agents typescript-expert,react-expert`)
- **Subagent Linting Tools**: `claudekit lint-subagents` command with frontmatter validation
- **Command Linting Tools**: `claudekit lint-commands` command for slash command validation
- **Agent Registry System**: Dynamic agent grouping and bundled agent selection
- **Enhanced Setup Wizard**: Three-step selection process (Commands → Hooks → Agents) with improved UX
- **MCP Tool Support**: Validation for Model Context Protocol tools in slash commands

### Changed
- **Setup Command Architecture**: Complete redesign with grouped selection interface
- **Agent Installation Flow**: Integrated agents into unified component system alongside commands and hooks
- **CLI Interface**: Added `--skip-agents`, `--agents <list>`, and improved flag handling
- **Progress Reporting**: Enhanced progress indicators with agent count display
- **Component Discovery**: Extended registry to handle agent categorization and bundling
- **Validation System**: Improved frontmatter validation for both commands and subagents

### Fixed
- **Frontmatter Issues**: Cleaned up all subagent frontmatter validation problems
- **Linter Summaries**: Improved linter output formatting and removed redundant self-references
- **Default Directory Handling**: Corrected default directories for lint commands
- **Array Tools Field**: Graceful handling of array-based tools field in subagent linter
- **Agent Validation**: Improved validation to properly check for required fields and complete symlinks
- **Color Format Validation**: Added hex color format validation with helpful CSS color suggestions

### Security  
- **Tool Restrictions**: Enhanced allowed-tools validation across all new linting commands
- **Frontmatter Validation**: Strict validation of subagent and command metadata to prevent malformed configurations

## [0.2.1] - 2025-08-07

### Fixed
- **Test Hook Timeout Handling**: Improved test-project hook with 55-second timeout limit and better error messages for Claude Code's 60-second hook timeout
- **Vitest 3 Compatibility**: Updated test framework from vitest ^2.1.8 to ^3.2.4 and fixed test helper mocking compatibility
- **Debug Logging Cleanup**: Removed unnecessary debug console output from hook execution logging
- **GitIgnore Pattern**: Fixed gitignore to ensure test-helpers.ts source file is properly tracked

### Changed
- **Test Framework**: Upgraded to vitest 3.2.4 with improved performance and compatibility

## [0.2.0] - 2025-08-05

### Added
- **Embedded Hooks System**: Complete TypeScript-based hook system with `claudekit-hooks` CLI
  - New `claudekit-hooks` binary for running individual hooks with proper TypeScript execution
  - Hook execution logging and statistics system with `~/.claudekit/logs/` for tracking performance
  - Support for project-wide and file-specific validation hooks
  - Built-in hooks: `typecheck-changed`, `check-any-changed`, `lint-changed`, `test-changed`, `create-checkpoint`, `check-todos`, and project-wide variants
- **Enhanced Build System**: Separate build targets for main CLI and hooks system with sourcemaps
- **ASCII Banner**: Added `oh-my-logo` integration for setup wizard branding
- **Hook Commands**: `stats`, `recent`, and `list` subcommands for hook management and monitoring

### Changed
- **Hook Configuration**: Simplified matcher syntax in `.claude/settings.json` with pipe separator support (`Write|Edit|MultiEdit`)
- **Setup Command**: Enhanced setup wizard with comprehensive hook configuration and visual improvements
- **Build Process**: Multi-target build system with dedicated hook compilation and improved TypeScript handling
- **Hook Architecture**: All hooks now use embedded TypeScript system instead of external shell scripts

### Removed
- **Legacy Shell Hooks**: Removed all shell-based hooks from `src/hooks/` (migrated to TypeScript embedded system)
- **Setup Script**: Removed `setup.sh` bash script (functionality moved to TypeScript `setup` command)
- **Init Command**: Consolidated `init` functionality into the enhanced `setup` command
- **Shell Hook Dependencies**: Eliminated external script dependencies for more reliable hook execution

### Fixed
- **Hook Matcher Patterns**: Corrected hook matcher syntax for better tool matching reliability
- **Installation Process**: Improved setup wizard with clearer options and error handling
- **TypeScript Integration**: Better type safety and error handling across the hook system

### Security
- Enhanced allowed-tools validation to prevent unrestricted bash access across all commands

## [0.1.5] - 2025-07-25

### Documentation
- Added command execution guidelines from debugging session to AGENT.md and create-command.md
- Enhanced bash command execution best practices for complex subshells and git commands
- Added performance optimization guidelines for combined command execution in slash commands

## [0.1.4] - 2025-07-25

### Added
- Support for aio-stream output formatting in prepare-release script for improved readability when using Claude CLI with stream-json output
- Enhanced diff statistics and truncation capabilities in git:commit command
- Better test coverage parsing in CI workflow

### Fixed
- Corrected allowedTools syntax in prepare-release script (removed unnecessary quotes around tool names)
- Updated allowed-tools declarations across multiple commands to use proper bash utility syntax
- Resolved failing hook tests by improving test assertions and mock command handling
- Fixed test coverage parsing regex pattern in CI workflow
- Improved auto-checkpoint test reliability by using file-based logging instead of stderr capture
- Fixed command validation test to use proper regex anchoring for frontmatter detection

### Changed
- Improved prepare-release script with better error handling and environment validation
- Enhanced git:commit command with more detailed diff statistics and smart truncation
- Updated test framework to be more robust with better assertion methods