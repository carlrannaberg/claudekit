#!/bin/bash

# Setup script for claudekit
# This script installs Claude Code commands and hooks to your user directory

set -e

echo "Setting up claudekit..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create directories if they don't exist
mkdir -p ~/.claude/commands
mkdir -p ~/.claude/hooks

# Install commands
echo -e "${YELLOW}Installing commands...${NC}"
for cmd in .claude/commands/*.md; do
    if [ -f "$cmd" ]; then
        filename=$(basename "$cmd")
        cp "$cmd" ~/.claude/commands/
        echo -e "  ${GREEN}✓${NC} Installed $filename"
    fi
done

# Install hooks
echo -e "\n${YELLOW}Installing hooks...${NC}"
for hook in .claude/hooks/*.sh; do
    if [ -f "$hook" ]; then
        filename=$(basename "$hook")
        cp "$hook" ~/.claude/hooks/
        chmod +x ~/.claude/hooks/"$filename"
        echo -e "  ${GREEN}✓${NC} Installed $filename"
    fi
done

# Handle settings.json
echo -e "\n${YELLOW}Configuring settings...${NC}"
if [ -f ~/.claude/settings.json ]; then
    echo -e "  ${YELLOW}!${NC} Found existing settings.json"
    echo "  Would you like to:"
    echo "  1) View hook configuration to add manually"
    echo "  2) Backup existing and install new settings"
    echo "  3) Skip settings configuration"
    read -p "  Choice (1/2/3): " choice
    
    case $choice in
        1)
            echo -e "\n${YELLOW}Add this to your ~/.claude/settings.json:${NC}"
            cat .claude/settings.json
            ;;
        2)
            cp ~/.claude/settings.json ~/.claude/settings.json.bak
            cp .claude/settings.json ~/.claude/settings.json
            echo -e "  ${GREEN}✓${NC} Backed up to settings.json.bak and installed new settings"
            ;;
        3)
            echo "  Skipped settings configuration"
            ;;
    esac
else
    cp .claude/settings.json ~/.claude/settings.json
    echo -e "  ${GREEN}✓${NC} Installed settings.json"
fi

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "\nAvailable commands:"
echo "  - /checkpoint [description] - Create a git checkpoint"
echo "  - /restore [number|latest]  - Restore to a checkpoint"
echo "  - /checkpoints             - List all checkpoints"
echo "  - /agent-init              - Initialize project with AGENT.md"
echo "  - /agent-migration         - Migrate existing configs to AGENT.md"
echo "  - /create-command          - Create new slash commands"
echo "  - /spec [description]      - Generate specification documents"
echo "  - /git-commit              - Create commits following conventions"
echo "  - /gh-repo-setup [name]    - Create GitHub repository with setup"
echo -e "\nHooks installed:"
echo "  - auto-checkpoint.sh       - Auto-save on Stop event"
echo "  - typecheck.sh            - TypeScript type checking"
echo "  - eslint.sh               - ESLint code validation"
echo "  - run-related-tests.sh    - Auto-run related tests"
echo "  - validate-todo-completion.sh - Block stop with incomplete todos"
echo -e "\nDocumentation:"
echo "  - docs/checkpoint-system.md   - Checkpoint system details"
echo "  - docs/hooks-documentation.md - Hooks documentation"
echo "  - docs/agent-commands-documentation.md - AGENT.md commands guide"
echo "  - docs/create-command-documentation.md - Creating custom commands"
echo -e "\n${YELLOW}Note:${NC} Some hooks require TypeScript/ESLint setup in your project"