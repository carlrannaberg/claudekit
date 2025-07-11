# claudekit

A toolkit of custom commands, hooks, and utilities for Claude Code.

## Overview

claudekit is a collection of slash commands, hooks, and utilities designed to enhance your Claude Code experience. It provides powerful tools for development workflows, including git checkpointing, custom automations, and more.

## Features

- **Git Checkpoint System**: Create and restore git stash checkpoints without affecting your working directory
- **Custom Slash Commands**: Extend Claude Code with your own commands
- **Hooks**: Automate tasks with pre/post execution hooks
- **Utilities**: Various helper scripts and tools

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/carlrannaberg/claudekit.git
   cd claudekit
   ```

2. Run the setup script:
   ```bash
   ./setup.sh
   ```

   The script will:
   - Install commands to `~/.claude/commands/`
   - Install hooks to `~/.claude/hooks/`
   - Configure your `~/.claude/settings.json` (with options to backup existing settings)

## Usage

### Git Checkpoint Commands

- **`/checkpoint [description]`** - Create a checkpoint of your current work
  ```
  /checkpoint before refactoring auth module
  ```

- **`/restore [number|latest]`** - Restore to a previous checkpoint
  ```
  /restore        # Restore to latest checkpoint
  /restore 3      # Restore to checkpoint at stash@{3}
  ```

- **`/checkpoints`** - List all available checkpoints
  ```
  /checkpoints
  ```

### Auto-checkpoint Hook

The Stop hook automatically creates a checkpoint when Claude Code finishes responding, ensuring you never lose work between sessions.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License