# Refactoring Expert Research Report

## Research Overview

This document contains comprehensive research on refactoring principles, patterns, and techniques to create a Refactoring domain expert agent. The research focuses on systematic code improvement techniques, identifying code smells, and applying proven refactoring patterns without changing external behavior.

## 1. Scope and Boundaries

**One-sentence scope**: "Systematic code improvement through proven refactoring techniques, code smell detection, pattern application, and structural optimization without changing external behavior"

**15 Recurring Problems** (frequency × complexity analysis):
1. **Long methods** (HIGH freq, MEDIUM complexity) - Methods doing too much, hard to understand
2. **Duplicated code** (HIGH freq, LOW complexity) - Copy-pasted code across multiple locations
3. **Large classes** (HIGH freq, MEDIUM complexity) - Classes with too many responsibilities
4. **Long parameter lists** (MEDIUM freq, LOW complexity) - Methods with 4+ parameters
5. **Divergent change** (MEDIUM freq, HIGH complexity) - One class changed for multiple reasons
6. **Shotgun surgery** (MEDIUM freq, HIGH complexity) - One change requires many small edits
7. **Feature envy** (MEDIUM freq, MEDIUM complexity) - Method uses another class more than its own
8. **Data clumps** (MEDIUM freq, LOW complexity) - Same groups of data appearing together
9. **Primitive obsession** (HIGH freq, LOW complexity) - Overuse of primitives instead of objects
10. **Switch statements** (MEDIUM freq, MEDIUM complexity) - Complex conditionals that should be polymorphic
11. **Parallel inheritance hierarchies** (LOW freq, HIGH complexity) - Creating subclass in one requires another
12. **Lazy class** (LOW freq, LOW complexity) - Classes that don't do enough to justify existence
13. **Speculative generality** (MEDIUM freq, MEDIUM complexity) - Unused abstraction "just in case"
14. **Temporary field** (LOW freq, MEDIUM complexity) - Fields only used in certain circumstances
15. **Message chains** (MEDIUM freq, MEDIUM complexity) - Long chains of method calls (a.getB().getC().getD())

**Sub-domain mapping**:
- **Performance optimization** → react-performance-expert or nodejs-expert
- **Type system refactoring** → typescript-type-expert
- **Test refactoring** → testing-expert
- **Database schema refactoring** → database-expert
- **Build configuration refactoring** → webpack-expert or vite-expert

## 2. Topic Map (6 Categories)

### Category 1: Composing Methods

**Common Code Smells:**
- Long Method (>10 lines doing multiple things)
- Duplicated Code in methods
- Complex conditionals
- Comments explaining what code does (not why)

**Root Causes:**
- Methods evolved over time without refactoring
- Copy-paste programming
- Fear of creating small methods
- Mixing abstraction levels

**Refactoring Techniques:**
1. **Extract Method**: Pull code into well-named method
2. **Inline Method**: Replace method call with method body when body is clearer
3. **Extract Variable**: Give expressions meaningful names
4. **Inline Temp**: Replace temp variable with query
5. **Replace Temp with Query**: Replace variable with method call
6. **Split Temporary Variable**: Give each assignment its own variable
7. **Remove Assignments to Parameters**: Use local variable instead
8. **Replace Method with Method Object**: Turn method into its own object
9. **Substitute Algorithm**: Replace algorithm with clearer one

**Diagnostics:**
```bash
# Detect long methods
grep -n "^[[:space:]]*function\|^[[:space:]]*async\|^[[:space:]]*method" --include="*.js" --include="*.ts" -A 20
# Count method lines
awk '/function|method|async/ {start=NR} /^[[:space:]]*}/ {if(start) print FILENAME":"start"-"NR":"(NR-start)" lines"; start=0}'
```

**Validation:**
- Methods under 10 lines
- Single responsibility per method
- Clear method names describe what, not how
- No code duplication

### Category 2: Moving Features Between Objects

