---
name: code-review
description: Review code for quality, security, and maintainability
---

# /code-review Command

Comprehensive code review for quality, security, and "good taste".

## Usage

```
/code-review
/code-review [specific files or scope]
```

## Examples

```
/code-review
/code-review components/editor/
/code-review --staged
```

## What Gets Checked

### Security (CRITICAL)
- Hardcoded secrets
- SQL/Command injection
- XSS vulnerabilities
- Authentication issues

### Code Quality (HIGH)
- Functions >50 lines
- Files >800 lines
- Nesting >3 levels
- N+1 queries

### Best Practices (MEDIUM)
- Type safety
- Error handling
- Code duplication
- Naming conventions

### Good Taste Check
- How many special cases / conditionals?
- Can any be eliminated with better data structures?
- Is the complexity justified?

## Review Output

```
## Summary
Files Reviewed: [n]
Verdict: APPROVE / NEEDS WORK / BLOCK

## Findings
### CRITICAL
- [File:Line] - Issue description

### HIGH
...

## Verdict Reasoning
[Why this decision was made]
```

## Approval Criteria

| Decision | When |
|----------|------|
| APPROVE | No CRITICAL or HIGH issues |
| NEEDS WORK | Has HIGH issues to fix |
| BLOCK | Has CRITICAL issues |
