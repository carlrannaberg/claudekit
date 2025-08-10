import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';

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
export const SlashCommandFrontmatterSchema = z.object({
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
export interface LintResult {
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
 * Check if a file has frontmatter (to distinguish from READMEs, etc.)
 */
export function hasFrontmatter(content: string): boolean {
  const lines = content.split('\n');
  return lines.length > 0 && lines[0] === '---';
}

/**
 * Check if file uses bash command execution (!command)
 */
async function checkBashCommandUsage(content: string): Promise<string[]> {
  const warnings: string[] = [];
  
  // Look for bash command execution patterns
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
export async function lintCommandFile(filePath: string): Promise<LintResult> {
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
    
    // Skip files without frontmatter
    if (!hasFrontmatter(content)) {
      // Return valid result for non-command files
      return result;
    }
    
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