# MCP Setup for claudekit

This document explains the Model Context Protocol (MCP) integration used by claudekit commands.

## Overview

claudekit commands can leverage MCP servers for enhanced features. While the commands work without MCP, adding specific servers enables additional capabilities.

## Context7 MCP Server

The Context7 MCP server provides access to up-to-date library documentation from various package managers and frameworks.

### What It Provides

- `mcp__context7__resolve-library-id` - Find libraries across npm, PyPI, Go modules, etc.
- `mcp__context7__get-library-docs` - Retrieve current documentation, examples, and best practices

### Used By

- `/spec` command - Fetches external library documentation when creating specifications

### Installation

To enable Context7 in your project:

```bash
# Step 1: Install the Context7 MCP server globally
# Using your preferred package manager:
# npm:
npm install -g @upstash/context7-mcp

# yarn:
yarn global add @upstash/context7-mcp

# pnpm:
pnpm add -g @upstash/context7-mcp

# Step 2: Add it to Claude Code
claude mcp add context7 context7-mcp
```

**Note**: Due to PATH issues with package manager executors (npx/yarn dlx/pnpm dlx) in Claude Code, we recommend installing the package globally first.

### First Time Setup

After installation:

1. Restart Claude Code to pick up the new MCP server
2. Check the connection status with `/mcp`
3. The Context7 server will be available for all commands that use it
4. You can now use `/spec` with external library documentation

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

2. **Verify your package manager is installed**
   ```bash
   # For npm:
   npm --version
   npx --version
   
   # For yarn:
   yarn --version
   
   # For pnpm:
   pnpm --version
   ```

3. **Clear package manager cache if needed**
   ```bash
   # For npm/npx:
   npx clear-npx-cache
   
   # For yarn:
   yarn cache clean
   
   # For pnpm:
   pnpm store prune
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
- [Claude Code MCP Guide](https://docs.claude.com/en/docs/claude-code/mcp)
- [Context7 MCP Server](https://www.npmjs.com/package/@upstash/context7-mcp)