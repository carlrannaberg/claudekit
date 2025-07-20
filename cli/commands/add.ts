import { Logger } from '../utils/logger.js';
import { createProgressReporter } from '../utils/progress.js';
import path from 'path';
import fs from 'fs-extra';

interface AddOptions {
  template?: string;
  path?: string;
  verbose?: boolean;
  quiet?: boolean;
  dryRun?: boolean;
}

/**
 * Add a new hook or command to the project
 */
export async function add(type: string, name: string, options: AddOptions = {}): Promise<void> {
  const logger = new Logger();
  const progressReporter = createProgressReporter({
    quiet: options.quiet,
    verbose: options.verbose,
  });

  if (options.verbose === true) {
    logger.setLevel('debug');
  } else if (options.quiet === true) {
    logger.setLevel('error');
  }

  logger.debug(`Adding ${type} "${name}" with options:`, options);

  try {
    progressReporter.start(`Adding ${type} "${name}"...`);

    // Validate type
    const validTypes = ['hook', 'command'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid type "${type}". Must be one of: ${validTypes.join(', ')}`);
    }

    // Determine target directory
    const targetDir = type === 'hook' ? '.claude/hooks' : '.claude/commands';
    const targetPath =
      options.path !== undefined && options.path !== ''
        ? options.path
        : path.join(targetDir, `${name}.${type === 'hook' ? 'sh' : 'md'}`);

    logger.debug(`Target path: ${targetPath}`);

    // Check if file already exists
    progressReporter.update('Checking for existing files...');
    if (await fs.pathExists(targetPath)) {
      throw new Error(`${type} "${name}" already exists at ${targetPath}`);
    }

    // Create directory if needed
    progressReporter.update('Creating directory structure...');
    await fs.ensureDir(path.dirname(targetPath));

    // Create file based on type and template
    progressReporter.update(`Generating ${type} template...`);
    let content = '';
    if (type === 'hook') {
      content = generateHookTemplate(name, options.template);
    } else {
      content = generateCommandTemplate(name, options.template);
    }

    progressReporter.update(`Writing ${type} file...`);
    await fs.writeFile(targetPath, content, 'utf8');

    // Make hooks executable
    if (type === 'hook') {
      progressReporter.update('Setting executable permissions...');
      await fs.chmod(targetPath, 0o755);
    }

    progressReporter.succeed(`Successfully added ${type} "${name}"`);
  } catch (error) {
    progressReporter.fail(`Failed to add ${type} "${name}"`);
    throw error;
  }
}

function generateHookTemplate(name: string, _template?: string): string {
  // Basic hook template
  // TODO: Implement template support
  return `#!/usr/bin/env bash
set -euo pipefail

################################################################################
# ${name} Hook                                                                 #
# Description: Add your hook description here                                 #
################################################################################

# Read JSON payload from stdin
PAYLOAD=$(cat)

# Extract relevant fields using jq or fallback methods
if command -v jq &> /dev/null; then
    # Use jq for JSON parsing
    TOOL_NAME=$(echo "$PAYLOAD" | jq -r '.tool_name // empty')
else
    # Fallback to sed/grep
    TOOL_NAME=$(echo "$PAYLOAD" | sed -n 's/.*"tool_name"[[:space:]]*:[[:space:]]*"\\([^"]*\\)".*/\\1/p')
fi

# Your hook logic here
echo "Hook ${name} executed for tool: $TOOL_NAME" >&2

# Exit with appropriate code
# 0 = allow operation
# 2 = block with error message
exit 0
`;
}

function generateCommandTemplate(name: string, _template?: string): string {
  // Basic command template
  // TODO: Implement template support
  return `---
description: ${name} command
allowed-tools: Read, Bash
---

# ${name}

Describe what this command does here.

## Usage

\`\`\`
/claudekit ${name} [arguments]
\`\`\`

## Steps

1. First, do this...
2. Then, do that...
3. Finally, report results...

## Arguments

- \`$ARGUMENTS\`: User-provided arguments

## Example

\`\`\`
/claudekit ${name} example-argument
\`\`\`
`;
}
