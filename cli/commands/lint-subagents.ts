import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';
import chalk from 'chalk';
import { glob } from 'glob';

/**
 * Subagent Linter
 * 
 * This tool validates subagent markdown files to ensure their frontmatter
 * only contains required and used fields. It identifies unnecessary fields
 * that are not used anywhere in the codebase and can optionally fix them.
 */

// ============================================================================
// Schema Definitions
// ============================================================================

/**
 * Valid agent categories used for grouping in the UI
 */
const AgentCategorySchema = z.enum([
  'general',
  'framework',
  'testing',
  'database',
  'frontend',
  'devops',
  'build',
  'linting',
  'tools',
  'universal' // For agents that apply universally
]);

/**
 * Valid color schemes for UI display
 */
const ColorSchema = z.enum([
  'blue',
  'cyan',
  'green',
  'yellow',
  'red',
  'purple',
  'pink',
  'orange',
  'gray',
  'black',
  'white',
  'indigo',
  'teal',
  'lime',
  'emerald',
  'sky',
  'violet',
  'rose',
  'brown'
]);

/**
 * Tools that can be specified in the tools field
 */
const ToolSchema = z.enum([
  'Read',
  'Write',
  'Edit',
  'MultiEdit',
  'Bash',
  'Grep',
  'Glob',
  'LS',
  'Task',
  'NotebookEdit',
  'WebFetch',
  'WebSearch',
  'TodoWrite',
  'BashOutput',
  'KillBash',
  '*' // For agents that can use all tools
]);

/**
 * Frontmatter schema for subagent markdown files
 * Based on official Claude Code subagent documentation + claudekit-specific fields
 */
