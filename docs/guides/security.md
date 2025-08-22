# Security Guide: Protecting Sensitive Files

## Overview

ClaudeKit includes built-in protection for sensitive files to prevent AI assistants from accidentally accessing or exposing confidential information. The file-guard hook runs automatically before any file access operation and blocks access to files that match protection patterns.

## Quick Start

### Basic Protection

Create a `.agentignore` file in your project root:

```gitignore
# .agentignore

# Protect all environment files
.env
.env.*

# Protect keys and certificates
*.key
*.pem
*.crt

# Protect cloud credentials
.aws/credentials
.gcp/credentials.json

# But allow example files
!.env.example
!config.sample.json
```

That's it! The hook will automatically protect these files from AI access.

### Testing Your Protection

Test if files are properly protected:

```bash
# Test if .env is blocked
echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
  claudekit-hooks run file-guard

# Should output: permissionDecision: "deny"
```

## How It Works

The file-guard hook:

1. **Triggers before file access** - Runs on Read, Edit, MultiEdit, and Write tools
2. **Merges patterns from all ignore files** - Checks multiple formats simultaneously
3. **Resolves symlinks** - Prevents bypassing protection via symbolic links
4. **Blocks path traversal** - Prevents accessing files outside the project
5. **Returns access decision** - Either allows or denies the operation

## Supported Ignore Files

ClaudeKit's unique approach merges patterns from **all** available ignore files:

| File | Tool/Platform |
|------|---------------|
| `.agentignore` | Recommended for new projects |
| `.aiignore` | JetBrains AI Assistant |
| `.aiexclude` | Gemini Code Assist |
| `.geminiignore` | Gemini CLI |
| `.codeiumignore` | Codeium |
| `.cursorignore` | Cursor IDE |

**Key Advantage**: Unlike other tools that only check their own ignore file, ClaudeKit merges patterns from ALL available files, providing comprehensive protection regardless of which AI tools your team uses.

## Pattern Syntax

Uses standard gitignore syntax:

### Basic Patterns
```gitignore
# Match specific files
.env
config.json

# Match by extension
*.key
*.pem
*.secret

# Match directories
secrets/
private/

# Match in any subdirectory
**/credentials
**/secrets.json
```

### Negation Patterns
Use `!` to allow files that would otherwise be blocked:

```gitignore
# Block all .env files
.env*

# But allow example files
!.env.example
!.env.sample
!.env.template

# Block all config files
config/*

# But allow public config
!config/public.json
!config/README.md
```

### Comments and Organization
```gitignore
# Environment and configuration
.env
.env.*
config/local/*

# Authentication
*.key
*.pem
auth/

# Cloud provider credentials  
.aws/*
.gcp/*
azure-credentials.json

# Database files
*.sqlite
*.db
```

## Essential Protection Patterns

### Environment Variables
```gitignore
# Standard environment files
.env
.env.*
*.env

# Framework-specific
.env.local
.env.development.local
.env.test.local
.env.production.local

# But allow templates
!.env.example
!.env.template
!.env.sample
```

### API Keys and Tokens
```gitignore
# Certificate files
*.key
*.pem
*.pfx
*.p12
*.crt
*.cer

# Token files
token.json
access_token
api_key.txt
.npmrc
.pypirc
```

### SSH and Git Credentials
```gitignore
# SSH keys
.ssh/*
id_rsa*
id_dsa*
id_ecdsa*
id_ed25519*

# Git credentials
.git-credentials
.netrc
```

### Cloud Provider Credentials
```gitignore
# AWS
.aws/*
credentials

# Google Cloud
.gcp/*
service-account.json
google-credentials.json

# Azure
.azure/*
azure-credentials.json

# Other providers
.digitalocean/*
.heroku/*
```

### Database and Local Storage
```gitignore
# SQLite databases
*.sqlite
*.sqlite3
*.db

# Local data
data/
storage/
cache/
*.log

# Configuration with secrets
*.local
*.local.json
*.private.json
config/local/*
```

## Advanced Configuration

### Directory-Level Protection
Protect entire directories:

```gitignore
# Protect all files in these directories
private/
secrets/
credentials/
.certificates/
internal/
vendor/confidential/
```

