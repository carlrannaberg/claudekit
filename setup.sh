#!/bin/bash

# Setup script for claudekit
# This script installs:
# - Commands to your user directory (~/.claude/commands/)
# - Hooks to your project directory (PROJECT/.claude/hooks/)
# - User settings with environment variables only
# - Project settings with hooks configuration

set -e

echo "Setting up claudekit..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Ask for project path for hooks installation
echo -e "\n${YELLOW}Hooks Installation:${NC}"
echo "Hooks are project-specific and should be installed in your project directory."
read -p "Enter the path to your project (or press Enter to skip hooks): " PROJECT_PATH

# Create directories if they don't exist
mkdir -p ~/.claude/commands
if [ -n "$PROJECT_PATH" ] && [ -d "$PROJECT_PATH" ]; then
    mkdir -p "$PROJECT_PATH/.claude/hooks"
fi

# Install commands
echo -e "${YELLOW}Installing commands...${NC}"
# Copy the entire commands directory structure, following symlinks to copy actual files
cp -RL .claude/commands/* ~/.claude/commands/
echo -e "  ${GREEN}✓${NC} Installed all commands"

# Install hooks
if [ -n "$PROJECT_PATH" ] && [ -d "$PROJECT_PATH" ]; then
    echo -e "\n${YELLOW}Installing hooks to $PROJECT_PATH/.claude/hooks/...${NC}"
    for hook in .claude/hooks/*.sh; do
        if [ -f "$hook" ]; then
            filename=$(basename "$hook")
            cp "$hook" "$PROJECT_PATH/.claude/hooks/"
            chmod +x "$PROJECT_PATH/.claude/hooks/$filename"
            echo -e "  ${GREEN}✓${NC} Installed $filename"
        fi
    done
else
    echo -e "\n${YELLOW}Skipping hooks installation${NC} (no valid project path provided)"
fi

# Handle user settings (environment variables only)
echo -e "\n${YELLOW}Configuring user settings...${NC}"
if [ -f ~/.claude/settings.json ]; then
    echo -e "  ${YELLOW}!${NC} Found existing user settings.json"
    echo "  Keeping your existing configuration"
else
    # Install example user settings with just environment variables
    if [ -f examples/settings.user.example.json ]; then
        cp examples/settings.user.example.json ~/.claude/settings.json
        echo -e "  ${GREEN}✓${NC} Installed user settings with bash timeout configuration"
    fi
fi

# Handle project settings (hooks configuration)
if [ -n "$PROJECT_PATH" ] && [ -d "$PROJECT_PATH" ]; then
    echo -e "\n${YELLOW}Configuring project settings...${NC}"
    if [ -f "$PROJECT_PATH/.claude/settings.json" ]; then
        echo -e "  ${YELLOW}!${NC} Found existing project settings.json"
        echo "  Would you like to:"
        echo "  1) View hook configuration to add manually"
        echo "  2) Backup existing and install new settings"
        echo "  3) Skip settings configuration"
        read -p "  Choice (1/2/3): " choice
        
        case $choice in
            1)
                echo -e "\n${YELLOW}Add this to your $PROJECT_PATH/.claude/settings.json:${NC}"
                cat .claude/settings.json
                ;;
            2)
                cp "$PROJECT_PATH/.claude/settings.json" "$PROJECT_PATH/.claude/settings.json.bak"
                cp .claude/settings.json "$PROJECT_PATH/.claude/settings.json"
                echo -e "  ${GREEN}✓${NC} Backed up to settings.json.bak and installed new settings"
                ;;
            3)
                echo "  Skipped project settings configuration"
                ;;
        esac
    else
        mkdir -p "$PROJECT_PATH/.claude"
        cp .claude/settings.json "$PROJECT_PATH/.claude/settings.json"
        echo -e "  ${GREEN}✓${NC} Installed project settings.json with hooks configuration"
    fi
fi

echo -e "\n${GREEN}Setup complete!${NC}"
echo -e "\nAvailable commands:"
echo "  - /checkpoint:create [description] - Create a git checkpoint"
echo "  - /checkpoint:restore [number|latest] - Restore to a checkpoint"
echo "  - /checkpoint:list         - List all checkpoints"
echo "  - /agent:init              - Initialize project with AGENT.md"
echo "  - /agent:migration         - Migrate existing configs to AGENT.md"
echo "  - /create-command          - Create new slash commands"
echo "  - /spec:create [description] - Generate specification documents"
echo "  - /spec:validate [file]      - Analyze specification completeness"
echo "  - /spec:decompose [file]     - Decompose spec into TaskMaster tasks"
echo "  - /spec:execute [file]       - Execute specification with agents"
echo "  - /validate-and-fix        - Run checks and auto-fix issues"
echo "  - /git:commit              - Create commits following conventions"
echo "  - /git:status              - Intelligent git status analysis"
echo "  - /git:push                - Safe push with pre-flight checks"
echo "  - /gh:repo-init [name]     - Create GitHub repository with setup"
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

echo -e "\n${GREEN}Optional: Enable Context7 MCP Server${NC}"
echo "For enhanced /spec command features with library documentation:"
echo "  1. npm install -g @upstash/context7-mcp"
echo "  2. claude mcp add context7 context7-mcp"
echo "  3. Check connection with /mcp command"