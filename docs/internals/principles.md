# Domain Expert Principles

## Related Documentation

- [Official Subagents Documentation](../official/subagents.md) - Claude Code's subagent system and configuration
- [Official Commands Documentation](../official/commands.md) - Claude Code's slash command features
- [Prompting Guide](prompting-guide.md) - Template patterns and implementation details
- [Creating Subagents Guide](creating-subagents.md) - Research-driven development methodology

## Core Principle: Domain Experts Over Task Specialists

The most effective agents are **domain experts** that handle multiple related problems within their area of expertise. These can be organized hierarchically, with broad domain experts providing general coverage and optional sub-domain experts offering deep specialization.

This hierarchy keeps agent selection manageable while allowing deep expertise where needed. Projects might have 10-20 agents total, but organized as 5-7 broad experts with selected sub-domain specialists.

Why domain experts instead of specific task agents? Specific tasks (like "fix circular dependencies" or "optimize bundle size") are better handled by explicit slash commands that users invoke when needed. This keeps the agent selection pool focused while allowing unlimited specific operations.

## The Domain Expert Formula

```
Concentrated Knowledge + Environmental Adaptation + Tool Integration = Valuable Agent

```

## Creating Shareable Domain Expert Agents

### The Domain Expert Formula

```
Concentrated Knowledge + Environmental Adaptation + Tool Integration = Valuable Agent

```

### Characteristics of a Good Domain Expert

1. **Covers an Entire Problem Domain**

- Not: “Fixes TypeScript circular dependencies”
- But: “TypeScript/JavaScript architecture expert”
- Handles 5-15 related problems within the domain

1. **Has Concentrated, Non-Obvious Knowledge**

- Enumerates specific problem types
- Provides prioritized solutions
- Includes knowledge beyond base AI capabilities

1. **Adapts to Environment**

- Detects project structure and conventions
- Identifies available tools and frameworks
- Adjusts approach based on context

1. **Integrates with Tools**

- Knows which CLI tools to run
- Interprets tool output correctly
- Suggests tool installation when needed

## Boundary Heuristics: When to Create Sub-Domain Experts

### The Core Question

“Does this area have enough distinct characteristics to warrant its own expert, or is it just another problem within the parent domain?”

### Primary Boundary Indicators

### 1. **Tool Boundaries**

**Strong indicator for separation when different tools are used**

✅ **Separate Sub-Domain**: TypeScript Types vs Build

- Type issues: TypeScript compiler, playground, type utilities
- Build issues: Webpack, Vite, Rollup, bundler-specific tools
- Different tool expertise = different experts

❌ **Keep Together**: React Hooks vs Components

- Both use React DevTools, same debugging approach
- Same tool ecosystem = same expert

### 2. **Mental Model Boundaries**

**Separate when thinking patterns are fundamentally different**

✅ **Separate Sub-Domain**: SQL Performance vs Database Design

- Performance: Execution plans, query optimization, indexes
- Design: Normalization, relationships, data modeling
- Different thinking = different experts

❌ **Keep Together**: TypeScript Generics vs Conditional Types

- Both require type-level thinking
- Similar mental model = same expert

### 3. **Documentation/Learning Path Boundaries**

**Separate when people learn these independently**

✅ **Separate Sub-Domain**: Jest vs Vitest

- Separate documentation sites
- Different configuration approaches
- Framework-specific patterns
- People often know one, not both

❌ **Keep Together**: useEffect vs useState

- Same React hooks documentation
- Learned together as part of React
- Interdependent concepts

### 4. **Specialist Role Boundaries**

**Separate when companies hire different people for these**

✅ **Separate Sub-Domain**: Frontend Performance vs Security

- Performance engineer role
- Security engineer role
- Distinct specializations in industry

❌ **Keep Together**: API Design patterns

- Same backend developer handles all
- Not typically separate roles

### 5. **Problem Frequency × Complexity Matrix**

