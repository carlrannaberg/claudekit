import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import chalk from 'chalk';
import { glob } from 'glob';

/**
 * Slash Command Linter
 * 
 * This tool validates slash command markdown files to ensure their frontmatter
 * conforms to the official Claude Code documentation. It identifies invalid
 * fields and validates the structure of slash commands.
 */

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Valid allowed-tools patterns
 * Can be specific tool names or tool patterns with restrictions
 */
const AllowedToolsSchema = z.string()
  .describe('Comma-separated list of allowed tools with optional restrictions');

/**
 * Valid model options per official documentation
 */
const ModelSchema = z.enum(['opus', 'sonnet', 'haiku'])
  .or(z.string()) // Also allow specific model strings
  .optional();

/**
 * Frontmatter schema for slash command markdown files
 * Based on official Claude Code slash command documentation
 */
const SlashCommandFrontmatterSchema = z.object({
  // Official fields per documentation
  'allowed-tools': AllowedToolsSchema.optional()
    .describe('List of tools the command can use'),
  'argument-hint': z.string().optional()
    .describe('The arguments expected for the slash command'),
  description: z.string().optional()
    .describe('Brief description of the command'),
  model: ModelSchema
    .describe('Model to use for this command'),
  
  // Claudekit-specific field (not in official spec but used in project)
  category: z.enum(['workflow', 'ai-assistant', 'validation']).optional()
    .describe('Claudekit: category for organizing commands'),
}).strict(); // Strict mode will catch any extra fields

/**
 * Result of linting a single file
 */
interface LintResult {
  file: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  unusedFields: string[];
  suggestions: string[];
}

// Type for unrecognized keys issue
interface UnrecognizedKeysIssue {
  code: 'unrecognized_keys';
  keys: string[];
  path: Array<string | number>;
  message: string;
}

// ============================================================================
// Linting Functions
// ============================================================================

/**
 * Validate allowed-tools field format
 */
