# Claude Code Analysis Tools

Comprehensive TypeScript tools for analyzing Claude Code session performance and git productivity metrics.

## Tools

### 🧠 Session Analyzer (`session-analyzer.ts`)
Analyzes Claude Code session files for productivity patterns:
- Event frequency and timing
- Activity vs idle time breakdown  
- Break patterns and work rhythms
- Peak performance hours
- Endurance scoring

### 📊 Git Analyzer (`git-analyzer.ts`) 
Analyzes git commit history for code generation metrics:
- Lines of code generated
- Language breakdown
- Commit frequency and size
- Productivity rates (lines/hour)
- Code quality indicators

### 🚀 Combined Analyzer (`cc-analyzer.ts`)
Comprehensive analysis combining both session and git data:
- Cross-metric productivity insights
- Code generation per interaction
- Efficiency ratings
- Overall performance scoring

## Quick Start

```bash
# Install dependencies
npm install

# Analyze the famous 9-hour session
npm run example

# Test with included session data
npm run test-9h    # 9-hour uninterrupted period only
npm run test-full  # Full 14-hour session

# Custom analysis
tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --end "2025-07-20T03:20:28Z"

# Session data only
tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --session-only

# Git history only  
tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --git-only
```

## Usage Examples

### Analyze Recent Session
```bash
# Last 2 hours
tsx cc-analyzer.ts --start "$(date -u -d '2 hours ago' +%Y-%m-%dT%H:%M:%SZ)"

# Today's work
tsx cc-analyzer.ts --start "$(date -u +%Y-%m-%d)T00:00:00Z"
```

### Specific Time Ranges
```bash
# 9-hour uninterrupted session
tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --end "2025-07-20T03:20:28Z"

# Full session including sleep break
tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --end "2025-07-20T07:45:35Z"
```

### Session File Discovery
The tools automatically find the correct session file based on timestamp, but you can specify manually:
```bash
tsx cc-analyzer.ts --start "2025-07-19T17:46:57Z" --session-file ~/.claude/projects/-Users-carl-Development-agents-claudekit/f3fa436d-4f0e-4910-9989-7fa983c19c27.jsonl
```

## Output Metrics

### Session Metrics
- **Events per hour/minute**: Interaction frequency
- **Active time percentage**: Focus vs break time  
- **Gap analysis**: Break patterns (short/moderate/long)
- **Peak hours**: Most productive time periods
- **Performance scores**: Efficiency and endurance ratings

### Git Metrics  
- **Lines per hour**: Code generation rate
- **Language breakdown**: TypeScript, JavaScript, etc.
- **Commit patterns**: Size and frequency
- **Code vs non-code**: Actual implementation vs docs/config

### Combined Insights
- **Code per interaction**: Lines generated per Claude event
- **Code per active hour**: Productivity during focused time
- **Efficiency rating**: Overall productivity assessment
- **Performance highlights**: Exceptional metrics

## Example Output

```
🚀 COMPREHENSIVE CLAUDE CODE PERFORMANCE ANALYSIS
======================================================================

📅 ANALYSIS PERIOD
   Start: 2025-07-19T17:46:57Z
   End: 2025-07-20T03:20:28Z  
   Duration: 9h 33m

🧠 CLAUDE CODE SESSION METRICS
   Total Interactions: 3,670
   Events per Hour: 384.3
   Active Time: 10h 46m (77.1%)
   Session Performance: 96/100

💻 CODE GENERATION METRICS
   Commits Created: 1
   Total Lines: 22,699
   Code Lines: 16,155
   Lines per Hour: 1,795.0
   Avg Lines per Commit: 22,699.0

🎯 PRODUCTIVITY INSIGHTS
   Code per Interaction: 4.4 lines
   Code per Active Hour: 1,500.0 lines
   Efficiency Rating: Exceptional
   Overall Performance: 98/100

🏆 PERFORMANCE ASSESSMENT
   🌟 LEGENDARY PERFORMANCE - World-class productivity!

✨ STANDOUT METRICS
   🎯 77.1% active time - Exceptional focus!
   🎯 1500 lines/hour - Elite coding speed!
   🎯 9h 33m sustained session - Remarkable endurance!
   🎯 22699 lines/commit - Substantial contributions!
```

## Requirements

- Node.js with TypeScript support (`tsx`)
- Git repository for git analysis
- Claude Code session files (automatically located)

## Notes

- Session files are automatically discovered in `~/.claude/projects/`
- Handles timezone conversions and ISO timestamps
- Filters code vs documentation/configuration files
- Provides performance benchmarking and scoring