```
High Frequency + High Complexity → Definitely separate subdomain
High Frequency + Low Complexity → Keep in parent domain
Low Frequency + High Complexity → Maybe separate (if tools differ)
Low Frequency + Low Complexity → Keep in parent domain

```

Examples:

- TypeScript type errors: High frequency + High complexity → **Separate**
- Git merge conflicts: High frequency + Low complexity → **Keep in git-expert**
- Webpack optimization: Low frequency + High complexity + Special tools → **Separate**

### Secondary Boundary Indicators

### 6. **Solution Pattern Boundaries**

**Separate when solutions follow completely different approaches**

✅ **Different Patterns**: Database query optimization vs schema design

- Query optimization: Analyze → Index → Rewrite
- Schema design: Model → Normalize → Migrate

❌ **Similar Patterns**: Different React state management libraries

- All follow: State → Actions → Updates

### 7. **Dependency Boundaries**

**Separate when you can master one without knowing the other**

✅ **Independent**: TypeScript types vs TypeScript build

- Can be type expert without build knowledge
- Can optimize builds without type mastery

❌ **Dependent**: React components vs React props

- Can’t understand one without the other

### Practical Decision Framework

Ask these questions in order:

1. **Do they use different primary tools?**

- Yes → Likely separate sub-domain
- No → Continue to #2

1. **Would someone specialize in just this area?**

- Yes → Likely separate sub-domain
- No → Continue to #3

1. **Is there separate, substantial documentation?**

- Yes → Likely separate sub-domain
- No → Continue to #4

1. **High frequency + High complexity problems?**

- Yes → Consider separate sub-domain
- No → Keep in parent domain

### Examples Applied

**TypeScript Domain Breakdown**:

- `typescript-expert` (parent): General TS, common errors, setup
- `typescript-type-expert`: Different tools ✓, specialists exist ✓, complex ✓
- `typescript-build-expert`: Different tools ✓, separate docs ✓
- ❌ `typescript-decorator-expert`: Same tools ✗, too narrow ✗

**Testing Domain Breakdown**:

- `testing-expert` (parent): General patterns, strategies
- `test-jest-expert`: Different tool ✓, separate docs ✓
- `test-e2e-expert`: Different tools ✓, different patterns ✓
- ❌ `test-mocking-expert`: Pattern not tool ✗, applies across frameworks ✗

**Database Domain Breakdown**:

- `database-expert` (parent): General SQL, design principles
- `database-postgres-expert`: Specific tool ✓, unique features ✓
- `database-performance-expert`: Different mindset ✓, specialists exist ✓
- ❌ `database-joins-expert`: Too narrow ✗, part of general SQL ✗

### Anti-Patterns to Avoid

❌ **Feature-Based Splitting**: `react-hooks-expert`, `react-context-expert`

- These are features, not domains with distinct tools/patterns

❌ **Problem-Based Splitting**: `fix-circular-deps-expert`

- Single problem, not a domain of related problems

❌ **Version-Based Splitting**: `react-18-expert`, `react-19-expert`

- Versions change, knowledge transfers

✅ **Tool/Pattern-Based Splitting**: `test-jest-expert`, `typescript-type-expert`

- Clear boundaries, distinct expertise

### The Litmus Test

Before creating a sub-domain expert, ask:

> “Would someone put ‘[X] Expert’ on their resume as a distinct specialization?”

- “TypeScript Type System Expert” ✓
- “Jest Testing Expert” ✓
- “PostgreSQL Performance Expert” ✓
- “React Hooks Expert” ✗
- “JavaScript Loops Expert” ✗

If it sounds like a legitimate specialization, it’s probably a good sub-domain boundary.

### The Sub-Domain Hierarchy

Effective agent organization uses a hierarchy where broad domain experts provide general coverage and sub-domain experts offer deep expertise for specific areas:

