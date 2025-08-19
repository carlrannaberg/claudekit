# Claudekit Workflow Definition and Bundling Rubric

**Date:** 2025-01-22  
**Analysis Based On:** Commands, subagents, hooks, and configuration patterns in claudekit codebase

## Executive Summary

This rubric provides comprehensive criteria for defining workflows in claudekit and bundling components (commands, hooks, subagents) into cohesive user experiences. Based on analysis of 19 commands, 25+ subagents, 15+ hooks, and existing configuration patterns, we've identified clear principles for workflow organization that maximize user value while minimizing complexity.

## 1. Workflow Definition Criteria

### Core Definition

A **workflow** in claudekit is a cohesive collection of components that work together to accomplish a complete developer task or solve a specific category of problems.

### Primary Criteria (Must Meet All)

1. **Task Completeness**: The workflow enables a developer to complete an entire task category without requiring external tools or manual steps
2. **Component Synergy**: Commands, hooks, and subagents work together with clear handoffs and shared context
3. **User Intent Alignment**: Maps directly to how developers think about and organize their work
4. **Atomic Value**: Provides meaningful value even when used in isolation

### Secondary Criteria (Should Meet Most)

1. **Consistent Mental Model**: Components share terminology, concepts, and interaction patterns
2. **Progressive Enhancement**: Basic functionality works without all components; additional components add value
3. **Clear Entry Points**: Obvious starting commands or triggers for the workflow
4. **Feedback Loops**: Components provide status and progress information to guide user actions

## 2. Component Bundling Principles

### Bundling Hierarchy

```
Workflow
├── Primary Commands (1-3)    # Main entry points
├── Supporting Commands (0-5)  # Complementary actions  
├── Expert Subagents (1-4)    # Domain specialists
├── Validation Hooks (1-6)    # Quality assurance
└── Automation Hooks (0-3)    # Background tasks
```

### Bundling Rules

#### Commands
- **Primary Commands**: Max 3 per workflow, represent core user intents
- **Supporting Commands**: Max 5 per workflow, handle edge cases or advanced features
- **Namespace Consistency**: Related commands should share namespace (e.g., `git:*`, `spec:*`)

#### Subagents  
- **Domain Alignment**: Include specialists for the workflow's primary technical domains
- **Expertise Coverage**: Cover 80%+ of common issues in the workflow
- **Triage Integration**: Always include triage-expert for complex workflows

#### Hooks
- **Event Matching**: Align trigger events with workflow activities
- **Validation Chain**: Include quality checks appropriate to the workflow
- **Performance Impact**: Limit to 6 validation hooks per trigger event

### Anti-Bundling Patterns

❌ **Avoid These Bundling Mistakes:**
- **Kitchen Sink**: Including every possible related component
- **Circular Dependencies**: Commands that require each other to function
- **Tool Sprawl**: Including tools that solve the same problem differently
- **Context Switching**: Components that require different mental models

## 3. Identified Workflows from Analysis

### Core Development Workflow
**Purpose**: Daily coding with quality assurance
- **Commands**: `/validate-and-fix`, `/dev:cleanup`
- **Hooks**: `typecheck-changed`, `lint-changed`, `test-changed`, `check-any-changed`
- **Subagents**: `triage-expert`, `code-review-expert`, `refactoring-expert`
- **Score**: 9.5/10 - Extremely cohesive, addresses core daily needs

### Git Management Workflow  
**Purpose**: Version control with intelligent assistance
- **Commands**: `/git:status`, `/git:commit`, `/git:push`
- **Hooks**: `create-checkpoint`
- **Subagents**: `git-expert`
- **Score**: 9/10 - Complete git workflow with smart automation

### Checkpoint Workflow
**Purpose**: Save and restore work states
- **Commands**: `/checkpoint:create`, `/checkpoint:list`, `/checkpoint:restore`  
- **Hooks**: `create-checkpoint` (on Stop/SubagentStop)
- **Score**: 8.5/10 - Simple but complete state management

### Specification Workflow
**Purpose**: Feature planning and implementation tracking
- **Commands**: `/spec:create`, `/spec:validate`, `/spec:decompose`, `/spec:execute`
- **Subagents**: Context-aware based on spec content
- **Score**: 8/10 - Comprehensive planning workflow