### Framework-Specific Patterns

#### Node.js Projects
```gitignore
# Environment
.env*
!.env.example

# Package manager
.npmrc
.yarnrc
.pnpm-store

# Local config
config/local.js
config/production.js
```

#### Python Projects
```gitignore
# Environment
.env
*.env
venv/
.venv/

# Credentials
.pypirc
credentials.py
secrets.py
```

#### Docker Projects
```gitignore
# Environment files
.env*
docker-compose.override.yml

# Secrets
secrets/
.secrets/
```

## Best Practices

### 1. Start with Essential Patterns
Begin with the most critical files:
```gitignore
.env
.env.*
*.key
.aws/credentials
.ssh/*
```

### 2. Use Comments for Organization
```gitignore
# === ENVIRONMENT ===
.env*

# === CREDENTIALS ===
*.key
*.pem

# === CLOUD PROVIDERS ===
.aws/*
.gcp/*
```

### 3. Allow Safe Variants
```gitignore
# Block secrets
.env*
secrets/*

# Allow examples and templates  
!.env.example
!secrets/README.md
!secrets/template.json
```

### 4. Test Your Patterns
Regularly test that protection works:
```bash
# Test critical files
for file in .env config/secrets.json .aws/credentials; do
  echo "Testing: $file"
  echo '{"tool_name":"Read","tool_input":{"file_path":"'$file'"}}' | \
    claudekit-hooks run file-guard | grep -q "deny" && echo "✓ Protected" || echo "✗ Not protected"
done
```

### 5. Regular Pattern Audits
- Review patterns monthly
- Remove patterns for files that no longer exist
- Add patterns for new types of sensitive files
- Check team members are following conventions

## Security Considerations

### Defense in Depth
File protection is one layer of security. Also:
- **Never commit secrets to version control**
- **Use environment variables for configuration**
- **Rotate credentials regularly**
- **Use secret management tools in production**
- **Limit file system permissions**

### Symlink Protection
The hook automatically:
- Resolves symlinks to their actual targets
- Checks both the symlink path and target path
- Prevents bypassing protection by creating symlinks

### Path Traversal Prevention
Automatically blocks:
- `../../../etc/passwd` - Path traversal attempts
- `/etc/passwd` - Absolute paths outside project
- `~/.ssh/id_rsa` - User home directory access

### Limitations
- Protection only works when ClaudeKit hooks are enabled
- Local file system permissions still apply
- Does not protect against user manually sharing file contents
- Cannot prevent AI from inferring secrets from context

## Troubleshooting

### Issue: Legitimate Files Blocked

**Symptoms:**
```
Access denied: 'config.json' is protected by .agentignore
```

**Solutions:**
1. **Check all ignore files** - Patterns might be in multiple files
2. **Use negation patterns**:
   ```gitignore
   config/*
   !config/public.json
   ```
3. **Make patterns more specific**:
   ```gitignore
   # Too broad
   *.json
   
   # More specific
   secrets/*.json
   config/private.json
   ```

### Issue: Protection Not Working

**Symptoms:** Expected files are not blocked

**Debugging steps:**
1. **Check hook is enabled:**
   ```bash
   claudekit-hooks list | grep file-guard
   ```

2. **Test pattern matching:**
   ```bash
   echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
     claudekit-hooks run file-guard
   ```

3. **Check ignore files exist:**
   ```bash
   ls -la .agentignore .aiignore .cursorignore 2>/dev/null
   ```

4. **Verify pattern syntax:**
   ```bash
   # Check for common errors
   grep -E "^\s|\s$" .agentignore  # Leading/trailing spaces
   grep -E "\\\\" .agentignore      # Windows backslashes
   ```

### Issue: Complex Pattern Not Working

**Common mistakes:**
```gitignore
# Wrong - backslashes on Unix systems
config\\secrets.json

# Correct - forward slashes
config/secrets.json

# Wrong - spaces around patterns
 *.key 

# Correct - no spaces
*.key

# Wrong - trying to use regex
.*\.secret$

# Correct - glob patterns
*.secret
```

### Issue: Patterns from Multiple Files Conflicting

