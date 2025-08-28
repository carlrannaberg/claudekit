# Research Workflow: Multi-Agent Research Command

## Overview

The `/research` command implements a multi-agent research system inspired by Anthropic's production architecture. It orchestrates multiple specialized AI agents working in parallel to conduct research, then synthesizes their findings into a comprehensive report.

## Installation

```bash
# Install both the command and subagent
claudekit setup --yes --force --commands research --agents research-expert
```

## Architecture

```
┌─────────────────────────────────────────────┐
│              User Query                      │
└─────────────────┬───────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│        Lead Agent (Claude Opus)             │
│  • Classifies query (breadth/depth/simple)  │
│  • Determines resource allocation           │
│  • Creates research plan                    │
└─────────────────┬───────────────────────────┘
                  ↓ Parallel Spawning
    ┌─────────────┼─────────────┐
    ↓             ↓             ↓
┌──────────┐ ┌──────────┐ ┌──────────┐
│ Expert 1 │ │ Expert 2 │ │Expert 3-10│
│ (Sonnet) │ │ (Sonnet) │ │ (Sonnet) │
└────┬─────┘ └────┬─────┘ └────┬─────┘
     ↓            ↓            ↓
 Write to     Write to     Write to
 /tmp/*.md    /tmp/*.md    /tmp/*.md
     ↓            ↓            ↓
    └─────────────┼─────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│        Synthesis (Lead Agent)               │
│  • Reads all artifact files                 │
│  • Merges and deduplicates                 │
│  • Creates final report                     │
└─────────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────────┐
│           User Receives:                    │
│  • Executive summary                        │
│  • Path to full report                      │
│  • Key insights                             │
└─────────────────────────────────────────────┘
```

## How It Works

### 1. Query Classification

The command first classifies your query into one of three types:

- **Breadth-First**: Multiple independent topics to explore (5-10 agents)
- **Depth-First**: Single complex topic requiring deep understanding (2-4 agents)  
- **Simple Factual**: Quick fact verification (1-2 agents)

### 2. Parallel Agent Spawning

Based on classification, spawns multiple `research-expert` agents in a single message using the Task tool. Each agent receives a task with a mode indicator:

- `"Quick check:"` - Tells agent to do 3-5 searches
- `"Investigate:"` - Tells agent to do 5-10 searches
- `"Deep dive:"` - Tells agent to do 10-15 searches

### 3. Filesystem Artifacts

To reduce token usage, each research agent:
1. Writes full findings to `/tmp/research_[date]_[topic].md`
2. Returns only a brief summary and file path

### 4. Synthesis

The lead agent:
1. Reads all research artifact files
2. Merges and deduplicates findings
3. Creates final report at `/tmp/research_final_[timestamp].md`
4. Shows executive summary to user

## Usage Examples

```bash
# Simple fact
/research When was GPT-4 released?

# Comparison (breadth-first)
/research Compare React, Vue, and Angular frameworks

# Deep technical topic (depth-first)  
/research Explain how transformer self-attention works

# Broad survey
/research List all major AI research labs and their focus areas
```

## What to Expect

The command will:
1. Analyze your query and determine the approach
2. Launch appropriate number of research agents (max 10 in Claude Code)
3. Each agent will search the web based on assigned focus area
4. Results saved to markdown files in `/tmp/`
5. Final synthesized report delivered

## Key Design Decisions

### Query Classification
Determines resource allocation and search strategy based on query type.

### Trigger Word Protocol  
The lead agent uses specific phrases to control subagent behavior, ensuring appropriate search depth for each task.

### Filesystem Pattern
Reduces token usage by having agents write to files rather than passing full reports through conversation context.

### Parallel Execution
All agents launched in one message for true parallelization rather than sequential execution.

## Limitations

- Maximum 10 concurrent subagents (Claude Code limit)
- Research agents need web access to function
- Reports saved to `/tmp/` directory (requires write access)
- Quality depends on available web sources

## Files Created

```bash
# Individual agent reports
/tmp/research_[YYYYMMDD]_[topic_slug].md

# Final synthesized report  
/tmp/research_final_[timestamp].md
```

## Architecture Note

This implementation follows patterns from Anthropic's blog post about their multi-agent research system, adapted for Claude Code's capabilities and constraints. The key insight is using parallel agents with separate context windows to explore different aspects simultaneously, then synthesizing findings.