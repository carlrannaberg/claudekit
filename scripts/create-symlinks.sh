#!/usr/bin/env bash
set -euo pipefail

################################################################################
# Create Symlinks for Commands and Agents                                     #
# Creates symlinks in .claude/ pointing to src/ for development               #
################################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "🔗 Creating symlinks for claudekit components..."
echo ""

# Create .claude directory if it doesn't exist
if [ ! -d ".claude" ]; then
    mkdir -p .claude
    echo "Created .claude directory"
fi

# Function to create symlinks for a directory
create_symlinks() {
    local source_dir="$1"
    local target_dir="$2"
    local type_name="$3"
    
    # Create target directory if it doesn't exist
    if [ ! -d "$target_dir" ]; then
        mkdir -p "$target_dir"
        echo "Created $target_dir directory"
    fi
    
    # Count for statistics
    local created=0
    local updated=0
    local skipped=0
    
    # Process each item in source directory
    if [ -d "$source_dir" ]; then
        for item in "$source_dir"/*; do
            if [ -e "$item" ]; then
                local basename="$(basename "$item")"
                local target="$target_dir/$basename"
                local relative_source="../../$item"
                
                # Check if symlink already exists and points to correct location
                if [ -L "$target" ]; then
                    current_target="$(readlink "$target")"
                    if [ "$current_target" = "$relative_source" ]; then
                        ((skipped++))
                    else
                        # Update incorrect symlink
                        rm "$target"
                        ln -s "$relative_source" "$target"
                        ((updated++))
                        echo -e "${YELLOW}↻${NC} Updated: $target"
                    fi
                elif [ -e "$target" ]; then
                    # Regular file exists, skip
                    echo -e "${RED}⚠${NC} Skipping $target (regular file exists)"
                    ((skipped++))
                else
                    # Create new symlink
                    ln -s "$relative_source" "$target"
                    ((created++))
                    echo -e "${GREEN}✓${NC} Created: $target"
                fi
            fi
        done
    else
        echo -e "${YELLOW}⚠${NC} Source directory not found: $source_dir"
    fi
    
    # Report statistics
    echo ""
    echo "$type_name summary:"
    echo "  Created: $created new symlinks"
    echo "  Updated: $updated existing symlinks"
    echo "  Skipped: $skipped unchanged items"
    echo ""
}

# Create symlinks for commands
echo "📝 Processing commands..."
create_symlinks "src/commands" ".claude/commands" "Commands"

# Create symlinks for agents (subagents)
echo "🤖 Processing agents..."
create_symlinks "src/agents" ".claude/agents" "Agents"

echo -e "${GREEN}✨ Symlink creation complete!${NC}"
echo ""
echo "Symlinks point from .claude/ to src/ for development."
echo "This allows you to edit files in src/ and have changes reflected immediately."