function validateAllowedTools(tools: string | undefined): string[] {
  const warnings: string[] = [];
  
  if (tools === undefined || tools === '') {
    return warnings;
  }
  
  // Check for common tool patterns
  const validToolPatterns = [
    'Read', 'Write', 'Edit', 'MultiEdit', 'Bash', 'Grep', 'Glob', 'LS',
    'Task', 'NotebookEdit', 'WebFetch', 'WebSearch', 'TodoWrite',
    'BashOutput', 'KillBash', 'ExitPlanMode'
  ];
  
  // Parse tools - they can have restrictions like Bash(git:*)
  const toolList = tools.split(',').map(t => t.trim());
  
  for (const tool of toolList) {
    // Extract base tool name (e.g., "Bash(git:*)" -> "Bash")
    const baseTool = tool.split('(')[0]?.trim() ?? '';
    
    // Check if it's an MCP tool (format: mcp__<server>__<tool>)
    const isMcpTool = baseTool.startsWith('mcp__');
    
    // Check if it's a known tool or MCP tool
    if (baseTool !== '' && !validToolPatterns.includes(baseTool) && !isMcpTool) {
      warnings.push(`Unknown tool: ${baseTool}`);
    }
    
    // Check for proper parenthesis matching
    const openParens = (tool.match(/\(/g) || []).length;
    const closeParens = (tool.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      warnings.push(`Unmatched parentheses in tool specification: ${tool}`);
    }
  }
  
  return warnings;
}

/**
 * Check if file uses bash command execution (!command)
 */
async function checkBashCommandUsage(content: string): Promise<string[]> {
  const warnings: string[] = [];
  
  // Look for bash command execution patterns
  // Note: In the actual file, the ! is escaped, but in content it appears as !
  const bashCommandPattern = /!\s*`[^`]+`/g;
  const hasBashCommands = bashCommandPattern.test(content);
  
  if (hasBashCommands) {
    // Check if allowed-tools includes Bash
    const { data: frontmatter } = matter(content);
    const allowedTools = frontmatter['allowed-tools'] as string | undefined;
    
    if (allowedTools === undefined || allowedTools === '' || !allowedTools.includes('Bash')) {
      warnings.push('File uses bash command execution (!`command`) but allowed-tools does not include Bash');
    }
  }
  
  return warnings;
}

/**
 * Check for file references (@file)
 */
function checkFileReferences(content: string): string[] {
  const suggestions: string[] = [];
  
  // Look for file reference patterns
  const fileRefPattern = /@[^\s]+\.(js|ts|jsx|tsx|md|json|yml|yaml)/g;
  const hasFileRefs = fileRefPattern.test(content);
  
  if (hasFileRefs) {
    const { data: frontmatter } = matter(content);
    const allowedTools = frontmatter['allowed-tools'] as string | undefined;
    
    if (allowedTools === undefined || allowedTools === '' || !allowedTools.includes('Read')) {
      suggestions.push('File uses @file references but allowed-tools does not include Read');
    }
  }
  
  return suggestions;
}

/**
 * Lint a single slash command markdown file
 */
async function lintFile(filePath: string): Promise<LintResult> {
  const result: LintResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
    unusedFields: [],
    suggestions: []
  };
  
  try {
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);
    
    // Track which fields are present but not in schema
    const officialFields = new Set([
      'allowed-tools', 'argument-hint', 'description', 'model',
      'category'  // Claudekit extension
    ]);
    
    const presentFields = Object.keys(frontmatter);
    result.unusedFields = presentFields.filter(field => !officialFields.has(field));
    
    // Validate against schema
    const validation = SlashCommandFrontmatterSchema.safeParse(frontmatter);
    
    if (!validation.success) {
      result.valid = false;
      
      // Parse Zod errors
      for (const issue of validation.error.issues) {
        const field = issue.path.join('.');
        
        if (issue.code === 'unrecognized_keys') {
          // Type guard for unrecognized_keys issue
          const unrecognizedIssue = issue as unknown as UnrecognizedKeysIssue;
          if ('keys' in unrecognizedIssue && Array.isArray(unrecognizedIssue.keys)) {
            result.unusedFields.push(...unrecognizedIssue.keys);
            result.warnings.push(`Unrecognized fields: ${unrecognizedIssue.keys.join(', ')}`);
          }
        } else if (field && issue.message) {
          result.errors.push(`${field}: ${issue.message}`);
        }
      }
    }
    
    // Additional validations
    if (frontmatter['allowed-tools'] !== undefined && frontmatter['allowed-tools'] !== null) {
      const toolWarnings = validateAllowedTools(frontmatter['allowed-tools'] as string);
      result.warnings.push(...toolWarnings);
    }
    
    // Check bash command usage
    const bashWarnings = await checkBashCommandUsage(content);
    result.warnings.push(...bashWarnings);
    
    // Check file references
    const fileSuggestions = checkFileReferences(content);
    result.suggestions.push(...fileSuggestions);
    
    // Check if description is missing and suggest using first line
    if (frontmatter['description'] === undefined && markdown.trim() !== '') {
      const firstLine = markdown.trim().split('\n')[0];
      if (firstLine !== undefined && firstLine !== '' && !firstLine.startsWith('#')) {
        result.suggestions.push(`Consider adding description field (could use: "${firstLine.slice(0, 50)}...")`);
      }
    }
    
    // Check for $ARGUMENTS usage without argument-hint
    if (markdown.includes('$ARGUMENTS') && frontmatter['argument-hint'] === undefined) {
      result.suggestions.push('Command uses $ARGUMENTS but no argument-hint is provided');
    }
    
    // Validate command naming based on file path
    const commandName = path.basename(filePath, '.md');
    const dirName = path.basename(path.dirname(filePath));
    
    // Check if it's in a subdirectory (namespaced command)
    if (dirName !== 'commands' && !['src', 'commands'].includes(dirName)) {
      const expectedCommandUsage = `/${dirName}:${commandName}`;
      if (!markdown.includes(expectedCommandUsage) && !markdown.includes(`\`${expectedCommandUsage}\``)) {
        result.suggestions.push(`Namespaced command should be referenced as ${expectedCommandUsage}`);
      }
    }
    
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to parse file: ${error}`);
  }
  
  return result;
}

// ============================================================================
// CLI Interface
// ============================================================================

interface CliOptions {
  quiet: boolean;
  pattern?: string | undefined;
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  const options: CliOptions = {
    quiet: args.includes('--quiet'),
    pattern: args.find(arg => !arg.startsWith('--')) ?? undefined
  };
  
  // Default pattern for slash command files
  const pattern = options.pattern ?? 'src/commands/**/*.md';
  
  console.log(chalk.bold('\n🔍 Slash Command Linter\n'));
  console.log(chalk.gray(`Pattern: ${pattern}`));
  
  // Find all matching files
  const files = await glob(pattern);
  
  if (files.length === 0) {
    console.log(chalk.yellow('No files found matching pattern'));
    process.exit(0);
  }
  
  console.log(chalk.gray(`Found ${files.length} files to lint\n`));
  
  let totalErrors = 0;
  let totalWarnings = 0;
  let totalUnusedFields = 0;
  const allUnusedFields = new Set<string>();
  
  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    
    if (!options.quiet) {
      console.log(chalk.bold(`\n${relativePath}:`));
    }
    
    const result = await lintFile(file);
    
    if (result.valid && result.warnings.length === 0 && result.unusedFields.length === 0) {
      if (!options.quiet) {
        console.log(chalk.green('  ✓ Valid'));
      }
    } else {
      // Show errors
      for (const error of result.errors) {
        console.log(chalk.red(`  ✗ ${error}`));
        totalErrors++;
      }
      
      // Show warnings
      for (const warning of result.warnings) {
        console.log(chalk.yellow(`  ⚠ ${warning}`));
        totalWarnings++;
      }
      
      // Show unused fields
      if (result.unusedFields.length > 0) {
        console.log(chalk.yellow(`  ⚠ Unused fields: ${result.unusedFields.join(', ')}`));
        totalUnusedFields += result.unusedFields.length;
        result.unusedFields.forEach(field => allUnusedFields.add(field));
      }
      
      // Show suggestions
      if (!options.quiet) {
        for (const suggestion of result.suggestions) {
          console.log(chalk.gray(`  💡 ${suggestion}`));
        }
      }
    }
  }
  
  // Summary
  console.log(chalk.bold('\n📊 Summary:\n'));
  console.log(`  Files checked: ${files.length}`);
  console.log(`  Errors: ${totalErrors > 0 ? chalk.red(String(totalErrors)) : chalk.green('0')}`);
  console.log(`  Warnings: ${totalWarnings > 0 ? chalk.yellow(String(totalWarnings)) : chalk.green('0')}`);
  console.log(`  Unused fields: ${totalUnusedFields > 0 ? chalk.yellow(String(totalUnusedFields)) : chalk.green('0')}`);
  
  if (allUnusedFields.size > 0) {
    console.log(chalk.yellow('\n  All unused fields found:'));
    for (const field of Array.from(allUnusedFields).sort()) {
      console.log(chalk.gray(`    - ${field}`));
    }
    console.log(chalk.cyan('\n💡 Note: "category" is a claudekit-specific field for organizing commands'));
  }
  
  if (totalErrors > 0 || totalWarnings > 0 || totalUnusedFields > 0) {
    console.log(chalk.cyan('\n💡 Review the issues above and fix them manually'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✨ All files are valid!'));
  }
}

// Export for use as a module
export { lintFile, SlashCommandFrontmatterSchema, main };
export type { LintResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}