**Common Code Smells:**
- Feature Envy (method uses another class excessively)
- Inappropriate Intimacy (classes know too much about each other)
- Message Chains (a.getB().getC().doSomething())
- Middle Man (class only delegates to another)

**Root Causes:**
- Wrong initial design decisions
- Classes evolved separately
- Misunderstanding of responsibilities
- Over-engineering

**Refactoring Techniques:**
1. **Move Method**: Move method to class it uses most
2. **Move Field**: Move field to class that uses it most
3. **Extract Class**: Split class into two
4. **Inline Class**: Merge class into another
5. **Hide Delegate**: Create methods to hide delegation
6. **Remove Middle Man**: Talk directly to responsible object
7. **Introduce Foreign Method**: Add method to class you can't modify
8. **Introduce Local Extension**: Create extension of class you can't modify

**Diagnostics:**
```bash
# Find feature envy (methods calling other objects frequently)
grep -n "\." --include="*.js" --include="*.ts" | grep -v "this\." | sort | uniq -c | sort -rn
# Find long message chains
grep -E "\.[a-zA-Z]+\(\)\.[a-zA-Z]+\(\)\." --include="*.js" --include="*.ts"
```

**Validation:**
- Methods primarily use their own class's data
- No long message chains
- Clear class responsibilities
- Minimal coupling between classes

### Category 3: Organizing Data

**Common Code Smells:**
- Primitive Obsession (using primitives instead of objects)
- Data Clumps (same data appearing together)
- Data Class (class with only getters/setters)
- Temporary Field (field only sometimes used)

**Root Causes:**
- Starting simple with primitives
- Not recognizing domain concepts
- Anemic domain model
- Premature optimization

**Refactoring Techniques:**
1. **Self Encapsulate Field**: Use getters/setters for field access
2. **Replace Data Value with Object**: Turn data into object
3. **Change Value to Reference**: Make value object a reference
4. **Change Reference to Value**: Make reference object a value
5. **Replace Array with Object**: Use object when array elements mean different things
6. **Duplicate Observed Data**: Sync data between domain and presentation
7. **Change Unidirectional to Bidirectional**: Add back pointer
8. **Change Bidirectional to Unidirectional**: Remove back pointer
9. **Replace Magic Number with Constant**: Name magic values
10. **Encapsulate Field**: Make field private, add accessors
11. **Encapsulate Collection**: Return copy, not original collection
12. **Replace Record with Data Class**: Create class for record
13. **Replace Type Code with Class**: Turn type code into class
14. **Replace Type Code with Subclasses**: Create subclass for each type
15. **Replace Type Code with State/Strategy**: Use state pattern

**Diagnostics:**
```bash
# Find magic numbers
grep -E "[^a-zA-Z_][0-9]{2,}[^0-9]" --include="*.js" --include="*.ts"
# Find data clumps (parameters appearing together)
grep -E "function.*\(.*,.*,.*,.*\)" --include="*.js" --include="*.ts"
```

**Validation:**
- No magic numbers in code
- Domain concepts represented as objects
- Proper encapsulation
- Collections properly protected

### Category 4: Simplifying Conditional Expressions

**Common Code Smells:**
- Complex conditionals (multiple && and ||)
- Duplicate conditions in if-else chains
- Switch statements that should be polymorphic
- Null checks everywhere

**Root Causes:**
- Business logic complexity
- Missing abstraction
- Not using polymorphism
- Defensive programming

**Refactoring Techniques:**
1. **Decompose Conditional**: Extract condition and branches to methods
2. **Consolidate Conditional Expression**: Combine conditionals with same result
3. **Consolidate Duplicate Conditional Fragments**: Move duplicate code outside condition
4. **Remove Control Flag**: Use break or return instead of flag
5. **Replace Nested Conditional with Guard Clauses**: Use early returns
6. **Replace Conditional with Polymorphism**: Use inheritance/polymorphism
7. **Introduce Null Object**: Create object representing null case
8. **Introduce Assertion**: Make assumption explicit

