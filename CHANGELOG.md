# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.9] - 2025-08-21

### Changed
- **Command Namespace Standardization**: Renamed AI assistant command namespace for consistency
  - Renamed command namespace from `agent-md` to `agents-md` for consistency with filename conventions
  - Updated all command references in CLI setup configuration from `agent-md:*` to `agents-md:*`
  - Updated documentation references from `AGENT.md` to `AGENTS.md` throughout the codebase
  - Updated lint error messages to reference `AGENTS.md/CLAUDE.md` for command lookup
  - Maintains full backward compatibility - existing functionality unchanged

## [0.6.8] - 2025-08-20

### Changed
- **CLI Command Naming**: Renamed `validate` command to `doctor` for better CLI conventions and clarity
  - Updated CLI registration from `claudekit validate` to `claudekit doctor`
  - Renamed command implementation file from `validate.ts` to `doctor.ts`
  - Updated all documentation references and setup guidance to use `doctor` terminology
  - Maintains backward compatibility with same functionality and options

### Added
- **Codebase Map Filtering Configuration**: Enhanced codebase-map hook with advanced filtering capabilities
  - Added `include` and `exclude` pattern support in `.claudekit/config.json` configuration
  - Added support for glob patterns to filter which files are included in codebase maps
  - Added filtering to codebase-map format command with `--include` and `--exclude` flags
  - Enhanced configuration schema with validation for include/exclude string arrays
  - Improved TypeScript types for CodebaseMapConfig with new filtering options

### Fixed
- **Test Suite**: Updated test expectations to reflect new diagnostic terminology
  - Updated all test files to use `doctor` command instead of `validate`
  - Fixed test assertions to match new command behavior and output
  - Updated integration tests for proper workflow validation with new command name

## [0.6.7] - 2025-08-20

### Added
- **Subagent Tools Field Validation**: Enhanced subagent linter with comprehensive empty tools field detection
  - Added detection for empty `tools` fields (null, empty string, whitespace-only) in subagent configurations
  - Added warning messages explaining that empty tools fields grant NO tools to subagents
  - Added guidance to either remove the field entirely (inherits all tools) or specify tools explicitly
  - Added comprehensive test coverage with 12 test cases for various empty field scenarios
  - Enhanced validation logic to handle YAML null values, comments-only fields, and edge cases

### Fixed
- **Code Review Command**: Fixed YAML parsing error in `/code-review` command
  - Properly quoted `argument-hint` field to prevent YAML parsing failures
  - Ensures command can be properly loaded and executed without syntax errors

## [0.6.6] - 2025-08-20

### Fixed
- **Test Infrastructure**: Improved test script reliability and path resolution
  - Fixed path resolution in `tests/unit/test-subagents.sh` to use absolute paths with proper script directory detection
  - Updated agent file reference from `expert.md` to `typescript-expert.md` to match actual file structure
  - Enhanced test failure handling to treat validation warnings as non-blocking for CI stability
  - Improved script portability using `${BASH_SOURCE[0]}` instead of `$0` for more reliable path detection

## [0.6.5] - 2025-08-20

### Fixed
- **ESM/CommonJS Compatibility**: Fixed module compatibility issues for better cross-platform support
  - Fixed import.meta.url usage with fallback to __filename for CommonJS builds
  - Updated main entry point detection to work in both ESM and CommonJS environments
  - Enhanced module loading with proper fallbacks for Node.js built-in patterns
  - Improved CLI startup reliability across different Node.js module systems
- **Dynamic Import Integration**: Converted oh-my-logo to dynamic import for ESM compatibility
  - Changed from static import to dynamic import in setup command to prevent bundling issues
  - Added graceful fallback when oh-my-logo cannot be loaded
  - Maintains ASCII art functionality while improving module compatibility

### Changed
- **Build System**: Enhanced build configuration for better Ubuntu compatibility and dependency management
  - Changed build output format from ESM to CommonJS for improved compatibility
  - Updated main package.json entry points to use .cjs extensions
  - Enhanced esbuild configuration with better external dependency handling
  - Added comprehensive dependency validation scripts for build verification

