# File Organization Guide

claudekit promotes clean, well-organized codebases through standardized file organization conventions. This guide explains the recommended structure and how claudekit commands help maintain it.

## Overview

The file organization system consists of two main principles:
1. **Persistent documentation** goes in the `reports/` directory
2. **Temporary files** go in the `temp/` directory

These conventions are:
- Established by `/agents-md:init` when setting up a new project
- Maintained by `/dev:cleanup` which identifies files that violate these patterns
- Documented in your project's AGENTS.md for consistency

## Reports Directory

The `reports/` directory is for all persistent project documentation, analysis, and reports that should be tracked in version control.

### Directory Structure

```
reports/
├── README.md                    # Explains the reports directory purpose
├── implementation/              # Feature implementation documentation
│   ├── FEATURE_AUTH_REPORT.md
│   ├── PHASE_1_VALIDATION.md
│   └── IMPLEMENTATION_SUMMARY_API.md
├── testing/                     # Test results and coverage reports
│   ├── TEST_RESULTS_2024-07-18.md
│   ├── COVERAGE_REPORT_2024-07-18.md
│   └── E2E_TEST_SUMMARY.md
├── performance/                 # Performance analysis and benchmarks
│   ├── PERFORMANCE_ANALYSIS_API.md
│   ├── LOAD_TEST_RESULTS.md
│   └── OPTIMIZATION_REPORT.md
├── validation/                  # Quality and validation reports
│   ├── CODE_QUALITY_REPORT.md
│   ├── SECURITY_SCAN_2024-07-18.md
│   └── DEPENDENCY_AUDIT.md
└── architecture/               # Architecture decisions and diagrams
    ├── ADR_001_DATABASE_CHOICE.md
    └── SYSTEM_DESIGN_OVERVIEW.md
```

### Naming Conventions

Reports should follow these naming patterns:

| Report Type | Pattern | Example |
|------------|---------|---------|
| Implementation | `[FEATURE]_[SCOPE]_REPORT.md` | `FEATURE_AUTH_REPORT.md` |
| Testing | `[TYPE]_RESULTS_[DATE].md` | `TEST_RESULTS_2024-07-18.md` |
| Performance | `PERFORMANCE_[SCOPE]_[METRIC].md` | `PERFORMANCE_API_LATENCY.md` |
| Validation | `[CHECK]_REPORT_[DATE].md` | `SECURITY_REPORT_2024-07-18.md` |
| Phase Reports | `PHASE_[N]_[TYPE].md` | `PHASE_2_VALIDATION.md` |

### Common Report Types

**Implementation Reports:**
- `IMPLEMENTATION_SUMMARY_[FEATURE].md` - Summary of feature implementation
- `PHASE_[N]_VALIDATION_REPORT.md` - Phase completion validation
- `FEATURE_[NAME]_REPORT.md` - Detailed feature documentation
- `MIGRATION_[TYPE]_COMPLETE.md` - Migration completion reports

**Testing Reports:**
- `TEST_RESULTS_[DATE].md` - Test execution results
- `COVERAGE_REPORT_[DATE].md` - Code coverage analysis
- `E2E_TEST_SUMMARY.md` - End-to-end test results
- `REGRESSION_TEST_[VERSION].md` - Regression test results

**Quality Reports:**
- `CODE_QUALITY_REPORT.md` - Static analysis results
- `SECURITY_SCAN_[DATE].md` - Security vulnerability scans
- `DEPENDENCY_AUDIT.md` - Dependency analysis
- `API_COMPATIBILITY_REPORT.md` - API compatibility checks

**Performance Reports:**
- `PERFORMANCE_ANALYSIS_[SCENARIO].md` - Performance test results
- `LOAD_TEST_RESULTS.md` - Load testing analysis
- `BENCHMARK_[COMPARISON].md` - Performance benchmarks
- `OPTIMIZATION_REPORT.md` - Optimization recommendations

## Temporary Files Directory

The `temp/` directory is for all temporary files, debugging scripts, and artifacts that should NOT be tracked in version control.

### Directory Structure

```
temp/                           # Root temporary directory (gitignored)
├── debug/                      # Debug scripts and utilities
│   ├── debug-api-calls.js
│   ├── analyze-memory-leak.js
│   └── trace-execution.py
├── test-artifacts/             # Temporary test outputs
│   ├── coverage/
│   ├── screenshots/
│   └── test-results.xml
├── experiments/                # Experimental code
│   ├── quick-test.js
│   ├── prototype-feature.ts
│   └── research-library.js
├── generated/                  # Generated files
│   ├── mock-data.json
│   └── test-fixtures/
└── logs/                      # Application logs
    ├── debug.log
    ├── error.log
    └── performance.log
```

### Common Temporary Patterns

**Debug Scripts:**
- `debug-*.js`, `debug-*.ts` - Debugging utilities
- `analyze-*.js`, `analyze-*.ts` - Analysis scripts
- `trace-*.py` - Tracing and profiling scripts
- `investigate-*.sh` - Investigation scripts

