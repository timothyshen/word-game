# World of Realms - Project Documentation

> **Must use Bun** - This project requires bun as the package manager and runtime. Do not use npm/yarn/pnpm. All commands should use `bun`.

## Overview

A T3 Stack-based lord management text game where players manage territory, recruit characters, explore worlds, and challenge bosses.

### Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (Prisma ORM)
- **API**: tRPC
- **Auth**: Simple email auth (dev-session cookie)
- **Testing**: Vitest
- **UI**: shadcn/ui
- **Package Manager**: Bun (required)

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── admin/             # Admin dashboard
│   ├── game/              # Main game page
│   └── login/             # Login/register
├── components/
│   ├── game/              # Game components
│   │   ├── panels/        # Panel components
│   │   ├── outer-city/    # Outer city components
│   │   └── IsometricMap.tsx
│   └── ui/                # shadcn/ui components
├── engine/                 # Game engine (ECS, rules, modules)
│   ├── entity/            # Entity system (EntityManager)
│   ├── modules/           # Game modules (progression, territory, etc.)
│   ├── rules/             # Rule engine + seed rules
│   └── formulas/          # Formula engine
├── server/
│   └── api/
│       ├── routers/       # tRPC routers (grouped by domain)
│       ├── services/      # Business logic services
│       ├── repositories/  # Data access layer
│       ├── utils/         # Shared utilities
│       └── __tests__/     # Unit tests
└── trpc/                  # tRPC client config
```

## Auth System

### Test Account
- **Email**: `test@test.com`
- **Username**: Test Player
- **Character**: Test Lord
- **Level**: 5

### Auth Routes (`auth.ts`)
- `register` - Register new user (email, username, character name)
- `login` - Email login
- `me` - Get current user info
- `logout` - Logout

Auth uses a `dev-session` cookie storing user ID, valid for 7 days.

## Admin Dashboard

Access `/admin` to manage game data:

| Feature | Path | Description |
|---------|------|-------------|
| Cards | `/admin/cards` | CRUD card templates |
| Stories | `/admin/stories` | Manage chapters and nodes |
| Adventures | `/admin/adventures` | Manage exploration events |
| Overview | `/admin` | View statistics |

## Core Systems

### 1. Player System (`player.ts`)
- Player state management (level, resources, attributes)
- Stamina auto-recovery (time-based calculation)
- Character management, skill management

### 2. Settlement System (`settlement.ts`)
- Daily settlement (action score -> grade -> rewards)
- Consecutive achievement bonus mechanism
- Card distribution

### 3. Combat System (`combat.ts`)
- Turn-based text combat
- Skill system (attack, heavy strike, defend, fireball, heal, flee)
- Buff/debuff mechanics
- Combat rewards (exp, gold, card drops)

### 4. Card Altar (`altar.ts`)
- Gacha draws (single/10x, normal/premium)
- Card synthesis (quality upgrade)
- Card sacrifice (gain crystals/gold)
- Pity system

### 5. Equipment System (`equipment.ts`)
- 11 equipment slots (main hand, off hand, helmet, chest, belt, gloves, pants, boots, necklace, ring x2)
- Equip/unequip
- Enhancement (decreasing success rate)

### 6. Tier Breakthrough (`breakthrough.ts`)
- Player/character tier advancement
- Skill slot increase (tier x 6)
- Level cap increase

### 7. Profession System (`profession.ts`)
- Profession learning and bonuses
- Player professions, character professions

### 8. Portal System (`portal.ts`)
- Realm worlds (Main, Fire, Ice, Shadow, Celestial)
- World teleportation
- Unlock condition checks

### 9. Story System (`story.ts`)
- Chapter-based storyline
- Choice branches
- Story rewards

### 10. Boss System (`boss.ts`)
- Weekly boss challenges
- Attempt limits
- Rich rewards

### 11. Exploration System (`exploration.ts`)
- Wilderness exploration
- Random events
- Wilderness facilities

### 12. Building System (`building.ts`)
- Building construction/upgrade
- Resource output calculation
- Worker assignment

### 13. Card System (`card.ts`)
- Card usage (building, recruit, skill, item cards)
- Card inventory management

### 14. Admin System (`admin.ts`)
- Card CRUD
- Story chapter/node management
- Adventure event management
- Data statistics

## Database Models

### Entity System (ECS)
All player-owned instances (characters, cards, buildings, equipment) use the Entity system:
- `Entity` - Runtime instance with JSON state
- `EntityTemplate` - Template defining defaults
- `EntitySchema` - Schema defining components

### Template Models (kept as Prisma models)
- `Character` - Character templates
- `Card` - Card templates
- `Building` - Building templates
- `Equipment` - Equipment templates
- `Skill` - Skill templates
- `Profession` - Profession templates

### Junction Tables (FK to Entity)
- `CharacterSkill` - Skills learned by character entities
- `CharacterProfession` - Professions held by character entities
- `HeroInstance` - Outer city hero instances (references character Entity)

### Progress Models
- `StoryProgress` - Story progress
- `ActionLog` - Action records
- `SettlementLog` - Settlement records
- `BossStatus` - Boss status

### Engine Models
- `Game` - Game instance
- `GameRule` - Rules (formulas, configs, weights)

## Frontend Panels

| Panel | File | Function |
|-------|------|----------|
| Settlement | `SettlementPanel.tsx` | Daily settlement, reward collection |
| Economy | `EconomyPanel.tsx` | Resource overview, output stats |
| Combat | `CombatPanel.tsx` | Turn-based combat UI |
| Altar | `AltarPanel.tsx` | Gacha, synthesis, sacrifice |
| Equipment | `EquipmentPanel.tsx` | 11-slot equipment management |
| Character Detail | `CharacterDetailPanel.tsx` | Character info |
| Building Detail | `BuildingDetailPanel.tsx` | Building upgrade, worker assignment |

## Development Commands

**Important: This project requires bun. Do not use npm/yarn/pnpm.**

```bash
# Development
bun dev