### Added
- **Enhanced Validation Infrastructure**: Expanded build and dependency validation capabilities
  - Enhanced `scripts/validate-dependencies.js` with improved bundling strategy validation
  - Enhanced `scripts/test-clean-install.sh` with comprehensive CLI functionality testing
  - Added support for validating both bundled and external dependencies
  - Improved error reporting and validation feedback for development workflows

## [0.6.4] - 2025-08-19

### Added
- **Production Validation Scripts**: Added comprehensive build and installation validation
  - Added `scripts/validate-dependencies.js` for runtime dependency validation
  - Added `scripts/test-clean-install.sh` for clean environment testing
  - Added `validate:deps`, `validate:build`, `validate:install`, and `prepublish:validate` npm scripts
  - Validates external dependencies are properly declared in package.json
  - Tests CLI functionality in isolated environment to catch missing dependencies

### Changed
- **Build Configuration**: Enhanced ESBuild configuration with explicit external dependencies
  - Updated build scripts to properly externalize `fs-extra`, `@inquirer/prompts`, `commander`, `ora`, and `oh-my-logo`
  - Improved bundle optimization by separating external vs bundled dependencies
- **ESLint Configuration**: Enhanced JavaScript file linting with comprehensive rules and globals
  - Added dedicated JavaScript file configuration with Node.js globals
  - Added code quality rules for modern JavaScript development
  - Improved linting coverage for CLI scripts and configuration files

### Fixed
- **CLI Startup Robustness**: Improved CLI initialization error handling
  - Changed show commands registration failure from error to debug logging
  - CLI no longer fails to start when show commands cannot be registered
  - Enhanced graceful degradation for optional command modules

## [0.6.3] - 2025-08-19

### Changed
- **Command Naming**: Renamed `/review` command to `/code-review` to avoid conflicts with native Claude Code commands
  - Updated command name in all documentation references (README.md, docs/)
  - Updated symlink structure and agent references
  - Maintains all existing functionality with improved naming consistency

## [0.6.2] - 2025-08-19

### Added
- **Fast Test Configuration**: Added optimized Vitest configuration for hook execution
  - Added `vitest.hook.config.ts` with ultra-fast settings optimized for Stop hook timeout constraints
  - Added `test:fast` npm script for rapid testing without coverage
  - Added `test-project` command to claudekit configuration for project-level test execution
  - Enhanced test infrastructure with comprehensive configuration validation tests

### Changed
- **Agent MD Init Enhancement**: Improved `/agents-md:init` command to encourage delegation to specialized agents
  - Enhanced command to emphasize the importance of using domain-specific subagents
  - Updated guidance to promote proactive delegation patterns for better task management
  - Improved documentation structure for specialized agent usage

### Fixed
- **TypeScript Import Issues**: Resolved fs-extra import compatibility across hook system
  - Fixed Node.js module imports from namespace to default imports in `cli/hooks/base.ts`
  - Fixed imports in `cli/hooks/runner.ts` and `cli/hooks/utils.ts` for better ES module compatibility
  - Updated test files to use consistent import patterns
  - Ensures compatibility with modern Node.js module resolution

## [0.6.1] - 2025-08-19

### Added
- **Triage Expert Subagent**: New context gathering and problem diagnosis specialist
  - Added `triage-expert` for initial error analysis and routing to specialized experts
  - Universal agent for handling errors, performance issues, or unexpected behavior
  - Provides comprehensive diagnostic context before delegating to domain experts
  - Includes strict diagnosis boundaries and mandatory cleanup of temporary debug code
- **Specialized Subagent Integration**: Enhanced workflow commands with intelligent delegation
  - Added subagent integration patterns to `spec:create`, `spec:validate`, and `validate-and-fix` commands
  - Commands now intelligently delegate to domain experts based on task requirements
  - Documented specialized subagent usage patterns in creating-commands guide
- **Mandatory Subagent Delegation Guidelines**: Enhanced AGENTS.md with strict delegation requirements
  - Added mandatory requirement to use specialized subagents for all technical issues
  - Documented clear routing patterns for different types of problems
  - Prevents direct problem solving without specialist expertise

