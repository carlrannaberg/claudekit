# Oracle Subagent Setup

The oracle subagent provides deep debugging and analysis capabilities using GPT-5 through external CLI tools.

## Requirements

### 1. Install External CLI Tools

Oracle will automatically detect and use one of these tools (in order of preference):

- **cursor-agent** - Cursor's terminal-based AI coding agent (`curl https://cursor.com/install -fsS | bash`)
- **codex** - OpenAI's official CLI coding agent (`npm install -g @openai/codex`)
- **opencode** - SST's provider-agnostic AI coding agent (`npm i -g opencode-ai@latest`)

If none are installed, oracle falls back to Claude's own capabilities.

### 2. Configure Extended Bash Timeout

Oracle needs more time for deep analysis operations:

```bash
# Using slash command (recommended)
/config:bash-timeout 20min

# Or manually in ~/.claude/settings.json
{
  "env": {
    "BASH_DEFAULT_TIMEOUT_MS": "1200000",
    "BASH_MAX_TIMEOUT_MS": "1200000"
  }
}
```

## Usage

Once configured, you can use oracle for:

- **Deep debugging**: Complex bug analysis and root cause identification
- **Code audits**: Security reviews and quality assessments
- **Architectural decisions**: Evaluating design choices and alternatives
- **Second opinions**: Getting alternative perspectives on approaches
- **Commit reviews**: Analyzing changes for correctness and impact

## Examples

```bash
# Explicit invocation
"Use the oracle agent to debug this race condition"
"Ask oracle to review this architecture"

# After running /agents-md:init for proactive usage
"Debug this complex issue" # Oracle will be used automatically
```

## Troubleshooting

**Oracle not responding?**
- Check if CLI tools are installed: `which cursor-agent codex opencode`
- Verify timeout is configured: Check `~/.claude/settings.json`
- Test oracle directly: "Use the oracle agent to test connectivity"

**Timeout errors?**
- Increase timeout to 30 minutes if needed
- Consider breaking complex analysis into smaller parts