**Diagnostics:**
```bash
# Find complex conditionals
grep -E "if.*&&.*\|\|" --include="*.js" --include="*.ts"
# Find nested conditionals (3+ levels)
awk '/if.*{/ {depth++} /}/ {if(depth>0) depth--} {if(depth>=3) print FILENAME":"NR" Depth:"depth}'
# Find switch statements
grep -n "switch" --include="*.js" --include="*.ts"
```

**Validation:**
- Conditionals are simple and readable
- No duplicate conditional logic
- Guard clauses used for early returns
- Polymorphism used where appropriate

### Category 5: Making Method Calls Simpler

**Common Code Smells:**
- Long parameter lists (>3 parameters)
- Parameters that are flags
- Methods that return error codes
- Complex constructors

**Root Causes:**
- Method doing too much
- Missing parameter object
- Not using exceptions
- Complex initialization

**Refactoring Techniques:**
1. **Rename Method**: Give method better name
2. **Add Parameter**: Add parameter to method
3. **Remove Parameter**: Remove unused parameter
4. **Separate Query from Modifier**: Split method that returns and changes
5. **Parameterize Method**: Create one method for similar methods
6. **Replace Parameter with Explicit Methods**: Create separate methods
7. **Preserve Whole Object**: Pass whole object instead of values
8. **Replace Parameter with Method**: Let receiver invoke method
9. **Introduce Parameter Object**: Group parameters into object
10. **Remove Setting Method**: Remove setter for field that shouldn't change
11. **Hide Method**: Make method private if not used externally
12. **Replace Constructor with Factory Method**: Use factory instead of constructor
13. **Replace Error Code with Exception**: Throw exception instead of returning error
14. **Replace Exception with Test**: Test condition instead of catching exception

**Diagnostics:**
```bash
# Find long parameter lists
grep -E "function.*\([^)]{50,}\)" --include="*.js" --include="*.ts"
# Find boolean parameters (likely flags)
grep -E "function.*\(.*(true|false).*\)" --include="*.js" --include="*.ts"
```

**Validation:**
- Methods have 3 or fewer parameters
- No flag parameters
- Clear method names
- Exceptions used for errors

### Category 6: Dealing with Generalization