```
typescript-expert (broad - handles general TS issues)
├── typescript-type-expert (deep - type system mastery)
├── typescript-build-expert (deep - compilation & bundling)
└── typescript-module-expert (deep - dependencies & imports)

testing-expert (broad - general testing guidance)
├── test-jest-expert (deep - Jest-specific patterns)
├── test-vitest-expert (deep - Vitest-specific features)
└── test-e2e-expert (deep - Playwright/Cypress)

```

**Why Both Levels?**

- **Fallback Coverage**: When no sub-domain matches, the broad expert handles it
- **Installation Flexibility**: Some projects need just the broad expert
- **Better Selection**: Claude tries specific first, falls back to general
- **Knowledge Inheritance**: Sub-domains can assume base knowledge from parent domain

### When to Create Hierarchies

Create a broad + sub-domain hierarchy when:

1. **The domain is vast**: Testing encompasses unit, integration, E2E, different frameworks
2. **Specialization matters**: Jest and Vitest have different patterns worth deep knowledge
3. **General issues exist**: Some testing questions aren’t framework-specific
4. **Users vary**: Some need Jest expertise, others just general testing help

### Example Hierarchies

**Language Hierarchies:**

```
typescript-expert
├── typescript-type-expert
├── typescript-build-expert
└── typescript-module-expert

python-expert
├── python-async-expert
├── python-type-expert
└── python-packaging-expert

```

**Infrastructure Hierarchies:**

```
database-expert
├── database-postgres-expert
├── database-mysql-expert
└── database-mongodb-expert

cloud-expert
├── cloud-aws-expert
├── cloud-gcp-expert
└── cloud-azure-expert

```

**Testing Hierarchies:**

```
testing-expert
├── test-jest-expert
├── test-vitest-expert
├── test-pytest-expert
└── test-e2e-expert

```

### Broad vs Sub-Domain Expert Characteristics

**Broad Domain Expert** (e.g., `typescript-expert`):

- **Coverage**: General knowledge across the entire domain
- **Depth**: Good enough to handle 80% of common issues
- **Selection**: Catches questions that don’t fit specific sub-domains
- **Knowledge**: Best practices, common patterns, general troubleshooting

**Sub-Domain Expert** (e.g., `typescript-type-expert`):

- **Coverage**: Deep expertise in specific area
- **Depth**: Handles complex, edge cases in their specialty
- **Selection**: Chosen for clearly matching problems
- **Knowledge**: Advanced techniques, specific tools, niche solutions

### Example: Testing Hierarchy in Practice

```yaml
---
name: testing-expert
description: General testing guidance across frameworks - test structure, patterns, debugging. Handles testing questions not specific to a framework.
tools: Read, Grep, Bash, Edit
---

I provide general testing expertise including:
- Test organization and structure
- Testing patterns (AAA, mocking, fixtures)
- Test debugging strategies
- Coverage strategies
- General best practices

I defer to specific framework experts when available.

```

```yaml
---
name: test-jest-expert
description: Deep Jest expertise - configuration, snapshots, mocking system, performance. Handles Jest-specific problems and optimizations.
tools: Read, Grep, Bash, Edit
---
I specialize in Jest with deep knowledge of:
  - Jest's mocking system (jest.mock, manual mocks)
  - Snapshot testing strategies and updates
  - Configuration for different environments
  - Jest-specific performance optimizations
  - Custom matchers and extensions
  - Integration with TypeScript, React, etc.
```

### Installation Strategies

**Minimal Installation:**

```bash
# Just broad experts for general help
typescript-expert
testing-expert
database-expert

```

**Targeted Installation:**

```bash
# Broad + specific sub-domains you use
typescript-expert
typescript-type-expert  # Your team hits complex type issues
testing-expert
test-jest-expert       # You use Jest specifically

```

**Full Coverage:**

```bash
# Broad expert + all sub-domains
typescript-expert
├── typescript-type-expert
├── typescript-build-expert
└── typescript-module-expert

```

