# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

## [Unreleased]

### Security
- Enhanced allowed-tools validation to prevent unrestricted bash access across all commands