### Project Setup Workflow
**Purpose**: Initialize projects with claudekit integration
- **Commands**: `/agent-md:init`, `/gh:repo-init`, `/create-command`, `/create-subagent`
- **Hooks**: Various validation hooks
- **Score**: 7.5/10 - Good setup experience, could be more integrated

### Code Review Workflow  
**Purpose**: Multi-aspect code analysis
- **Commands**: `/code-review`
- **Subagents**: `code-review-expert` (parallel instances)
- **Hooks**: `self-review`
- **Score**: 8.5/10 - Innovative parallel review approach

## 4. Overlap Management Strategy

### Overlap Categories

#### Type 1: Beneficial Overlap
- **Cross-cutting Concerns**: Components like `triage-expert` that benefit multiple workflows
- **Shared Infrastructure**: Hooks like `create-checkpoint` used across workflows
- **Common Patterns**: Configuration and error handling consistency

#### Type 2: Acceptable Overlap  
- **Similar Functionality**: Different approaches to the same goal (e.g., manual vs automated validation)
- **Specialization Levels**: General vs specific versions of the same capability

#### Type 3: Problematic Overlap
- **Duplicate Commands**: Multiple commands that do exactly the same thing
- **Conflicting Automation**: Hooks that interfere with each other
- **Redundant Subagents**: Multiple agents with identical capabilities

### Resolution Strategies

1. **Shared Components**: Move beneficial overlaps to a "Core" workflow
2. **Conditional Inclusion**: Allow users to choose between overlapping options
3. **Hierarchy**: Prefer more specific over general components when overlap exists
4. **Deprecation**: Remove redundant components in favor of better alternatives

## 5. User Experience Guidelines

### Workflow Selection Principles

#### Discovery Flow
1. **Task-First Design**: Present workflows based on what users want to accomplish
2. **Progressive Disclosure**: Show simple options first, advanced configurations later
3. **Clear Dependencies**: Explicitly state what each workflow requires
4. **Impact Preview**: Show what components will be installed/configured

#### Setup Experience
```
Which development workflows do you use?

□ Core Development (typecheck, lint, test on file changes)
  Components: 4 hooks, 3 subagents, 2 commands

□ Git Management (smart commits, auto-checkpointing) 
  Components: 1 hook, 1 subagent, 3 commands

□ Specification Planning (feature specs, decomposition)
  Components: 0 hooks, 0 subagents, 4 commands

□ Advanced (All workflows + project setup tools)
  Components: 15 hooks, 25+ subagents, 19 commands
```

### Workflow Activation Patterns

#### Gradual Activation
- Start with minimal viable workflow
- Add components based on usage patterns
- Prompt for upgrades when beneficial

#### Profile-Based Selection
- **Frontend Developer**: React experts + testing + git workflows  
- **Backend Developer**: Database experts + API testing + deployment
- **Full-Stack**: Comprehensive coverage across domains

## 6. Technical Architecture Requirements

### Configuration Structure

```json
{
  "workflows": {
    "core-development": {
      "enabled": true,
      "components": {
        "hooks": ["typecheck-changed", "lint-changed", "test-changed"],
        "commands": ["validate-and-fix", "dev:cleanup"],
        "subagents": ["triage-expert", "code-review-expert"]
      },
      "settings": {
        "validation-strictness": "medium",
        "auto-fix": true
      }
    }
  }
}
```

### Component Registration

```typescript
interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  category: 'essential' | 'productivity' | 'advanced';
  dependencies: string[];
  components: {
    commands: ComponentReference[];
    hooks: ComponentReference[];
    subagents: ComponentReference[];
  };
  conflicts: string[]; // Incompatible workflows
  settings: WorkflowSettings;
}
```

### Installation Architecture
- **Modular Installation**: Install only required components per workflow
- **Dependency Resolution**: Automatically handle shared components
- **Conflict Detection**: Warn about incompatible combinations
- **Rollback Support**: Easy removal of entire workflows

## 7. Evaluation Framework

### Workflow Cohesion Score (0-10)