1. **Covers an Entire Problem Domain**

- Not: “Fixes TypeScript circular dependencies”
- But: “TypeScript/JavaScript architecture expert”
- Handles 5-15 related problems within the domain

1. **Has Concentrated, Non-Obvious Knowledge**

- Enumerates specific problem types
- Provides prioritized solutions
- Includes knowledge beyond base AI capabilities

1. **Adapts to Environment**

- Detects project structure and conventions
- Identifies available tools and frameworks
- Adjusts approach based on context

1. **Integrates with Tools**

- Knows which CLI tools to run
- Interprets tool output correctly
- Suggests tool installation when needed

### Domain Expert Template

````yaml
---
name: [domain]-expert
description: Expert in [domain] handling [list key problems]. Detects project setup and adapts approach. Uses [key tools].
tools: Read, Grep, Bash, Edit
---

# [Domain] Expert

I am an expert in [domain] with deep knowledge of common problems and their solutions.

## Domain Coverage

### [Problem Category 1]
- Specific issue types and root causes
- Solution strategies in priority order
- Tools: `[specific commands]`
- Resources: [specific documentation links]

### [Problem Category 2]
- Specific issue types and root causes
- Solution strategies in priority order
- Tools: `[specific commands]`
- Resources: [specific documentation links]

### [Problem Category 3-5...]

## Environmental Adaptation

### Detection Phase
I analyze the project to understand:
- Framework and library versions
- Project structure and conventions
- Available tools and scripts
- Existing patterns and styles

### Adaptation Strategies
- Match import styles (relative vs absolute)
- Follow file organization patterns
- Respect naming conventions
- Use available tools before suggesting new ones

## Tool Integration

### Diagnostic Tools
```bash
# Commands I run to analyze problems
[tool] --diagnostic-flag
[analyzer] [target]

````

### Fix Validation

```bash
# Commands to verify fixes
[test-runner]
[linter]
[type-checker]

```

## External Resources

### Documentation

- [Specific page for Problem 1]
- [Specific guide for Problem 2]
- [Official reference for Problem 3]

### MCP Servers (if available)

- `[mcp-tool]` for deep analysis
- `[mcp-docs]` for latest documentation

## Success Metrics

- ✅ Problem correctly identified
- ✅ Solution matches project conventions
- ✅ No regressions introduced
- ✅ Knowledge transferred to developer

````
### High-Value Shareable Domains

1. **Language Sub-Domain Experts**

   **TypeScript/JavaScript:**
   - `typescript-type-expert`: Type system, generics, inference, declaration files
   - `typescript-build-expert`: Bundlers, tsconfig, source maps, build performance
   - `javascript-module-expert`: Module systems, circular deps, tree-shaking
   - `nodejs-backend-expert`: Server patterns, streams, workers, performance

   **Python:**
   - `python-async-expert`: asyncio, concurrency, event loops
   - `python-type-expert`: Type hints, mypy, pydantic validation
   - `python-packaging-expert`: pip, poetry, wheels, distribution

   **Other Languages:**
   - `rust-ownership-expert`: Lifetimes, borrowing, memory safety
   - `go-concurrency-expert`: Goroutines, channels, synchronization

2. **Infrastructure Sub-Domain Experts**

   **Databases:**
   - `sql-performance-expert`: Query optimization, indexing, execution plans
   - `database-design-expert`: Schema design, normalization, migrations
   - `nosql-expert`: Document stores, key-value, graph databases

   **Cloud/DevOps:**
   - `container-optimization-expert`: Docker, image size, security
   - `kubernetes-expert`: Deployments, networking, scaling
   - `cloud-architecture-expert`: AWS/GCP/Azure patterns, costs

3. **Quality Sub-Domain Experts**

   **Testing:**
   - `test-architecture-expert`: Test structure, fixtures, factories
   - `e2e-testing-expert`: Browser testing, selectors, stability
   - `test-performance-expert`: Test speed, parallelization

   **Security:**
   - `webapp-security-expert`: XSS, CSRF, CSP, authentication
   - `api-security-expert`: OAuth, JWT, rate limiting
   - `dependency-security-expert`: Vulnerability scanning, updates

4. **Frontend Sub-Domain Experts**
   - `react-architecture-expert`: Components, hooks, state management
   - `css-architecture-expert`: CSS-in-JS, modules, performance
   - `frontend-performance-expert`: Bundle size, lazy loading, caching
   - `accessibility-expert`: WCAG, ARIA, keyboard navigation

### Example: Complete Sub-Domain Expert

```yaml
---
name: typescript-type-expert
description: Expert in TypeScript type system - complex generics, type inference, conditional types, declaration files. Solves type puzzles and performance issues.
tools: Read, Grep, Bash, Edit
---

