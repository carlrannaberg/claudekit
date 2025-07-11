# MCP Setup for claudekit

This document explains the Model Context Protocol (MCP) integration used by claudekit commands.

## Overview

claudekit includes a project-level MCP configuration (`.mcp.json`) that enables enhanced features for certain commands. The configuration is shared with all team members through version control.

## Context7 MCP Server

The Context7 MCP server provides access to up-to-date library documentation from various package managers and frameworks.

### What It Provides

- `mcp__context7__resolve-library-id` - Find libraries across npm, PyPI, Go modules, etc.
- `mcp__context7__get-library-docs` - Retrieve current documentation, examples, and best practices

### Used By

- `/spec` command - Fetches external library documentation when creating specifications

### Installation

The server is configured in `.mcp.json` and uses npx to run without requiring global installation:

```json
{
  "mcpServers": {
    "context7": {
      "type": "stdio",
      "command": "npx",
      "args": ["@context7/mcp-server"],
      "env": {}
    }
  }
}
```

### First Time Setup

When you first use a command that requires Context7 (like `/spec` with external libraries):

1. Claude Code will detect the `.mcp.json` file
2. You'll be prompted to approve using project-scoped MCP servers
3. The Context7 server will be automatically downloaded via npx
4. Future uses will be faster as npx caches the package

### Security Note

- The Context7 server only provides read access to public documentation
- No authentication or API keys required
- Runs locally via stdio (standard input/output)
- Safe for team sharing through version control

## Benefits

1. **Always Current** - Fetches latest documentation, not outdated cached versions
2. **Multi-Language** - Supports npm, PyPI, Go modules, and more
3. **Official Examples** - Retrieves code examples from official docs
4. **Best Practices** - Includes recommended patterns and usage

## Troubleshooting

If the Context7 server isn't working:

1. **Check MCP Status**
   ```
   /mcp
   ```
   This shows all configured servers and their connection status.

2. **Verify npm/npx is installed**
   ```bash
   npm --version
   npx --version
   ```

3. **Clear npx cache if needed**
   ```bash
   npx clear-npx-cache
   ```

4. **Reset project MCP choices**
   ```bash
   claude mcp reset-project-choices
   ```

## Adding More MCP Servers

To add additional MCP servers to the project:

```bash
# Add to project scope (shared with team)
claude mcp add -s project server-name /path/to/server

# This updates .mcp.json automatically
```

## Privacy & Security

- Project-scoped MCP servers require explicit approval
- The `.mcp.json` file is designed for version control
- Avoid storing sensitive credentials in `.mcp.json`
- Use environment variables for API keys: `${API_KEY}`

## Learn More

- [MCP Documentation](https://modelcontextprotocol.io)
- [Claude Code MCP Guide](https://docs.anthropic.com/en/docs/claude-code/mcp)
- [Context7 MCP Server](https://www.npmjs.com/package/@context7/mcp-server)