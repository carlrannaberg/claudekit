#!/usr/bin/env bash

################################################################################
# Documentation Validation Script                                              #
# Systematically checks documentation accuracy against implementation          #
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to log errors
log_error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to log success
log_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to log warnings
log_warning() {
    echo -e "${YELLOW}⚠ WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to extract and validate JSON blocks
validate_json_blocks() {
    local file="$1"
    local line_num=0
    local in_json=false
    local json_content=""
    local json_start_line=0
    
    echo "Validating JSON blocks in $file..."
    
    while IFS= read -r line; do
        ((line_num++))
        
        if [[ "$line" == '```json' ]]; then
            in_json=true
            json_content=""
            json_start_line=$line_num
        elif [[ "$line" == '```' ]] && [[ "$in_json" == true ]]; then
            in_json=false
            # Validate the JSON
            if echo "$json_content" | jq empty 2>/dev/null; then
                log_success "Valid JSON at line $json_start_line"
                
                # Check if it's a claudekit config
                if echo "$json_content" | jq -e '.hooks."codebase-map"' >/dev/null 2>&1; then
                    # Validate against TypeScript schema
                    if command -v node >/dev/null 2>&1 && [[ -f "dist/types/claudekit-config.js" ]]; then
                        node -e "
                            const { validateClaudekitConfig } = require('./dist/types/claudekit-config.js');
                            const config = JSON.parse('$json_content');
                            const result = validateClaudekitConfig(config);
                            if (!result.valid) {
                                console.error('Schema validation failed:', result.errors);
                                process.exit(1);
                            }
                        " 2>/dev/null || log_error "JSON at line $json_start_line doesn't match ClaudekitConfig schema"
                    fi
                fi
            else
                log_error "Invalid JSON at line $json_start_line"
            fi
        elif [[ "$in_json" == true ]]; then
            json_content+="$line"$'\n'
        fi
    done < "$file"
}

# Function to validate CLI commands
validate_cli_commands() {
    local file="$1"
    
    echo "Validating CLI commands in $file..."
    
    # Extract npm install commands
    grep -n 'npm install.*codebase-map' "$file" | while IFS=: read -r line_num command; do
        # Check if package name is correct
        if [[ "$command" =~ "@carlrannaberg/codebase-map" ]]; then
            log_error "Line $line_num: Incorrect package name '@carlrannaberg/codebase-map' (should be 'codebase-map')"
        else
            log_success "Line $line_num: Correct package name 'codebase-map'"
        fi
    done
    
    # Extract codebase-map commands
    grep -n 'codebase-map ' "$file" | while IFS=: read -r line_num command; do
        # Extract the actual command
        cmd=$(echo "$command" | sed 's/.*\(codebase-map [^`]*\).*/\1/')
        
        # Check if command is valid
        if [[ "$cmd" =~ ^codebase-map\ (scan|format|update|help) ]]; then
            log_success "Line $line_num: Valid codebase-map command"
        else
            log_warning "Line $line_num: Unrecognized codebase-map command: $cmd"
        fi
    done
}

# Function to check configuration file paths
validate_config_paths() {
    local file="$1"
    
    echo "Validating configuration file paths in $file..."
    
    # Check for correct config file path
    if grep -q '\.claudekit/config\.json' "$file"; then
        log_success "Correct config path: .claudekit/config.json"
    fi
    
    # Check for incorrect paths
    if grep -q '"codebaseMap"' "$file"; then
        log_error "Found incorrect 'codebaseMap' key (should be under 'hooks.codebase-map')"
    fi
}

# Function to validate hook configurations
validate_hook_configs() {
    local file="$1"
    
    echo "Validating hook configurations in $file..."
    
    # Check for correct hook events
    grep -n '"UserPromptSubmit"' "$file" | while IFS=: read -r line_num _; do
        log_success "Line $line_num: Correct event 'UserPromptSubmit' for codebase-map"
    done
    
    grep -n '"PostToolUse"' "$file" | while IFS=: read -r line_num _; do
        log_success "Line $line_num: Correct event 'PostToolUse' for codebase-map-update"
    done
    
    # Check for incorrect events
    if grep -q '"SessionStart".*codebase-map' "$file"; then
        log_error "SessionStart is wrong event for codebase-map (should be UserPromptSubmit)"
    fi
}

# Main validation
main() {
    local doc_file="${1:-docs/guides/codebase-map.md}"
    
    if [[ ! -f "$doc_file" ]]; then
        log_error "File not found: $doc_file"
        exit 1
    fi
    
    echo "========================================="
    echo "Validating documentation: $doc_file"
    echo "========================================="
    echo
    
    validate_json_blocks "$doc_file"
    echo
    validate_cli_commands "$doc_file"
    echo
    validate_config_paths "$doc_file"
    echo
    validate_hook_configs "$doc_file"
    
    echo
    echo "========================================="
    echo "Validation Summary:"
    echo "  Errors: $ERRORS"
    echo "  Warnings: $WARNINGS"
    echo "========================================="
    
    if [[ $ERRORS -gt 0 ]]; then
        echo -e "${RED}Documentation has errors that need to be fixed${NC}"
        exit 1
    elif [[ $WARNINGS -gt 0 ]]; then
        echo -e "${YELLOW}Documentation has warnings to review${NC}"
        exit 0
    else
        echo -e "${GREEN}Documentation is accurate!${NC}"
        exit 0
    fi
}

# Run main function
main "$@"