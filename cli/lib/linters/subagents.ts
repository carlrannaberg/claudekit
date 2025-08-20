import { promises as fs } from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { z } from 'zod';

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
  'universal', // For agents that apply universally
]);

/**
 * Valid color schemes for UI display
 * Claude Code supports both named colors and hex codes
 */
const ColorSchema = z
  .string()
  .optional()
  .describe('Named color (e.g., "indigo", "amber") or hex code (e.g., "#3b82f6")');

/**
 * Standard CSS named colors (from CSS specification)
 */
const CSS_NAMED_COLORS = new Set([
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
]);

/**
 * Frontmatter schema for subagent markdown files
 * Based on official Claude Code subagent documentation + claudekit-specific fields
 */
export const SubagentFrontmatterSchema = z
  .object({
    // Required fields per official documentation
    name: z
      .string()
      .min(1, 'name is required')
      .regex(/^[a-z0-9-]+$/, 'name must use only lowercase letters, numbers, and hyphens'),
    description: z
      .string()
      .min(1, 'description is required')
      .describe('Natural language description of when this subagent should be invoked'),

    // Optional fields per official Claude Code
    tools: z
      .string()
      .nullable()
      .optional()
      .describe('Comma-separated list of tools (inherits all if omitted)'),
    model: z.enum(['opus', 'sonnet', 'haiku']).or(z.string()).optional().describe('Preferred model for this agent'),

    // Claudekit-specific fields for UI and organization
    category: AgentCategorySchema.optional().describe('Claudekit: category for grouping agents'),
    color: ColorSchema.describe('Claudekit: UI color scheme'),
    displayName: z.string().optional().describe('Claudekit: display name for UI'),
    bundle: z.array(z.string()).optional().describe('Claudekit: bundled subagent names'),
  })
  .strict(); // Strict mode will catch any extra fields

/**
 * Result of linting a single file
 */
export interface LintResult {
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

/**
 * Parse and validate tools field
 */
function validateTools(tools: string | undefined): string[] {
  const warnings: string[] = [];

  if (tools === undefined) {
    // Field omitted - inherits all tools (valid)
    return warnings;
  }

  if (tools === '') {
    // Empty field - likely a misconfiguration
    warnings.push(
      'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
    );
    return warnings;
  }

  const toolList = tools.split(',').map((t) => t.trim()).filter(t => t !== '');
  
  // Check if after parsing we have no tools (e.g., "tools: ," or "tools:   ")
  if (toolList.length === 0) {
    warnings.push(
      'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
    );
    return warnings;
  }
  
  const validTools = new Set<string>([
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
    'ExitPlanMode',
    '*',
  ]);

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
 * Check if a file has frontmatter (to distinguish from READMEs, etc.)
 */
export function hasFrontmatter(content: string): boolean {
  const lines = content.split('\n');
  return lines.length > 0 && lines[0] === '---';
}

/**
 * Lint a single subagent markdown file
 */
export async function lintSubagentFile(filePath: string): Promise<LintResult> {
  const result: LintResult = {
    file: filePath,
    valid: true,
    errors: [],
    warnings: [],
    unusedFields: [],
    missingFields: [],
    suggestions: [],
  };

  try {
    // Read and parse file
    const content = await fs.readFile(filePath, 'utf-8');

    // Skip files without frontmatter
    if (!hasFrontmatter(content)) {
      // Return valid result for non-agent files
      return result;
    }

    const { data: frontmatter, content: markdown } = matter(content);

    // Track which fields are present but not in schema
    // Official Claude Code fields: name, description, tools, model
    // Claudekit-specific: category, color, displayName, bundle
    // Deprecated/unused: universal, defaultSelected (parsed but never used)
    const schemaFields = new Set([
      'name',
      'description',
      'tools',
      'model', // Official Claude Code fields
      'category',
      'color',
      'displayName',
      'bundle', // Claudekit extensions
    ]);

    const presentFields = Object.keys(frontmatter);
    result.unusedFields = presentFields.filter((field) => !schemaFields.has(field));

    // Validate against schema
    const validation = SubagentFrontmatterSchema.safeParse(frontmatter);

    if (!validation.success) {
      result.valid = false;

      // Parse Zod errors (but skip generic "received array" for tools since we handle it specially)
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
    if (frontmatter['tools'] !== undefined) {
      // Check if tools is null (empty field in YAML)
      if (frontmatter['tools'] === null || frontmatter['tools'] === '') {
        result.warnings.push(
          'Empty tools field detected - this will grant NO tools. Remove the field entirely to inherit all tools, or specify tools explicitly'
        );
      } else if (Array.isArray(frontmatter['tools'])) {
        // Check if tools is an array (incorrect format)
        result.errors.push('tools field must be a comma-separated string, not an array');
      } else if (typeof frontmatter['tools'] === 'string') {
        const toolWarnings = validateTools(frontmatter['tools'] as string);
        result.warnings.push(...toolWarnings);
      }
    }

    // Check bundle field format
    if (
      frontmatter['bundle'] !== undefined &&
      frontmatter['bundle'] !== null &&
      typeof frontmatter['bundle'] === 'string'
    ) {
      result.suggestions.push('bundle field should be an array, not a string');
    }

    // Naming convention checks
    if (
      frontmatter['name'] !== undefined &&
      frontmatter['name'] !== null &&
      typeof frontmatter['name'] === 'string'
    ) {
      // Check if name matches filename
      const expectedName = path.basename(filePath, '.md');
      if (frontmatter['name'] !== expectedName && !frontmatter['name'].endsWith('-expert')) {
        result.suggestions.push(
          `name "${frontmatter['name']}" doesn't match filename "${expectedName}"`
        );
      }
    }

    // Check displayName
    if (
      frontmatter['displayName'] === undefined &&
      frontmatter['name'] !== undefined &&
      frontmatter['name'] !== null
    ) {
      result.suggestions.push('Consider adding displayName for better UI presentation');
    }

    // Check color validity
    if (
      frontmatter['color'] !== undefined &&
      frontmatter['color'] !== null &&
      typeof frontmatter['color'] === 'string'
    ) {
      const color = frontmatter['color'] as string;
      const hexColorRegex = /^#[0-9A-F]{6}([0-9A-F]{2})?$/i;

      if (color.startsWith('#')) {
        // Validate hex color format
        if (!hexColorRegex.test(color)) {
          result.warnings.push(
            `Invalid hex color format: "${color}" (should be #RRGGBB or #RRGGBBAA)`
          );
        }
      } else if (!CSS_NAMED_COLORS.has(color.toLowerCase())) {
        // Not a standard CSS named color
        result.suggestions.push(`Color "${color}" is not a standard CSS named color`);
      }
    }

    // Check for duplicate content in description
    if (
      frontmatter['description'] !== undefined &&
      frontmatter['description'] !== null &&
      markdown.trim().startsWith(frontmatter['description'] as string)
    ) {
      result.suggestions.push('Description is duplicated in markdown content');
    }
  } catch (error) {
    result.valid = false;
    result.errors.push(`Failed to parse file: ${error}`);
  }

  return result;
}
