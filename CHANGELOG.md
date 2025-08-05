# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

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