When you have multiple ignore files:
1. **Check all files:**
   ```bash
   for f in .agentignore .aiignore .cursorignore; do
     echo "=== $f ==="
     cat "$f" 2>/dev/null || echo "(not found)"
   done
   ```

2. **Understand merge order** - Later patterns can override earlier ones
3. **Consolidate into .agentignore** for cleaner management

## Migration from Other Tools

### From Cursor IDE
Your existing `.cursorignore` works automatically. To consolidate:

```bash
# Copy patterns to new file
cp .cursorignore .agentignore

# Add ClaudeKit-specific patterns
echo "" >> .agentignore
echo "# ClaudeKit additions" >> .agentignore
echo ".env.*" >> .agentignore
```

### From JetBrains AI
Your existing `.aiignore` is automatically recognized:

```bash
# Optionally consolidate
cat .aiignore > .agentignore
echo "# Additional patterns" >> .agentignore
```

### From Gemini/Codeium
Existing `.geminiignore` and `.codeiumignore` files work as-is.

### Best Practice for Teams
For new projects, create `.agentignore` as the primary file:

```gitignore
# .agentignore - Primary AI ignore file for this project

# Environment
.env*
!.env.example

# Credentials  
*.key
*.pem
.aws/*
.ssh/*

# Local config
config/local/*
*.local.json
```

## Integration with Development Workflow

### Git Hooks Integration
Ensure `.agentignore` is tracked in git:

```bash
# Add to repository
git add .agentignore
git commit -m "Add AI assistant file protection patterns"

# Create git hook to validate patterns
echo '#!/bin/bash
claudekit-hooks run file-guard --validate' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### Team Onboarding
Add to your project README:

```markdown
## AI Assistant Setup

This project uses ClaudeKit for AI assistant safety. Sensitive files are automatically protected via `.agentignore`.

To test protection:
```bash
claudekit doctor  # Verify setup
```
```

### CI/CD Integration
Add validation to your CI pipeline:

```yaml
# .github/workflows/validate.yml
- name: Validate AI file protection
  run: |
    npm install -g claudekit
    claudekit doctor
    # Test critical files are protected
    echo '{"tool_name":"Read","tool_input":{"file_path":".env"}}' | \
      claudekit-hooks run file-guard | grep -q "deny"
```

## Advanced Use Cases

### Dynamic Pattern Loading
For complex projects, you can use multiple ignore files strategically:

```bash
# Base patterns for all environments
.agentignore

# Development-specific (local only, not committed)
.agentignore.local

# Team-specific patterns
.agentignore.team
```

### Conditional Protection
Use environment variables to conditionally enable protection:

```bash
# In development, create looser patterns
if [ "$NODE_ENV" = "development" ]; then
  cp .agentignore.dev .agentignore
else
  cp .agentignore.prod .agentignore
fi
```

### Audit Trail
Track what files were blocked:

```bash
# Enable debug logging
export CLAUDEKIT_DEBUG=true

# Check logs for blocked files
tail -f ~/.claude/hooks.log | grep "file-guard"
```

## Security Patterns by Industry

### Financial Services
```gitignore
# Credentials
*.key
*.pem
certificates/

# Customer data
customer-data/
pii/
financial-records/

# Compliance
audit/
compliance/
regulatory/
```

### Healthcare
```gitignore
# PHI Protection
patient-data/
medical-records/
phi/

# Compliance
hipaa/
fhir-credentials/
hl7-config/
```

### E-commerce
```gitignore
# Payment processing
payment-config/
stripe-keys/
paypal-config/

# Customer data
customer-export/
orders-backup/
```

---

## Summary

ClaudeKit's file protection provides:

✅ **Multi-format support** - Works with all major AI tools  
✅ **Automatic pattern merging** - Combines patterns from all ignore files  
✅ **Symlink protection** - Prevents bypass attempts  
✅ **Path traversal prevention** - Blocks access outside project  
✅ **Gitignore syntax** - Familiar pattern format  
✅ **Negation patterns** - Fine-grained control  
✅ **Zero configuration** - Works with sensible defaults  

For questions or issues, see the [troubleshooting section](#troubleshooting) or check our [GitHub Issues](https://github.com/carlrannaberg/claudekit/issues).