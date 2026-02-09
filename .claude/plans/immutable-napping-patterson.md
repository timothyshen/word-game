# Update README.md

## Problem

README.md is outdated:
- Version badge says `1.1.0` — actual version is `0.4.3`
- Testing section says "15 tests" — actual count is 746+ (36 test files)
- Missing features from v0.3-v0.4.3 (achievements, knowledge base, canvas, AI assistant, invite codes, mobile)
- "Creadeo" in title — product is now "Creader"
- Production URL not listed (creader.io)

## Changes

**File**: `README.md`

### Updates
1. **Title**: "Creadeo" → "Creader"
2. **Version badge**: `1.1.0` → `0.4.3`
3. **Production URL badge**: Add creader.io link
4. **Features list**: Add achievements, invite codes, mobile support, i18n, publishing
5. **Testing section**: Update to 746+ tests across 36 files, mention Playwright E2E
6. **Tech Stack**: Add next-intl, Zod, shadcn/ui
7. **Project Structure**: Update to reflect current directory layout (add `i18n/`, `messages/`, `scripts/`)
8. **Deployment section**: Add creader.io as production URL

### Keep unchanged
- Quick Start instructions (still accurate)
- Git workflow (still accurate)
- CI/CD pipeline (still accurate)
- Contributing guidelines (still accurate)
- Package manager notes (still accurate)

## Verification
- Visual scan of updated README for accuracy against CLAUDE.md and CHANGELOG.md
