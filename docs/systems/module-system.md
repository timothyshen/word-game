# Module System & EventBus

Event-driven architecture where pluggable modules subscribe to game events and emit new events, creating reactive chains.

**Location**: `src/engine/modules/`, `src/engine/core/`

## EventBus

**File**: `src/engine/core/EventBus.ts`

Pub/Sub event dispatcher with pattern matching and priority.

```typescript
engine.events.on(event, handler, priority?)  // Subscribe
engine.events.off(event, handler)            // Unsubscribe
engine.events.emit(event, payload, source?)  // Publish (async)
```

**Features**:
- **Pattern matching**: `"combat:*"` matches `"combat:start"`, `"combat:victory"`, etc.
- **Priority ordering**: Higher priority handlers execute first
- **Async execution**: Handlers run sequentially, exceptions are logged but don't break the chain
- **Fire-and-forget**: Routers emit with `void ctx.engine.events.emit(...)` to avoid blocking

**Event structure**:
```typescript
interface GameEvent {
  type: string;       // e.g., "combat:victory"
  payload: unknown;   // Event-specific data
  timestamp: number;  // Unix ms
  source: string;     // Emitter name
}
```

## Module Lifecycle

```typescript
interface GameModule {
  name: string;
  dependencies?: string[];
  init(engine: GameEngine): Promise<void>;       // Setup subscriptions
  handleEvent?(event: GameEvent): Promise<void>; // Optional handler
  destroy?(): Promise<void>;                     // Cleanup
}
```

**Initialization**: ModuleRegistry uses topological sort (Kahn's algorithm) to respect dependency order. Detects circular dependencies.

```
engine.start()
  -> modules.initAll()
    -> topologicalSort(modules)
    -> for each: await module.init(engine)
       -> engine.events.on("event:name", handler)
```

## Module Registry

| Module | Depends On | Subscribes To | Emits |
|--------|-----------|---------------|-------|
| **core** | - | `player:expGain`, `achievement:claimed` | `player:statusChanged` |
| **combat** | core | `combat:start`, `combat:action` | `combat:started`, `combat:victory`, `combat:defeat` |
| **economy** | core | `settlement:daily`, `building:upgrade` | `economy:output`, `building:upgraded` |
| **exploration** | core | `exploration:complete` | - |
| **progression** | core | `boss:challenge`, `card:used`, `character:levelUp`, `breakthrough:complete` | `progression:check` |
| **content** | core | `character:levelUp`, `breakthrough:complete` | `content:checkUnlocks` |
| **territory** | core | `territory:unlock`, `territory:build`, `territory:expand` | `territory:expanded` |
| **settlement** | core | `settlement:daily` | `settlement:graded` |

## Event Chain Examples

### Boss Victory Chain
```
Router emits "boss:challenge" { victory: true }
  -> ProgressionModule: emits "combat:victory" + "progression:check"
    -> CoreModule: checks achievements
```

### Building Placement Chain
```
Router emits "territory:build" { positionX, positionY }
  -> TerritoryModule: emits "territory:expanded" { trigger: "build" }
```

### Character Level Up Chain
```
Router emits "character:levelUp" { characterId, newLevel }
  -> ProgressionModule: emits "progression:check" { trigger: "character_level_up" }
  -> ContentModule: emits "content:checkUnlocks"
```

## Router Event Emission

Routers emit events after mutations using fire-and-forget:

```typescript
// In a router mutation
const result = await someService.doAction(ctx.db, ...);
void ctx.engine.events.emit("domain:action", {
  userId: ctx.session.user.id,
  ...payload,
}, "router-name");
return result;
```

Events emitted from routers:
- `boss:challenge`, `card:used`, `character:levelUp`, `character:expGain`
- `breakthrough:complete`, `achievement:claimed`
- `territory:unlock`, `territory:build`, `territory:expand`
- `combat:start` (world combat)

## StateManager

**File**: `src/engine/core/StateManager.ts`

In-memory key-value store with TTL support. Used for rule caching and temporary combat state.

```typescript
engine.state.get<T>(key)              // Get value
engine.state.set<T>(key, value, ttl?) // Set with optional TTL (ms)
engine.state.delete(key)              // Remove
engine.state.clear()                  // Clear all
```