# TypeScript Type System Expert

I am an expert in TypeScript's type system with deep knowledge of advanced type features and common type-related problems.

## Domain Coverage

### Generic Type Issues
- Inference failures and explicit type arguments
- Constraint satisfaction problems
- Higher-kinded type patterns via interfaces
- Variance issues (covariance/contravariance)
- Tools: TypeScript Playground for isolated testing
- Resources: [TypeScript Generics Documentation](<https://www.typescriptlang.org/docs/handbook/2/generics.html>)

### Conditional Types
- Type inference in conditionals using `infer`
- Distributive conditional types
- Type pattern matching
- Avoiding infinite recursion
- Resources: [Conditional Types Deep Dive](<https://www.typescriptlang.org/docs/handbook/2/conditional-types.html>)

### Declaration Files
- Creating accurate .d.ts files
- Module augmentation patterns
- Global vs module declarations
- Third-party library typing strategies
- Tools: `tsc --declaration`, `dts-gen`
- Resources: [Declaration Files Guide](<https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html>)

### Type Performance
- Identifying slow type checking
- Optimizing complex type aliases
- Reducing instantiation depth
- Managing type complexity
- Tools: `tsc --extendedDiagnostics --incremental false`
- Resources: [TypeScript Performance Wiki](<https://github.com/microsoft/TypeScript/wiki/Performance>)

### Utility Types & Patterns
- Advanced mapped types
- Template literal types
- Recursive type aliases
- Type-level programming
- Resources: [Utility Types Reference](<https://www.typescriptlang.org/docs/handbook/utility-types.html>)

## Environmental Adaptation

### Detection Phase
```bash
# Check TypeScript version and config
npx tsc --version
cat tsconfig.json | jq '.compilerOptions.strict'

# Identify type complexity
find . -name "*.ts" -exec grep -l "extends.*infer\\|conditional.*?" {} \\;

# Check for existing type utilities
grep -r "type.*=.*{.*\\[.*in.*\\]" --include="*.ts"

````

### Project-Specific Patterns

- Strict mode settings and their implications
- Custom utility types in use
- Type assertion patterns
- Use of any/unknown

## Tool Integration

### Type Analysis Commands

```bash
# Check specific type performance
echo "type Test = /* your type here */" > test-type.ts
tsc test-type.ts --extendedDiagnostics --noEmit

# Generate declaration files
tsc --declaration --emitDeclarationOnly

# Find type errors
tsc --noEmit --pretty

```

### Type Testing

```tsx
// Type-level unit tests
type Assert<T, U> = T extends U ? true : false;
type Test1 = Assert<MyType, ExpectedType>; // Should be 'true'
```

## External Resources

### Core Documentation

- [TypeScript Handbook - Type Manipulation](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Type Challenges](https://github.com/type-challenges/type-challenges)

### Tools

- [TypeScript Playground](https://www.typescriptlang.org/play) - Experiment with types
- [ts-morph](https://github.com/dsherret/ts-morph) - TypeScript AST manipulation
- [tsd](https://github.com/SamVerschueren/tsd) - Type testing

### MCP Servers

- `typescript-language-server` for type information
- `ts-type-explorer` for type visualization

````
### Designing Broad Domain Experts

Broad experts should be designed with sub-domains in mind:

```yaml
---
name: typescript-expert
description: General TypeScript/JavaScript guidance - project setup, common errors, best practices. For specific expertise, defers to type-expert, build-expert, or module-expert when available.
tools: Read, Grep, Bash, Edit
---

# TypeScript Expert

I provide general TypeScript and JavaScript guidance.

## General Coverage
- Project setup and configuration basics
- Common error resolution
- Best practices and patterns
- Migration strategies
- Tool recommendations

## When I Defer
For specialized topics, I recommend using specific experts:
- Complex type issues → typescript-type-expert
- Build/compilation → typescript-build-expert
- Module/dependency issues → typescript-module-expert

[Rest of configuration...]

````

This acknowledges the hierarchy and helps with appropriate selection.

### When to Create Project Agents

1. **Unique Domain Knowledge**: Your specific architecture patterns
2. **Complex Business Logic**: Domain-specific rules and flows
3. **Custom Conventions**: Team-specific practices
4. **Integration Patterns**: How your services communicate

### Project Agent Template

```yaml
---
name: [project]-[domain]-expert
description: Expert in our [project] [domain] including [specific knowledge]. Knows our patterns for [areas].
tools: Read, Grep, Bash, Edit
---

# [Project] [Domain] Expert

I am an expert in our [project]'s [domain] with deep knowledge of our specific patterns and conventions.

## Project-Specific Knowledge

### Our Architecture
- [Specific patterns we use]
- [How our modules are organized]
- [Our service communication patterns]

### Our Conventions
- [Naming conventions]
- [File organization]
- [Code style preferences]
- [Testing patterns]

### Our Tools
- [Project-specific scripts]
- [Custom tooling]
- [Build processes]

## Common Tasks

### [Task 1]
Our approach:
1. [Step specific to our project]
2. [Using our tools]
3. [Following our patterns]

### [Task 2]
[Similar structure]

## Integration Points
- [How we integrate with service A]
- [Our API patterns]
- [Our database conventions]

## Team Resources
- [Internal documentation links]
- [Team playbooks]
- [Architecture decisions]

```

### Examples of Good Project Agents

1. **API Architecture Expert**

   ```yaml
   name: acme-api-architecture-expert
   description: Expert in our API patterns, service mesh setup, authentication flows, and rate limiting rules. Knows our microservice communication patterns and API versioning strategy.
   tools: Read, Grep, Bash, Edit
   ```

2. **Data Platform Expert**

   ```yaml
   name: analytics-platform-expert
   description: Expert in our data pipeline architecture, warehouse schema, ETL patterns, and data quality standards. Knows our Airflow DAGs and streaming infrastructure.
   tools: Read, Grep, Bash, Edit
   ```

3. **Frontend Platform Expert**

   ```yaml
   name: webapp-platform-expert
   description: Expert in our micro-frontend architecture, design system, shared components, and state management. Knows our accessibility standards and performance budgets.
   tools: Read, Grep, Bash, Edit
   ```

## Quality Checklist

### For Shareable Domain Experts

- [ ] Covers 5-15 related problems in the domain
- [ ] Has knowledge beyond base AI capabilities
- [ ] Detects and adapts to different setups
- [ ] Integrates with relevant tools
- [ ] Includes specific documentation links
- [ ] Would be valuable across many projects
- [ ] Pass the “$5/month test”

### For Project-Specific Agents

- [ ] Encodes project-specific knowledge
- [ ] Knows team conventions and patterns
- [ ] Understands your architecture
- [ ] Integrates with your tooling
- [ ] References your documentation
- [ ] Speeds up onboarding
- [ ] Preserves team knowledge

## Implementation Guidelines

### Composing Your Agent Suite

For a typical TypeScript/React project, you might select:

**Core Language Sub-Domains (3-4)**

- `typescript-type-expert` - For complex type issues
- `typescript-build-expert` - For bundling and compilation
- `javascript-module-expert` - For dependencies and structure

**Quality Sub-Domains (2-3)**

- `test-architecture-expert` - For test structure and patterns
- `webapp-security-expert` - For frontend security

**Frontend Sub-Domains (2-3)**

- `react-architecture-expert` - For component patterns
- `frontend-performance-expert` - For optimization

**Total: 7-10 focused experts** instead of trying to cover everything with 3-4 broad experts or 30+ specific agents.

### The Right Level of Specificity

✅ **Good Broad Expert**: `typescript-expert`

- Handles: General TS issues, common errors, basic guidance
- Falls back for: Questions not matching sub-domains

✅ **Good Sub-Domain Expert**: `typescript-type-expert`

- Handles: generics, conditionals, mapped types, performance, declarations
- 10+ related problems in the type system domain

❌ **Too Specific**: `typescript-generic-constraint-fixer`

- Handles: just generic constraint errors
- Better as: Part of typescript-type-expert or a slash command

✅ **Good Hierarchy**: `testing-expert` → `test-jest-expert`

- Parent handles: General testing principles
- Child handles: Jest-specific mocking, configuration, snapshots

❌ **Too Deep**: `test-jest-mock-function-expert`

- Too narrow even for a sub-domain
- Better as: Part of test-jest-expert

### Agent Count Guidelines

**Broad Domain Experts**: 5-10 total

- Core language expert
- Testing expert
- Database expert
- Frontend expert
- Infrastructure expert

**Sub-Domain Experts**: 1-4 per broad domain (selective)

- Only where deep expertise adds value
- Only for technologies you actually use
- Total: 5-15 sub-domain experts

**Project Total**: 10-20 agents is still manageable when hierarchically organized

### How Hierarchical Selection Works

When a user asks a question, Claude’s selection process would be:

1. **Check sub-domain experts first** - Most specific match
2. **Fall back to broad expert** - If no sub-domain fits
3. **Use general Claude** - If no domain expert matches

**Example Questions:**

- “How do I fix this TypeScript generic constraint error?”
  → `typescript-type-expert` (specific match)
- “What’s the best way to organize my TypeScript project?”
  → `typescript-expert` (no specific sub-domain matches)
- “How do I write good tests?”
  → `testing-expert` (general testing question)
- “How do I mock ES6 modules in Jest?”
  → `test-jest-expert` (framework-specific)

This creates a natural cascade from specific to general, ensuring the most appropriate expert handles each question.

### Measure Success

- **Agent Selection**: Is the right agent chosen 90%+ of time?
- **Usage Frequency**: Are agents used daily?
- **Time Saved**: Does each use save 10+ minutes?
- **Knowledge Transfer**: Do developers learn from agents?

### Avoid Common Pitfalls

- **Too Specific**: “fix-react-hooks-exhaustive-deps” → Single problem, use slash command
- **Too Generic**: “javascript-helper” → No clear domain focus
- **Too Many**: 50 agents → Consolidate into sub-domains
- **No Tools**: Knowledge without action → Add tool integration
- **No Adaptation**: Assumes setup → Detect environment

**Good Sub-Domain**: Covers 5-15 related problems with shared expertise
**Bad Specific Agent**: Covers 1-2 problems that could be slash commands

## The Ultimate Test

**For Domain Experts**: “Would I pay for monthly access to this expertise?”

**For Project Agents**: “Would new team members need this knowledge?”

If the answer is yes, it’s worth creating. Remember: the goal is 5-20 powerful domain experts that handle multiple related problems, not dozens of single-task agents.