**Test Files:**
- `test-*.js`, `test-*.ts` - Temporary test files
- `quick-test.*` - Quick validation scripts
- `experiment-*.*` - Experimental code
- `prototype-*.*` - Prototype implementations

**Temporary Directories:**
- `temp-*/` - General temporary directories
- `test-*/` - Temporary test setups (e.g., `test-integration/`)
- `tmp-*/` - Alternative temporary directories
- `debug-*/` - Debug-specific directories

**Generated Artifacts:**
- `*-output.json` - Script outputs
- `*-results.txt` - Analysis results
- `*.log` - Log files
- `*.tmp` - Temporary files

## Integration with claudekit Commands

### `/agents-md:init`

When you run `/agents-md:init`, it:
1. Creates the `reports/` directory structure
2. Adds a comprehensive README.md to the reports directory
3. Documents these conventions in your AGENTS.md
4. Sets up appropriate .gitignore patterns

### `/dev:cleanup`

The cleanup command helps maintain these conventions by:
1. Identifying files that match temporary patterns but aren't in `/temp`
2. Proposing deletion of debug scripts and artifacts
3. Suggesting .gitignore patterns for common temporary files
4. Supporting both uncommitted and committed cleanup candidates

## .gitignore Patterns

Add these patterns to your `.gitignore` to maintain clean repositories:

```gitignore
# Temporary files and directories
/temp/
temp/
**/temp/
tmp/
**/tmp/

# Debug and analysis scripts
debug-*.js
debug-*.ts
analyze-*.js
analyze-*.ts
research-*.js
research-*.ts
*-debug.*
*.debug

# Test artifacts
test-*.js
test-*.ts
quick-test.*
*-test.js
*-test.ts
test-*/
!test/           # Don't ignore the main test directory
!tests/          # Don't ignore the main tests directory

# Temporary documentation
*_SUMMARY.md
*_REPORT.md
*_CHECKLIST.md
*_COMPLETE.md
*_GUIDE.md
*_ANALYSIS.md
*-analysis.md
verify-*.md

# Examples and experiments
*-examples.js
*-examples.ts
experiment-*.*
prototype-*.*

# Generated files
*.log
*.tmp
*-output.*
*-results.*

# IMPORTANT: Don't ignore the reports directory
!reports/
!reports/**
```

## Best Practices

### DO:
- ✅ Save all project reports to `reports/` with descriptive names
- ✅ Put temporary debugging scripts in `temp/`
- ✅ Use consistent naming patterns (PREFIX_DESCRIPTION_DATE.md)
- ✅ Include dates in report filenames for historical tracking
- ✅ Create subdirectories in reports/ for different report categories
- ✅ Run `/dev:cleanup` regularly to maintain organization

### DON'T:
- ❌ Leave debug scripts in the project root
- ❌ Commit temporary test files
- ❌ Use generic names like "report.md" or "test.js"
- ❌ Mix temporary files with source code
- ❌ Create report files outside the reports/ directory
- ❌ Forget to add temp/ to .gitignore

## Examples

### Good Organization
```
my-project/
├── reports/
│   ├── implementation/
│   │   └── FEATURE_AUTH_IMPLEMENTATION.md
│   └── testing/
│       └── TEST_RESULTS_2024-07-18.md
├── temp/
│   ├── debug-auth-flow.js
│   └── analyze-performance.py
├── src/
│   └── auth/
│       └── login.js
└── .gitignore (includes /temp/)
```

### Poor Organization (cleaned by `/dev:cleanup`)
```
my-project/
├── debug-auth.js              # Should be in temp/
├── TEST_SUMMARY.md            # Should be in reports/testing/
├── analyze-performance.js     # Should be in temp/
├── test-integration/          # Should be in temp/
├── MIGRATION_COMPLETE.md      # Should be in reports/
└── quick-test.js              # Should be in temp/
```

## Migration Guide

To adopt these conventions in an existing project:

1. **Run `/agents-md:init`** to set up the structure and documentation
2. **Create directories:**
   ```bash
   mkdir -p reports/{implementation,testing,performance,validation}
   mkdir -p temp/{debug,test-artifacts,experiments,logs}
   ```
3. **Move existing reports** to the reports/ directory
4. **Move temporary files** to the temp/ directory
5. **Update .gitignore** with the patterns above
6. **Run `/dev:cleanup`** to identify remaining cleanup candidates
7. **Commit the reorganization** with a clear message

## Summary

The file organization conventions promoted by claudekit help maintain clean, professional codebases by:
- Separating persistent documentation from temporary files
- Providing clear naming conventions
- Integrating with cleanup and initialization commands
- Preventing accidental commits of debug artifacts

Following these conventions makes your codebase more maintainable and helps AI assistants better understand your project structure.