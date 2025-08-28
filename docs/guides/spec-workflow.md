# Spec-Driven Development Workflow

## Overview

The spec workflow provides a complete specification-driven development process through four integrated commands. This systematic approach ensures thorough planning, validation, decomposition, and quality-assured implementation of features and bugfixes.

## Installation

```bash
# Install all spec commands
claudekit setup --yes --force --commands spec:create,spec:validate,spec:decompose,spec:execute

# Optional: Install STM for enhanced task management
npm install -g simple-task-master && stm init
```

## Architecture

```
┌─────────────────────────────────────────────┐
│            User Request                      │
│         "Build feature X"                    │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         spec:create                         │
│  • Analyzes problem space                   │
│  • Researches codebase                      │
│  • Generates comprehensive spec             │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         spec:validate                       │
│  • Checks completeness                      │
│  • Detects overengineering                  │
│  • Identifies gaps                          │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         spec:decompose                      │
│  • Creates self-contained tasks             │
│  • Identifies dependencies                  │
│  • Organizes implementation phases          │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│         spec:execute                        │
│  • Launches specialist agents               │
│  • Coordinates parallel work                │
│  • Ensures quality & testing                │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│       Completed Implementation              │
│  • All requirements met                     │
│  • Tests passing                            │
│  • Documentation updated                    │
└─────────────────────────────────────────────┘
```

## How It Works

### 1. Create Specification

`/spec:create <description>` generates a comprehensive technical specification:

- Analyzes the problem domain
- Searches codebase for related code
- Researches technical approaches
- Creates structured spec document in `specs/`

**Output**: `specs/feat-[name].md` or `specs/fix-[issue]-[description].md`

### 2. Validate Specification

`/spec:validate <spec-file>` analyzes specifications for:

- **Completeness**: All required sections present
- **Clarity**: Unambiguous requirements
- **Overengineering**: YAGNI principle enforcement
- **Implementability**: Can actually be built

**Output**: Validation report with gaps and recommendations

### 3. Decompose into Tasks

`/spec:decompose <spec-file>` transforms specs into actionable tasks:

- Creates self-contained implementation units
- Identifies task dependencies
- Organizes into logical phases
- Integrates with STM for persistence

**Output**: Task list with full implementation details

### 4. Execute Implementation

`/spec:execute <spec-file>` orchestrates the actual building:

- Launches appropriate specialist agents per task
- Coordinates parallel development
- Ensures testing and quality standards
- Tracks progress through completion

**Output**: Implemented feature with tests and documentation

## Usage Examples

### New Feature Development

```bash
# 1. Create specification
/spec:create Add OAuth2 authentication with Google and GitHub

# 2. Validate it's ready
/spec:validate specs/feat-oauth2-authentication.md

# 3. Break down into tasks
/spec:decompose specs/feat-oauth2-authentication.md

# 4. Execute implementation
/spec:execute specs/feat-oauth2-authentication.md
```

### Bugfix Workflow

```bash
# Create spec for bug #123
/spec:create fix-123 Memory leak in data processor

# Validate and execute
/spec:validate specs/fix-123-memory-leak.md
/spec:execute specs/fix-123-memory-leak.md
```

## Key Design Decisions

### Problem-First Approach
Validates the actual problem before suggesting solutions, preventing "solutions looking for problems".

### Overengineering Detection
Aggressively applies YAGNI (You Aren't Gonna Need It) principle to keep scope minimal and focused.

### Self-Contained Tasks
Each decomposed task contains complete implementation details, enabling parallel work without context switching.

### Quality Assurance Built-In
Every component gets reviewed and tested before being marked complete - no shortcuts allowed.

### Specialist Agent Integration
Automatically matches tasks to domain experts for optimal implementation quality.

## Specification Structure

Generated specifications follow this structure:

```markdown
# [Title]

**Status**: Draft/Approved/Implemented
**Authors**: [Name], [Date]

## Overview
Brief description and purpose

## Background/Problem Statement
Why this is needed

## Goals
What to achieve

## Non-Goals  
What's explicitly out of scope

## Technical Design
Architecture and implementation approach

## Testing Strategy
How to verify it works

## Implementation Phases
1. MVP - Core functionality
2. Enhanced - Additional features
3. Polish - Optimizations
```

## STM Integration

When Simple Task Master is installed, the workflow gains:

- **Persistent tasks** across development sessions
- **Dependency tracking** for parallel coordination  
- **Rich metadata** including validation criteria
- **Query capabilities** for task filtering

Without STM, commands fall back to TodoWrite with reduced functionality.

## Limitations

- Requires disciplined adherence to spec-first approach
- STM provides best experience but is optional
- Quality gates may feel slow but prevent technical debt
- Not suitable for trivial changes

## Benefits

The spec-driven workflow ensures:

1. **Right thing built** - Problem validation prevents wrong solutions
2. **Minimal scope** - Overengineering detection keeps things simple
3. **Complete implementation** - Nothing forgotten or half-done
4. **Quality assured** - Testing and review built into process
5. **Parallel development** - Clear dependencies enable concurrent work

## Architecture Note

This workflow embodies best practices from formal software engineering processes, adapted for AI-assisted development. The key insight is that thorough planning and validation before implementation reduces rework and ensures quality outcomes.