| Dimension | Weight | Scoring Criteria |
|-----------|--------|------------------|
| Task Completeness | 25% | 10 = Fully complete task; 5 = Requires external tools; 0 = Major gaps |
| Component Synergy | 25% | 10 = Perfect handoffs; 5 = Some integration; 0 = Isolated components |
| User Mental Model | 20% | 10 = Intuitive grouping; 5 = Mostly logical; 0 = Confusing organization |
| Value Delivery | 15% | 10 = High immediate value; 5 = Moderate benefit; 0 = Marginal improvement |
| Implementation Quality | 15% | 10 = Excellent code quality; 5 = Good implementation; 0 = Poor quality |

### Component Relationship Score (0-10)

| Factor | Description | Score Calculation |
|--------|-------------|-------------------|
| Dependency Strength | How tightly coupled are components? | Strong=10, Loose=5, None=0 |
| Data Flow | Do components share context effectively? | Seamless=10, Manual=5, None=0 |
| Error Handling | Consistent error patterns across components? | Unified=10, Partial=5, Inconsistent=0 |
| Configuration | Shared configuration patterns? | Unified=10, Similar=5, Different=0 |

### Adoption Potential Score (0-10)

Based on:
- **Learning Curve**: How easy to understand and use?
- **Setup Complexity**: How difficult to configure?
- **Maintenance Burden**: How much ongoing effort required?
- **Community Value**: How many developers would benefit?

### Technical Maintainability Score (0-10)

Evaluated on:
- **Code Quality**: Following established patterns?
- **Test Coverage**: Comprehensive testing strategy?
- **Documentation**: Clear user and developer docs?
- **Extensibility**: Easy to add new components?

## 8. Workflow Recommendations

### High-Priority Workflows (Implement First)

1. **Core Development Workflow** (Score: 9.5)
   - Highest user value, excellent component integration
   - Already largely implemented, needs packaging

2. **Git Management Workflow** (Score: 9.0)  
   - Complete workflow with intelligent automation
   - Strong adoption potential, low maintenance

3. **Code Review Workflow** (Score: 8.5)
   - Innovative multi-aspect parallel review
   - Unique value proposition, good technical implementation

### Medium-Priority Workflows

4. **Checkpoint Workflow** (Score: 8.5)
   - Simple but valuable state management
   - Good complement to Git workflow

5. **Specification Workflow** (Score: 8.0)
   - Comprehensive planning support
   - Appeals to methodical developers

### Lower-Priority Workflows  

6. **Project Setup Workflow** (Score: 7.5)
   - Important but less frequently used
   - Needs better integration between components

## 9. Implementation Roadmap

### Phase 1: Workflow Packaging System
- [ ] Create workflow definition schema
- [ ] Implement workflow configuration loader
- [ ] Build component dependency resolver
- [ ] Add conflict detection system

### Phase 2: User Experience
- [ ] Design workflow selection interface
- [ ] Implement progressive activation
- [ ] Create profile-based recommendations
- [ ] Add workflow status/health monitoring

### Phase 3: Core Workflows
- [ ] Package Core Development workflow
- [ ] Package Git Management workflow  
- [ ] Package Code Review workflow
- [ ] Test cross-workflow interactions

### Phase 4: Advanced Features
- [ ] Custom workflow creation
- [ ] Workflow sharing/templates
- [ ] Usage analytics and optimization
- [ ] Advanced conflict resolution

## 10. Success Metrics

### Quantitative Metrics
- **Adoption Rate**: % of users who enable each workflow
- **Completion Rate**: % who complete workflow setup
- **Usage Frequency**: How often workflow components are used
- **Error Rate**: Failed workflow activations
- **Performance**: Time to complete common tasks

### Qualitative Metrics  
- **User Satisfaction**: Survey feedback on workflow utility
- **Mental Model Alignment**: Do workflows match user expectations?
- **Discoverability**: Can users find relevant workflows?
- **Integration Quality**: Do components work well together?

## Conclusion

This rubric provides a structured approach to bundling claudekit components into workflows that deliver maximum user value. The analysis reveals that claudekit already has strong foundations for several high-value workflows, particularly around code quality and git management.

The key insight is that workflows should be organized around complete developer tasks rather than technical boundaries. Users think in terms of "ensuring code quality" or "managing git history", not "running TypeScript hooks" or "configuring subagents".

The recommended implementation approach focuses on packaging existing components into intuitive workflows while building the infrastructure for easy workflow management and customization.