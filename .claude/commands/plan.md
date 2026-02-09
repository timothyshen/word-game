---
name: plan
description: Create implementation plan before coding
---

# /plan Command

Create a detailed implementation plan before writing any code.

## Usage

```
/plan [feature description]
```

## Examples

```
/plan Add dark mode toggle to settings
/plan Implement character relationship visualization
/plan Fix the memory leak in editor component
```

## Workflow

1. **Invoke planner agent** with the feature description
2. **Analyze requirements** - understand what's really needed
3. **Assess risks** - identify breaking changes, edge cases
4. **Break into phases** - create step-by-step implementation plan
5. **WAIT for confirmation** - never proceed without explicit "yes"

## Critical Rules

- **NO CODE** until plan is approved
- All file paths must be **absolute**
- Every phase must have **verification criteria**
- Edge cases must be **identified upfront**

## What You Get

A structured plan with:
- Requirements analysis
- Risk assessment
- Phase-by-phase breakdown
- Edge cases and test strategy

## Next Steps

After plan approval:
1. Use `/tdd` to implement with tests
2. Use `/code-review` before committing