const SubagentFrontmatterSchema = z.object({
  // Required fields per official documentation
  name: z.string()
    .min(1, 'name is required')
    .regex(/^[a-z0-9-]+$/, 'name must use only lowercase letters, numbers, and hyphens'),
  description: z.string()
    .min(1, 'description is required')
    .describe('Natural language description of when this subagent should be invoked'),
  
  // Optional field per official documentation
  tools: z.string().optional().describe('Comma-separated list of tools (inherits all if omitted)'),
  
  // Claudekit-specific fields for UI and organization
  category: AgentCategorySchema.optional().describe('Claudekit: category for grouping agents'),
  color: ColorSchema.optional().describe('Claudekit: UI color scheme'),
  displayName: z.string().optional().describe('Claudekit: display name for UI'),
  bundle: z.array(z.string()).optional().describe('Claudekit: bundled subagent names'),
  
  // Legacy fields that should be removed
  version: z.never().optional().describe('REMOVE: Not used in codebase'),
  author: z.never().optional().describe('REMOVE: Not used in codebase'),
  tags: z.never().optional().describe('REMOVE: Not used in codebase'),
  complexity: z.never().optional().describe('REMOVE: Not used in codebase'),
  scope: z.never().optional().describe('REMOVE: Not used in codebase'),
  related_experts: z.never().optional().describe('REMOVE: Not used in codebase'),
  triggers: z.never().optional().describe('REMOVE: Not part of official spec'),
  'allowed-tools': z.never().optional().describe('REMOVE: Use "tools" field instead'),
  dependencies: z.never().optional().describe('REMOVE: Not part of official spec'),
  role: z.never().optional().describe('REMOVE: Not part of official spec'),
  domain: z.never().optional().describe('REMOVE: Not part of official spec'),
  last_updated: z.never().optional().describe('REMOVE: Not part of official spec'),
  environment_detection: z.never().optional().describe('REMOVE: Not part of official spec'),
  validation_commands: z.never().optional().describe('REMOVE: Not part of official spec'),
  created: z.never().optional().describe('REMOVE: Not part of official spec'),
  modified: z.never().optional().describe('REMOVE: Not part of official spec'),
  defaultSelected: z.never().optional().describe('REMOVE: Not part of official spec'),
  universal: z.never().optional().describe('REMOVE: Use category instead'),
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
  missingFields: string[];
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
 * Parse and validate tools field
 */
function validateTools(tools: string | undefined): string[] {
  const warnings: string[] = [];
  
  if (tools === undefined || tools === '') {
    return warnings;
  }
  
  const toolList = tools.split(',').map(t => t.trim());
  const validTools = new Set<string>(ToolSchema.options);
  
  for (const tool of toolList) {
    // Extract base tool name (e.g., "Bash(git status:*)" -> "Bash")
    const baseTool = tool.split('(')[0]?.trim() ?? '';
    
    if (baseTool !== '' && !validTools.has(baseTool) && baseTool !== '*') {
      warnings.push(`Unknown tool: ${baseTool}`);
    }
  }
  
  return warnings;
}

/**
 * Lint a single subagent markdown file
 */
async function lintFile(filePath: string): Promise<LintResult> {
  const result: LintResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
    unusedFields: [],
    missingFields: [],
    suggestions: []
  };
  
  try {
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf-8');
    const { data: frontmatter, content: markdown } = matter(content);
    
    // Track which fields are present but not in schema
    // Official docs fields: name, description, tools
    // Claudekit-specific: category, color, displayName, bundle
    const schemaFields = new Set([
      'name', 'description', 'tools',  // Official spec
      'category', 'color', 'displayName', 'bundle'  // Claudekit extensions
    ]);
    
    const presentFields = Object.keys(frontmatter);
    result.unusedFields = presentFields.filter(field => !schemaFields.has(field));
    
    // Validate against schema
    const validation = SubagentFrontmatterSchema.safeParse(frontmatter);
    
    if (!validation.success) {
      result.valid = false;
      
      // Parse Zod errors
      for (const issue of validation.error.issues) {
        const field = issue.path.join('.');
        
        if (issue.code === 'invalid_type' && issue.received === 'undefined') {
          result.missingFields.push(field);
          result.errors.push(`Missing required field: ${field}`);
        } else if (issue.message.includes('REMOVE:')) {
          result.unusedFields.push(field);
          result.warnings.push(`Deprecated field should be removed: ${field}`);
        } else if (issue.code === 'unrecognized_keys') {
          // Type guard for unrecognized_keys issue
          const unrecognizedIssue = issue as unknown as UnrecognizedKeysIssue;
          if ('keys' in unrecognizedIssue && Array.isArray(unrecognizedIssue.keys)) {
            result.unusedFields.push(...unrecognizedIssue.keys);
            result.warnings.push(`Unrecognized fields: ${unrecognizedIssue.keys.join(', ')}`);
          }
        } else {
          result.errors.push(`${field}: ${issue.message}`);
        }
      }
    }
    
    // Additional validations
    if (frontmatter['tools'] !== undefined && frontmatter['tools'] !== null) {
      const toolWarnings = validateTools(frontmatter['tools'] as string);
      result.warnings.push(...toolWarnings);
    }
    
    // Check bundle field format
    if (frontmatter['bundle'] !== undefined && frontmatter['bundle'] !== null && typeof frontmatter['bundle'] === 'string') {
      result.suggestions.push('bundle field should be an array, not a string');
    }
    
    // Naming convention checks (handled by schema regex now, but keep filename check)
    if (frontmatter['name'] !== undefined && frontmatter['name'] !== null && typeof frontmatter['name'] === 'string') {
      // Check if name matches filename
      const expectedName = path.basename(filePath, '.md');
      if (frontmatter['name'] !== expectedName && !frontmatter['name'].endsWith('-expert')) {
        result.suggestions.push(`name "${frontmatter['name']}" doesn't match filename "${expectedName}"`);
      }
    }
    
    // Check displayName
    if (frontmatter['displayName'] === undefined && frontmatter['name'] !== undefined && frontmatter['name'] !== null) {
      result.suggestions.push('Consider adding displayName for better UI presentation');
    }
    
    // Check for duplicate content in description
    if (frontmatter['description'] !== undefined && frontmatter['description'] !== null && markdown.trim().startsWith(frontmatter['description'] as string)) {
      result.suggestions.push('Description is duplicated in markdown content');
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
  
  // Default pattern for subagent files
  const pattern = options.pattern ?? 'src/agents/**/*.md';
  
  console.log(chalk.bold('\n🔍 Subagent Linter\n'));
  console.log(chalk.gray(`Pattern: ${pattern}`))
  
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
      
      // Note: Auto-fixing has been removed - this tool only reports issues
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
  }
  
  if (totalErrors > 0 || totalWarnings > 0 || totalUnusedFields > 0) {
    console.log(chalk.cyan('\n💡 Review the issues above and fix them manually'));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✨ All files are valid!'));
  }
}

// Export for use as a module
export { lintFile, SubagentFrontmatterSchema, main };
export type { LintResult };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}