# Build
bun run build

# Database migration
bun prisma db push

# Database GUI
bun prisma studio

# Type checking
bun run typecheck

# Run tests
bun test

# Run tests with coverage
bun run test:coverage

# Database seed (includes test account)
bun prisma db seed

# Install dependencies
bun install
```

## Rarity Colors

| Rarity | Color Code |
|--------|------------|
| Common | `#888` |
| Fine | `#4a9` |
| Rare | `#59b` |
| Epic | `#e67e22` |
| Legendary | `#c9a227` |

## Testing

Unit tests use Vitest, located in `src/server/api/__tests__/`.

| Test File | Coverage |
|-----------|----------|
| `admin.test.ts` | Admin CRUD operations |
| `story.test.ts` | Story system |
| `exploration.test.ts` | Exploration system |

Tests use a Mock Prisma Client, see `helpers.ts`.

## Important Notes

1. **Package manager**: Must use bun, never npm/yarn/pnpm
2. **Stamina system**: Time-based auto-recovery via `calculateCurrentStamina` in `player.ts`
3. **Settlement system**: Players must manually claim rewards
4. **Combat system**: Uses in-memory state storage; should use Redis in production
5. **Boss system**: Weekly attempt reset on Monday
6. **API calls**: Use tRPC hooks (`useQuery`, `useMutation`)
7. **Auth**: Simple email auth, cookie name `dev-session`
8. **Entity system**: All player instances (characters, cards, buildings, equipment) stored as Entity records with JSON state
9. **Rule engine**: Game constants defined as `GameRule` records, accessed via `ruleService.getConfig/getFormula/getWeights`

## TODO

- [ ] Persist combat state (currently using in-memory Map)
- [ ] Add more story chapters
- [ ] Add more bosses
- [ ] Add more professions
- [ ] Improve equipment drop system
- [ ] Add guild system
- [ ] Add PVP system