### Changed
- **Agent Naming Standardization**: Renamed `code-reviewer` to `code-review-expert` for consistency
- **Agent Description Format**: Fixed all agent descriptions from first-person to second-person format
  - Updated 12+ expert agents with consistent "You are" description pattern
  - Improves clarity and consistency across all subagents

### Fixed
- **TypeScript Import Issues**: Resolved module import and compilation problems
  - Fixed Node.js module imports from default to namespace imports across all files
  - Added `downlevelIteration` to tsconfig.json to resolve iterator issues
  - Applied consistent ESLint/Prettier formatting throughout codebase
  - Ensured all 682 tests pass with improved validation logic
- **CLI Test Infrastructure**: Added timeout mechanism to prevent hanging tests
  - Fixed infinite hanging in "should handle missing .claude directory gracefully" test
  - Added configurable timeout parameter (default 5s, 10s for complex operations)
  - Added proper process cleanup and error handling for spawned CLI commands
  - Improved test reliability with SIGTERM handling and timeout controls

## [0.6.0] - 2025-08-18

### Added
- **Codebase Map Integration**: Added comprehensive project structure mapping using external codebase-map CLI
  - Added `CodebaseMapHook` (UserPromptSubmit) providing invisible codebase context on first prompt per session
  - Added `CodebaseMapUpdateHook` (PostToolUse) for incrementally updating maps when files change
  - Automatically scans and indexes project structure with AST-based analysis
  - Generates optimized output format for LLM consumption with dependency tracking
  - Session tracking prevents duplicate context loading within same Claude Code session
  - Automatic cleanup of old session files (older than 7 days)
  - Requires external [codebase-map](https://github.com/carlrannaberg/codebase-map) CLI installation
- **Shared Hook Utilities**: Added reusable utilities for hook development
  - Added `codebase-map-utils.ts` for shared codebase map generation functionality
  - Added `SessionTracker` class in `session-utils.ts` for per-session state management
  - Added comprehensive file modification time tracking and session flag management
- **Enhanced Git Commands**: Added git-expert integration capabilities to git workflow commands
  - Enhanced `/git:commit`, `/git:status`, and `/git:push` commands with Task tool support
  - Added recommendations for using git-expert subagent for complex scenarios
- **Enhanced Hook Registry**: Added support for UserPromptSubmit and SubagentStop event hooks
  - Updated hook registry to support new event types alongside PostToolUse and Stop
  - Enhanced hook runner with proper event type handling and metadata processing
- **Refactoring Expert Subagent**: Added comprehensive code smell detection and refactoring guidance
  - Added `refactoring-expert` subagent with 25+ code smell detection patterns
  - Provides systematic refactoring guidance with before/after examples
  - Includes safe refactoring process with test-driven incremental changes
  - Covers 6 categories: Composing Methods, Moving Features, Organizing Data, Simplifying Conditionals, Making Method Calls Simpler, and Dealing with Generalization

### Changed
- **Dynamic Agent Count Display**: Fixed setup command to show actual number of available agents instead of hardcoded count
  - Setup command now dynamically calculates and displays the correct number of agents in the "Install All" option
  - Eliminates maintenance burden of manually updating agent counts when new agents are added
  - Improves accuracy and prevents misleading information in the setup interface
- **Hook List Command**: Enhanced hooks listing to show actual configured hooks from project settings
  - Added `listHooks()` function that processes both project and user configurations
  - Displays hook source (project/user), associated events, and configured matchers
  - Improved hook name extraction from embedded system commands
- **Enhanced Test Coverage**: Added comprehensive test suites for new functionality
  - Added `tests/unit/codebase-map.test.ts` with 30+ test cases for codebase mapping
  - Added `tests/integration/codebase-hooks.test.ts` for end-to-end hook testing
  - Added `tests/unit/list-hooks.test.ts` with extensive hook listing validation
  - Enhanced test helpers and utilities for better test reliability

### Fixed
- **ESLint Configuration**: Updated ESLint configuration to support TypeScript 6.0+ and modern patterns
  - Enhanced parser options for better TypeScript compatibility
  - Updated rule configurations for cleaner code standards
- **Test Suite Reliability**: Improved test suite stability and reduced flaky tests
  - Enhanced debounce boundary tests with better timing control
  - Improved mock handling for filesystem operations and external command execution
  - Fixed test isolation issues with better cleanup and setup patterns


## [0.5.0] - 2025-08-17

### Added
- **Comprehensive Code Review System**: Added multi-aspect code review functionality with parallel agent processing
  - Added `/code-review` command for intelligent code reviews using specialized parallel agents
  - Added `code-review-expert` agent with 6 focused review aspects: architecture & design, code quality, security & dependencies, performance & scalability, testing quality, and documentation & API design
  - Added structured report format with issue prioritization (Critical/High/Medium), type icons (🔒 Security, 🏗️ Architecture, ⚡ Performance, 🧪 Testing, 📝 Documentation, 💥 Breaking), and actionable feedback
  - Added intelligent agent selection based on file types and review scope (documentation-only, test files, config files, or full source code)
  - Added quality metrics scoring system and issue distribution tracking for comprehensive analysis
- **Enhanced Expert Agent Collection**: Added comprehensive domain-specific expert agents with enhanced capabilities
  - Added `ai-sdk-expert` for Vercel AI SDK v5 development, streaming, and model integration
  - Added `cli-expert` for npm package CLI development with Unix philosophy and argument parsing  
  - Added `nestjs-expert` for Nest.js framework development with dependency injection and testing
  - Enhanced multiple existing agents with comprehensive code review checklists and quality validation capabilities
  - Added specialized build tool experts: `build-tools-vite-expert` and `build-tools-webpack-expert`
  - Added infrastructure experts: `infrastructure-docker-expert` and `infrastructure-github-actions-expert`
  - Added frontend experts: `frontend-css-styling-expert` and `frontend-accessibility-expert`
  - Added comprehensive testing suite: `testing-expert`, `jest-testing-expert`, `vitest-testing-expert`, and `e2e-playwright-expert`
  - Added database experts: `database-expert`, `database-postgres-expert`, and `database-mongodb-expert`
  - Added additional specialized experts: `git-expert`, `nodejs-expert`, `react-expert`, `react-performance-expert`, `typescript-expert`, `typescript-build-expert`, `typescript-type-expert`, and `code-quality-linting-expert`
- **Developer Documentation**: Added comprehensive guides for subagent and command development
  - Added `docs/guides/creating-subagents.md` with detailed instructions for creating domain expert subagents
  - Added `docs/guides/creating-commands.md` with command development patterns and best practices

### Changed
- **Agent Architecture**: Upgraded review system to use 6 focused agents architecture for comprehensive parallel code analysis
- **Review Efficiency**: Enhanced review process with intelligent agent selection based on file types and scope to reduce unnecessary analysis overhead
- **Report Structure**: Improved review report format with consistent type icons, priority levels, and actionable feedback structure

### Fixed
- **Review Template Organization**: Moved review instructions outside of report template to clarify systemic issues section and improve template readability
- **Agent Selection Logic**: Enhanced review efficiency by launching only relevant agents based on the specific files and changes being reviewed

## [0.4.0] - 2025-08-16

### Added
- **CLI Show Command**: New `claudekit show` command for exposing agent and command prompts in headless mode
  - Added `claudekit show agent <id>` subcommand to display agent prompts with support for text and JSON output formats (--format text|json)
  - Added `claudekit show command <id>` subcommand to display command prompts with support for text and JSON output formats (--format text|json)
  - Added comprehensive loader infrastructure with `AgentLoader` and `CommandLoader` classes for robust file resolution
  - Added support for multiple agent/command resolution strategies including direct file matching, category/name patterns, and frontmatter name field matching
  - Added proper error handling with helpful suggestions to use `claudekit list` commands when items are not found
- **Advanced Agent Discovery**: Enhanced agent resolution with intelligent path matching and frontmatter parsing
  - Added support for category-based agent organization (e.g., `typescript/expert`)
  - Added automatic `-expert` suffix handling for simplified agent references
  - Added recursive frontmatter name field matching for flexible agent identification
  - Added robust error handling for malformed frontmatter with graceful fallbacks
- **Command Resolution System**: Enhanced command discovery with namespace support and flexible path resolution
  - Added support for namespaced commands using colon syntax (e.g., `spec:create` → `spec/create.md`)
  - Added recursive directory traversal for commands in any subdirectory structure
  - Added intelligent allowed-tools parsing supporting both string and array formats from frontmatter
- **Specialized AI Expert Subagents**: Added comprehensive collection of domain-specific AI subagents
  - Added `ai-sdk-expert` for Vercel AI SDK v5 development, streaming, and model integration
  - Added `cli-expert` for npm package CLI development with Unix philosophy and argument parsing
  - Added `nestjs-expert` for Nest.js framework development with dependency injection and testing

### Changed
- **CLI Architecture**: Refactored CLI initialization to support dynamic command registration
  - Modified `runCli()` function to be async and support dynamic import of show commands
  - Enhanced CLI error handling with proper async error propagation and graceful failure modes
  - Updated command registration pattern to support modular command loading
- **Agent List Display**: Enhanced agent listing with frontmatter-based filtering and display names
  - Modified agent filtering to use frontmatter `name` field instead of filename for more accurate matching
  - Updated display logic to show human-readable names from frontmatter rather than technical filenames
  - Improved token estimation and frontmatter extraction for better performance and accuracy

### Fixed
- **Test Output**: Configured vitest for minimal output to reduce context pollution during test runs
- **NPM Notices**: Filtered npm notices from test stderr output to prevent test noise
- **Model References**: Updated AI model references to current August 2025 versions with accurate context sizes

## [0.3.11] - 2025-08-16

### Added
- **Agent Listing Support**: Enhanced the `claudekit list` command with comprehensive agent discovery and listing functionality
  - Added `agents` as a new valid list type alongside `hooks`, `commands`, and `config`
  - Added `listAgents()` function that recursively scans `.claude/agents/` directory for agent files
  - Added token count estimation for agents using a heuristic of ~1 token per 4 characters
  - Added agent categorization based on directory structure (e.g., `general`, `typescript`, `react`)
  - Added frontmatter parsing to extract agent descriptions from YAML metadata
  - Enhanced display with grouped agent output showing category organization and token counts
  - Updated `AgentInfo` interface with `category`, `tokens`, and enhanced metadata fields
  - Modified command validation to include agents type checking with proper TypeScript discrimination

### Changed
- **Token Count Integration**: Added token estimation and display across commands and agents
  - Enhanced `CommandInfo` interface to include `tokens` field for command complexity measurement
  - Added `estimateTokens()` and `formatTokens()` utility functions for consistent token display
  - Updated command listing display to show token counts instead of file sizes for better relevance
  - Modified display formatting to show token counts in human-readable format (e.g., "1.2k tokens")
- **List Command Type Validation**: Updated valid types from `['all', 'hooks', 'commands', 'settings', 'config']` to `['all', 'hooks', 'commands', 'agents', 'config']`
  - Removed deprecated `settings` type in favor of standardized `config` type naming
  - Enhanced type discrimination in result processing to properly distinguish between commands and agents

## [0.3.10] - 2025-08-15

### Added
- **SubagentStop Hook Support**: Added support for hooks to trigger when subagents complete their tasks
  - Added `SubagentStop` to the `HookEvent` type alongside existing `PostToolUse` and `Stop` events
  - Enhanced hook metadata to support arrays of trigger events for multi-event hooks
  - Updated all completion validation hooks (`typecheck-project`, `lint-project`, `test-project`, `check-todos`, `self-review`) to trigger on both `Stop` and `SubagentStop` events
  - Added `SubagentStop` configuration support in the setup process with proper hook grouping and merging
  - Enables quality validation and checkpointing when subagent tasks complete, ensuring consistency across all Claude Code workflows
- **Show Command Specification**: Added comprehensive specification for exposing agent and command prompts in headless mode
  - Added CLI expert subagent specification for advanced command-line interface development guidance
  - Enhanced specification creation and validation workflows for better development planning

### Changed
- **Hook Trigger Configuration**: Enhanced hook setup to support multiple trigger events per hook
  - Modified hook metadata system to accept either single trigger events or arrays of events
  - Updated setup process to properly configure hooks for multiple trigger points
  - Improved hook merging logic to handle `SubagentStop` configurations alongside existing events

## [0.3.9] - 2025-08-14

### Fixed
- **Comment Replacement Hook File Path Integration**: Enhanced the check-comment-replacement hook to use file path information for smarter validation
  - Added file path extraction for both Edit and MultiEdit operations to enable file-type-aware validation
  - Added automatic exclusion of documentation files (`.md`, `.mdx`, `.txt`, `.rst`) from comment replacement validation
  - Enhanced debug logging with detailed context payload information when DEBUG environment variable is set
  - Improved validation accuracy by skipping comment replacement checks on documentation files where such patterns are legitimate
  - Reduced false positives for documentation edits while maintaining code quality enforcement for actual source files

## [0.3.8] - 2025-08-14

### Changed
- **Doctor Command Flag Standardization**: Replaced `--detailed` flag with universal `--verbose` flag for consistency
  - Removed the `--detailed` option from the doctor command CLI interface
  - Updated validation output logic to use `--verbose` instead of `--detailed` for enhanced details
  - Changed output header from "Detailed Validation:" to "Validation Details:" for clarity
  - Maintains same functionality while providing consistent flag naming across the CLI

### Fixed
- **Comment Replacement Detection**: Enhanced the check-comment-replacement hook to reduce false positives
  - Improved hash comment pattern to exclude markdown headers (e.g., `##`) from comment detection
  - Enhanced block comment continuation pattern to require space after `*` for more precise matching
  - Added size difference analysis to distinguish between content replacement and content deletion
  - Improved replacement detection logic to avoid flagging legitimate content removal as violations
  - Reduced false positives when users delete sections of code rather than replacing them with comments

## [0.3.7] - 2025-08-14

### Added
- **Agent Discovery Documentation**: Enhanced `/agents-md:init` command with comprehensive subagent documentation
  - Added automatic discovery of available subagents in the project
  - Integrated detailed subagent usage guidelines into generated AGENTS.md files
  - Included proactive delegation patterns and examples for 24+ specialized agents across 7 categories
  - Added when-to-use guidance for domain-specific tasks (React performance, TypeScript errors, build optimization, etc.)

### Fixed
- **Self-Review Duplicate Detection**: Improved reliability of self-review hook duplicate prevention
  - Enhanced transcript parsing to properly detect Stop hook output in tool_result content
  - Fixed marker detection to check both user message content and toolUseResult.reason fields
  - Improved parsing of tool results where self-review markers are embedded in JSON responses
  - Added debug logging for self-review trigger analysis to aid troubleshooting
- **TranscriptParser Tool Result Handling**: Enhanced transcript analysis for better hook integration
  - Added support for parsing tool_result type content blocks in user messages
  - Improved detection of Stop hook feedback that appears in Claude Code UI
  - Better handling of structured JSON content within tool results
  - Enhanced marker finding logic to work reliably with embedded hook system output

### Changed
- **Self-Review Configuration**: Updated example configuration to reflect current best practices
  - Simplified configuration example with focus on essential settings (timeout, targetPatterns, focusAreas)
  - Updated example targetPatterns to show TypeScript/JavaScript file filtering
  - Enhanced focusAreas example configuration with clear structure and purpose

## [0.3.6] - 2025-08-14

### Changed
- **Self-Review Hook Configuration**: Simplified the self-review hook by removing complexity and focusing on essential functionality
  - Removed `triggerProbability` configuration option - hook now triggers deterministically when code changes are detected
  - Removed `messageWindow` configuration parameter - replaced with intelligent change detection since last review
  - Enhanced change detection logic to check for new file modifications since the last self-review marker
  - Added default 200-entry lookback limit when no previous review marker exists to prevent excessive history scanning
  - Improved transcript parsing logic for more reliable file change detection

### Fixed
- **TranscriptParser Logic**: Enhanced transcript analysis methods for better change detection
  - Added `hasFileChangesInRange()` method for checking changes within specific entry ranges
  - Improved `hasFileChangesSinceMarker()` to properly handle cases where no previous marker exists
  - Fixed file change detection to be more precise and reduce false positives
- **Self-Review Configuration Schema**: Updated TypeScript configuration schema to remove deprecated options
  - Removed `triggerProbability` and `messageWindow` from `SelfReviewConfigSchema`
  - Streamlined configuration interface to focus on essential settings (timeout, targetPatterns, focusAreas)
- **Test Suite Updates**: Updated test cases to reflect simplified configuration and behavior
  - Removed tests for probability-based triggering and message window configuration
  - Enhanced tests for new change detection logic and marker-based tracking
  - Improved test coverage for transcript parsing edge cases

## [0.3.5] - 2025-08-13

### Added
- **TranscriptParser Utility**: New comprehensive transcript analysis system for Claude Code session parsing
  - Added `cli/utils/transcript-parser.ts` with intelligent conversation message grouping
  - Supports complex transcript parsing with UI message detection and tool use analysis  
  - File pattern matching with glob support and negative patterns (e.g., `['**/*.ts', '!**/*.test.ts']`)
  - Smart message windowing that matches Claude Code UI behavior (dots in conversation view)
  - Functions for detecting file changes, finding markers, and analyzing recent activities
- **Self-Review Hook Enhancements**: Major improvements to the self-review system
  - Added configurable `messageWindow` setting (default: 15 UI messages)
  - Added `targetPatterns` configuration for glob-based file filtering
  - Enhanced `focusAreas` configuration with custom question sets
  - Intelligent duplicate prevention with marker-based tracking (`📋 **Self-Review**`)
  - Smart file change detection that respects time windows and file patterns
- **Comprehensive Test Suite**: Added extensive test coverage for new functionality
  - `tests/unit/transcript-parser.test.ts` with 25+ test cases covering all parser features
  - `tests/unit/transcript-parser-grouping.test.ts` with real-world transcript parsing scenarios  
  - `tests/unit/self-review.test.ts` with comprehensive hook behavior validation
  - Tests cover message grouping, glob patterns, probability triggers, and configuration scenarios
- **Configuration Examples**: Added `examples/settings.self-review.json` with documented configuration options

### Changed
- **Self-Review Hook Architecture**: Complete rewrite using the new TranscriptParser system
  - Replaced manual conversation parsing with robust TranscriptParser utility
  - Improved file change detection accuracy with configurable target patterns
  - Enhanced message windowing to match Claude Code UI behavior exactly
  - Simplified hook logic by delegating transcript analysis to dedicated parser
  - Better duplicate prevention using consistent marker detection
- **TypeScript Hook Error Messages**: Enhanced error feedback with specific command information
  - TypeScript hooks now include the exact command (e.g., `npm run typecheck`) in error messages
  - Updated `formatTypeScriptErrors()` utility to accept optional command parameter
  - More actionable error messages that tell users exactly what to run for verification
- **Hook Utilities**: Enhanced `check-todos` hook to use new TranscriptParser system
  - Replaced manual transcript parsing with centralized parser utility
  - Improved reliability and consistency across transcript-reading hooks

### Fixed
- **Message Counting Accuracy**: Fixed UI message counting to match Claude Code interface
  - Messages are now grouped correctly (text + tools = one UI message)
  - Accurate detection of when assistant messages get dots in the conversation view
  - Proper handling of standalone tool-only messages (like TodoWrite)
- **Self-Review Trigger Logic**: Improved trigger conditions and duplicate detection
  - Fixed probability-based triggering with proper random number generation
  - Enhanced file pattern matching to avoid false positives on documentation files  
  - Corrected transcript path handling and validation
  - Better debug logging for troubleshooting trigger behavior
- **Test Infrastructure**: Improved test reliability and coverage
  - Fixed vitest reporter configuration (switched from 'verbose' to 'default')
  - Enhanced mock system for filesystem operations and transcript parsing
  - Better test assertions that actually validate functionality rather than side effects

### Security
- **File Pattern Validation**: Enhanced glob pattern validation to prevent path traversal issues
- **Transcript Access**: Secure transcript file access with proper path expansion and validation

## [0.3.4] - 2025-08-13

### Added
- **Claudekit Configuration System**: New centralized configuration system with `.claudekit/config.json` support
  - Added `cli/utils/claudekit-config.ts` with `loadClaudekitConfig()` and `getHookConfig()` functions
  - Supports JSON schema validation for configuration files
  - Enables project-specific hook configuration with fallback to sensible defaults
  - Added configuration example file at `.claudekit/config.json.example`

### Changed
- **Hook Configuration Architecture**: Standardized all hooks to use the new configuration system
  - All hooks now use `getHookConfig<T>()` instead of accessing `this.config` directly
  - Improved type safety with proper TypeScript interfaces for each hook's configuration
  - Configuration loading with graceful fallback when config files are missing or invalid
  - Updated hooks: `create-checkpoint`, `lint-changed`, `lint-project`, `test-changed`, `test-project`, `typecheck-changed`, `typecheck-project`, `self-review`
- **Self-Review Hook Improvements**: Simplified and enhanced the self-review hook functionality  
  - Replaced persona-based system with structured focus areas (Refactoring & Integration, Code Quality, Consistency & Completeness)
  - Added configurable trigger probability (defaults to 70%, configurable via `triggerProbability` in config)
  - Improved question selection with one question per focus area for better coverage
  - Streamlined message templates with clearer, more actionable feedback
  - Enhanced configuration support for timeout and trigger probability settings

### Fixed
- **Configuration Loading**: Robust configuration loading with proper error handling and debug logging
- **Hook Parameter Interfaces**: All hooks now have properly typed configuration interfaces
- **Test Suite Updates**: Updated all hook tests to mock the new configuration system properly

## [0.3.3] - 2025-08-13

### Added
- **Self Review Hook**: New validation hook that prompts critical self-review with randomized senior developer personas and questions
  - Triggers on Stop events after code file modifications with 70% probability
  - Features 5 senior developer personas with distinct styles and catchphrases
  - Includes 3 review frameworks focusing on code coherence, integration, and overall health
  - Smart detection of code file changes vs documentation/config files
  - Analyzes conversation history to only trigger when actual code files were modified
  - Supports 20+ programming languages (.ts, .tsx, .js, .jsx, .py, .java, .cpp, .go, .rs, .swift, .kt, .rb, .php, .scala, .vue, .svelte, etc.)
  - Prevents hook loops and provides structured feedback with randomized question selection

### Fixed
- **Self Review Hook Targeting**: Improved hook to only trigger on actual code file changes, ignoring documentation and configuration files
  - Excludes README, CHANGELOG, LICENSE, .md, .txt, .json, .yaml, .yml, .toml, .ini, .env, .gitignore, .dockerignore files
  - Uses conversation transcript analysis to detect recent code editing tool usage
  - Prevents false triggers on non-code modifications

## [0.3.2] - 2025-08-12

### Added
- **Check Unused Parameters Hook**: New validation hook that detects lazy refactoring where function parameters are prefixed with underscore instead of being properly removed
  - Analyzes Edit/MultiEdit operations to detect parameter name changes from `param` to `_param`
  - Provides detailed feedback on proper parameter handling practices
  - Supports TypeScript/JavaScript function declarations, arrow functions, methods, and constructors
  - Helps maintain clean function signatures by encouraging proper parameter removal

### Changed
- **Comment Replacement Hook Scope**: Refined `check-comment-replacement` hook to only trigger on Edit/MultiEdit operations (excluding Write operations for better precision)

### Fixed
- **Test Suite Robustness**: Updated component discovery tests to be more resilient to changes in embedded hook counts
  - Tests now use dynamic counts and functional assertions instead of hardcoded numbers
  - Improved test reliability for component registry validation
  - Better handling of embedded hook discovery in test scenarios

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
- Added command execution guidelines from debugging session to AGENTS.md and create-command.md
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