**Common Code Smells:**
- Duplicate code in sibling classes
- Classes with similar methods but different signatures
- Refused bequest (subclass doesn't use parent features)
- Alternative classes with different interfaces

**Root Causes:**
- Missing abstraction
- Parallel development
- Wrong inheritance hierarchy
- Interface mismatch

**Refactoring Techniques:**
1. **Pull Up Field**: Move field to superclass
2. **Pull Up Method**: Move method to superclass
3. **Pull Up Constructor Body**: Move constructor code to superclass
4. **Push Down Method**: Move method to subclass
5. **Push Down Field**: Move field to subclass
6. **Extract Subclass**: Create subclass for subset of features
7. **Extract Superclass**: Create superclass for shared features
8. **Extract Interface**: Define interface for common methods
9. **Collapse Hierarchy**: Merge subclass into superclass
10. **Form Template Method**: Create template method pattern
11. **Replace Inheritance with Delegation**: Use composition over inheritance
12. **Replace Delegation with Inheritance**: Use inheritance when appropriate

**Diagnostics:**
```bash
# Find duplicate methods in classes
grep -h "function\|method" --include="*.js" --include="*.ts" | sort | uniq -c | sort -rn
# Find inheritance (extends keyword)
grep -n "extends" --include="*.js" --include="*.ts"
```

**Validation:**
- No duplicate code in hierarchy
- Proper use of inheritance
- Interfaces properly extracted
- Liskov Substitution Principle followed

## 3. Common Refactoring Patterns

### Safe Refactoring Process
1. **Ensure tests exist** (create if needed)
2. **Make small change**
3. **Run tests**
4. **Commit if green**
5. **Repeat**

### Refactoring Priority Matrix
```
Impact/Effort | Low Effort | High Effort
--------------+------------+-------------
High Impact   | DO FIRST   | DO SECOND
Low Impact    | DO LATER   | AVOID
```

### Before Refactoring Checklist
- [ ] Tests are passing
- [ ] Understand what code does
- [ ] Have identified specific smell
- [ ] Know which refactoring to apply
- [ ] Can do it incrementally

### After Refactoring Checklist
- [ ] Tests still passing
- [ ] Code is cleaner
- [ ] No new smells introduced
- [ ] Performance unchanged/improved
- [ ] Documentation updated if needed

## 4. Code Smell Detection Patterns

### Bloaters
- **Long Method**: > 10 lines
- **Large Class**: > 200 lines or > 7 methods
- **Long Parameter List**: > 3 parameters
- **Data Clumps**: Same 3+ values appearing together
- **Primitive Obsession**: Using primitives for domain concepts

### Object-Orientation Abusers
- **Switch Statements**: Could be polymorphism
- **Temporary Field**: Field not always used
- **Refused Bequest**: Subclass ignores parent
- **Alternative Classes**: Similar classes, different interfaces

### Change Preventers
- **Divergent Change**: Class changed for many reasons
- **Shotgun Surgery**: One change affects many classes
- **Parallel Inheritance**: Creating one subclass requires another

### Dispensables
- **Comments**: Explaining what, not why
- **Duplicate Code**: Same code in 2+ places
- **Lazy Class**: Not doing enough
- **Data Class**: Only getters/setters
- **Dead Code**: Unused code
- **Speculative Generality**: Unused flexibility

### Couplers
- **Feature Envy**: Method uses other class more
- **Inappropriate Intimacy**: Classes know too much about each other
- **Message Chains**: a.getB().getC().doD()
- **Middle Man**: Class just delegates

## 5. Tool Support

### Static Analysis Tools
```bash
# JavaScript/TypeScript
- ESLint with complexity rules
- SonarJS for code smells
- JSHint for basic issues
- TSLint (deprecated, use ESLint)

# General
- SonarQube for comprehensive analysis
- CodeClimate for maintainability
```

### Refactoring Support in IDEs
- **VSCode**: Built-in refactoring commands (F2 for rename, etc.)
- **WebStorm**: Comprehensive refactoring menu
- **Visual Studio**: Refactoring tools for C#/TypeScript

### Metrics to Track
- Cyclomatic Complexity (should be < 10)
- Lines of Code per method (< 20)
- Number of parameters (< 4)
- Coupling between objects (low)
- Depth of inheritance (< 4)
- Response for class (< 7 methods)

## 6. Common Anti-Patterns to Avoid

### Refactoring Anti-Patterns
1. **Big Bang Refactoring**: Trying to refactor everything at once
2. **Refactoring Without Tests**: No safety net
3. **Premature Refactoring**: Refactoring before understanding
4. **Gold Plating**: Adding unnecessary improvements
5. **Ignoring Performance**: Making code slower for "cleanliness"

### How to Avoid
- Always refactor incrementally
- Ensure test coverage first
- Understand code before changing
- Focus on actual problems
- Measure performance impact

## 7. Resources and References

### Key Concepts
- Code Smells: Indicators that refactoring might be needed
- Refactoring: Changing code structure without changing behavior
- Technical Debt: Cost of additional rework
- Boy Scout Rule: Leave code cleaner than you found it

### Refactoring Workflow
1. **Identify** smell
2. **Choose** refactoring
3. **Apply** incrementally
4. **Test** continuously
5. **Commit** frequently

### Decision Framework
```
Should I refactor?
├── Is it broken? → No → Is it hard to change? 
│                          ├── Yes → Refactor
│                          └── No → Is it hard to understand?
│                                    ├── Yes → Refactor
│                                    └── No → Leave it
└── Yes → Fix first, then consider refactoring
```