---
name: orchestrate
description: Run multi-agent workflow for complex tasks
---

# /orchestrate Command

Chain multiple agents together for comprehensive task handling.

## Usage

```
/orchestrate [workflow] [task description]
```

## Workflow Types

### feature (default)
```
planner → tdd-guide → code-reviewer → security-reviewer
```
For new features, enhancements.

### bugfix
```
codebase-search → tdd-guide → code-reviewer
```
For bug fixes with test coverage.

### refactor
```
architect → code-reviewer → tdd-guide
```
For code restructuring.

### security
```
security-reviewer → code-reviewer → architect
```
For security-focused changes.

## Examples

```
/orchestrate feature Add bookmark functionality
/orchestrate bugfix Fix memory leak in canvas
/orchestrate refactor Simplify knowledge base store
/orchestrate security Review authentication flow
```

## Handoff Format

Each agent passes to the next with:

```markdown
## Handoff: [From Agent] → [To Agent]

### Context
[What was the original task]

### Work Completed
[What this agent did]

### Files Modified
- /path/to/file.ts - [what changed]

### Open Questions
- [Questions for next agent]

### Recommendations
- [Suggestions for next agent]
```

## Final Report

After all agents complete:

```markdown
## Orchestration Complete

### Task
[Original request]

### Agents Run
1. planner - Created implementation plan
2. tdd-guide - Implemented with tests
3. code-reviewer - Reviewed quality
4. security-reviewer - Verified security

### Verdict
SHIP / NEEDS WORK / BLOCKED

### Summary
[Key findings and changes made]
```

## When to Use

| Situation | Workflow |
|-----------|----------|
| New feature request | `feature` |
| Bug report | `bugfix` |
| "This code is messy" | `refactor` |
| Security concern | `security` |
| Complex task | `feature` (most comprehensive) |
