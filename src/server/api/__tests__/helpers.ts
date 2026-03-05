import { vi } from "vitest";

// Mock data storage
const mockDataStore: Record<string, unknown[]> = {};

// Reset store between tests
export function resetMockDataStore() {
  Object.keys(mockDataStore).forEach((key) => {
    mockDataStore[key] = [];
  });
}

// Helper to get or initialize a collection
function getCollection<T>(name: string): T[] {
  if (!mockDataStore[name]) {
    mockDataStore[name] = [];
  }
  return mockDataStore[name] as T[];
}

// Generate unique ID
function generateId(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Create mock Prisma model operations
function createMockModel<T extends { id: string }>(modelName: string) {
  return {
    findMany: vi.fn(async (args?: { where?: Partial<T>; include?: unknown; orderBy?: unknown }) => {
      let items = getCollection<T>(modelName);
      if (args?.where) {
        items = items.filter((item) => {
          return Object.entries(args.where!).every(([key, value]) => {
            if (value === undefined) return true;
            if (typeof value === "object" && value !== null) {
              // Handle Prisma operators like { lte: 5 }
              const ops = value as Record<string, unknown>;
              if ("lte" in ops) return (item as Record<string, unknown>)[key] <= ops.lte;
              if ("gte" in ops) return (item as Record<string, unknown>)[key] >= ops.gte;
              if ("contains" in ops) return String((item as Record<string, unknown>)[key]).includes(String(ops.contains));
            }
            return (item as Record<string, unknown>)[key] === value;
          });
        });
      }
      return items;
    }),

    findUnique: vi.fn(async (args: { where: { id?: string } & Record<string, unknown> }) => {
      const items = getCollection<T>(modelName);
      if (args.where.id) {
        return items.find((item) => item.id === args.where.id) ?? null;
      }
      // Handle other unique constraints
      return items.find((item) => {
        return Object.entries(args.where).every(
          ([key, value]) => (item as Record<string, unknown>)[key] === value
        );
      }) ?? null;
    }),

    findFirst: vi.fn(async (args?: { where?: Partial<T> }) => {
      const items = getCollection<T>(modelName);
      if (!args?.where) return items[0] ?? null;
      return items.find((item) => {
        return Object.entries(args.where!).every(
          ([key, value]) => (item as Record<string, unknown>)[key] === value
        );
      }) ?? null;
    }),

    create: vi.fn(async (args: { data: Omit<T, "id"> & { id?: string } }) => {
      const items = getCollection<T>(modelName);
      const newItem = {
        id: args.data.id ?? generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        ...args.data,
      } as T;
      items.push(newItem);
      return newItem;
    }),

    update: vi.fn(async (args: { where: Record<string, unknown>; data: Partial<T> }) => {
      const items = getCollection<T>(modelName);
      let index: number;
      if (args.where.id) {
        index = items.findIndex((item) => item.id === args.where.id);
      } else {
        // Support compound unique keys (e.g. playerId_worldId_positionX_positionY)
        const compoundKey = Object.values(args.where)[0] as Record<string, unknown> | undefined;
        if (compoundKey && typeof compoundKey === "object") {
          index = items.findIndex((item) =>
            Object.entries(compoundKey).every(
              ([key, value]) => (item as Record<string, unknown>)[key] === value
            )
          );
        } else {
          index = -1;
        }
      }
      if (index === -1) throw new Error(`${modelName} not found`);
      items[index] = { ...items[index], ...args.data, updatedAt: new Date() } as T;
      return items[index];
    }),

    delete: vi.fn(async (args: { where: { id: string } }) => {
      const items = getCollection<T>(modelName);
      const index = items.findIndex((item) => item.id === args.where.id);
      if (index === -1) throw new Error(`${modelName} not found`);
      const deleted = items[index];
      items.splice(index, 1);
      return deleted;
    }),

    count: vi.fn(async (args?: { where?: Partial<T> }) => {
      const items = getCollection<T>(modelName);
      if (!args?.where) return items.length;
      return items.filter((item) => {
        return Object.entries(args.where!).every(
          ([key, value]) => (item as Record<string, unknown>)[key] === value
        );
      }).length;
    }),
  };
}

// Types for mock models
interface MockCard {
  id: string;
  name: string;
  type: string;
  rarity: string;
  description: string;
  icon: string;
  effects: string;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MockStoryChapter {
  id: string;
  title: string;
  description: string;
  order: number;
  isActive: boolean;
  rewardsJson: string;
  unlockJson: string;
  nodes?: MockStoryNode[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface MockStoryNode {
  id: string;
  chapterId: string;
  nodeId: string;
  title: string;
  content: string;
  speaker: string | null;
  speakerIcon: string | null;
  order: number;
  nextNodeId: string | null;
  choicesJson: string | null;
  rewardsJson: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MockAdventure {
  id: string;
  name: string;
  type: string;
  minLevel: number;
  maxLevel: number | null;
  worldId: string | null;
  weight: number;
  isActive: boolean;
  title: string;
  description: string;
  icon: string;
  optionsJson: string;
  rewardsJson: string | null;
  monsterJson: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface MockPlayer {
  id: string;
  userId: string;
  name: string;
  title: string;
  level: number;
  exp: number;
  tier: number;
  stamina: number;
  maxStamina: number;
  staminaPerMin: number;
  lastStaminaUpdate: Date;
  gold: number;
  wood: number;
  stone: number;
  food: number;
  crystals: number;
  strength: number;
  agility: number;
  intellect: number;
  charisma: number;
  currentWorld: string;
  lastSettlementDay: number;
  currentDayScore: number;
  streakDays: number;
  combatWins: number;
  bossKills: number;
  totalGoldEarned: number;
  storyProgress?: MockStoryProgress[];
  createdAt?: Date;
  updatedAt?: Date;
}

interface MockStoryProgress {
  id: string;
  playerId: string;
  storyId: string;
  completed: boolean;
  choices: string | null;
  completedAt: Date | null;
}

interface MockExploredArea {
  id: string;
  playerId: string;
  worldId: string;
  positionX: number;
  positionY: number;
  name: string;
  discoveredAt: Date;
}

interface MockUser {
  id: string;
  name: string | null;
  email: string | null;
}

// Create the mock database
export function createMockDb() {
  return {
    card: createMockModel<MockCard>("card"),
    storyChapter: {
      ...createMockModel<MockStoryChapter>("storyChapter"),
      findMany: vi.fn(async (args?: {
        where?: Partial<MockStoryChapter>;
        include?: { nodes?: boolean | { orderBy?: unknown } };
        orderBy?: unknown
      }) => {
        let items = getCollection<MockStoryChapter>("storyChapter");
        if (args?.where) {
          items = items.filter((item) => {
            return Object.entries(args.where!).every(
              ([key, value]) => (item as Record<string, unknown>)[key] === value
            );
          });
        }
        if (args?.include?.nodes) {
          const nodes = getCollection<MockStoryNode>("storyNode");
          items = items.map((chapter) => ({
            ...chapter,
            nodes: nodes.filter((n) => n.chapterId === chapter.id),
          }));
        }
        return items;
      }),
      findUnique: vi.fn(async (args: {
        where: { id: string };
        include?: { nodes?: boolean | { orderBy?: unknown } }
      }) => {
        const items = getCollection<MockStoryChapter>("storyChapter");
        const chapter = items.find((item) => item.id === args.where.id) ?? null;
        if (chapter && args.include?.nodes) {
          const nodes = getCollection<MockStoryNode>("storyNode");
          return {
            ...chapter,
            nodes: nodes.filter((n) => n.chapterId === chapter.id),
          };
        }
        return chapter;
      }),
    },
    storyNode: createMockModel<MockStoryNode>("storyNode"),
    adventure: createMockModel<MockAdventure>("adventure"),
    player: {
      ...createMockModel<MockPlayer>("player"),
      findUnique: vi.fn(async (args: {
        where: { id?: string; userId?: string };
        include?: { storyProgress?: boolean }
      }) => {
        const items = getCollection<MockPlayer>("player");
        let player: MockPlayer | null = null;

        if (args.where.id) {
          player = items.find((item) => item.id === args.where.id) ?? null;
        } else if (args.where.userId) {
          player = items.find((item) => item.userId === args.where.userId) ?? null;
        }

        if (player && args.include?.storyProgress) {
          const progress = getCollection<MockStoryProgress>("storyProgress");
          return {
            ...player,
            storyProgress: progress.filter((p) => p.playerId === player!.id),
          };
        }
        return player;
      }),
    },
    storyProgress: createMockModel<MockStoryProgress>("storyProgress"),
    exploredArea: {
      ...createMockModel<MockExploredArea>("exploredArea"),
      findUnique: vi.fn(async (args: {
        where: {
          id?: string;
          playerId_worldId_positionX_positionY?: {
            playerId: string;
            worldId: string;
            positionX: number;
            positionY: number;
          }
        }
      }) => {
        const items = getCollection<MockExploredArea>("exploredArea");
        if (args.where.id) {
          return items.find((item) => item.id === args.where.id) ?? null;
        }
        if (args.where.playerId_worldId_positionX_positionY) {
          const { playerId, worldId, positionX, positionY } = args.where.playerId_worldId_positionX_positionY;
          return items.find((item) =>
            item.playerId === playerId &&
            item.worldId === worldId &&
            item.positionX === positionX &&
            item.positionY === positionY
          ) ?? null;
        }
        return null;
      }),
    },
    user: createMockModel<MockUser>("user"),
    actionLog: createMockModel<{ id: string }>('actionLog'),
    wildernessFacility: createMockModel<{ id: string }>('wildernessFacility'),
    // $transaction mock: runs callback with the mock db itself as the "tx" client
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      return fn(createMockDb());
    }),
  };
}

export type MockDb = ReturnType<typeof createMockDb>;

// Create test context for admin router (requires admin session)
export function createTestContextForAdmin(db: MockDb) {
  return {
    db,
    session: {
      user: {
        id: "admin-user-id",
        email: "test@test.com",
        name: "Admin User",
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    },
  };
}

// Create test context for protected routes
export function createTestContextForPlayer(db: MockDb, userId: string) {
  return {
    db,
    session: {
      user: { id: userId, name: "Test User", email: "test@test.com" },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

// Seed test data helpers
export function seedTestCard(db: MockDb, data: Partial<MockCard> = {}) {
  const card: MockCard = {
    id: generateId(),
    name: data.name ?? "Test Card",
    type: data.type ?? "building",
    rarity: data.rarity ?? "普通",
    description: data.description ?? "A test card",
    icon: data.icon ?? "🃏",
    effects: data.effects ?? "{}",
    ...data,
  };
  getCollection<MockCard>("card").push(card);
  return card;
}

export function seedTestChapter(db: MockDb, data: Partial<MockStoryChapter> = {}) {
  const chapter: MockStoryChapter = {
    id: generateId(),
    title: data.title ?? "Test Chapter",
    description: data.description ?? "A test chapter",
    order: data.order ?? 0,
    isActive: data.isActive ?? true,
    rewardsJson: data.rewardsJson ?? "{}",
    unlockJson: data.unlockJson ?? "{}",
    ...data,
  };
  getCollection<MockStoryChapter>("storyChapter").push(chapter);
  return chapter;
}

export function seedTestNode(db: MockDb, chapterId: string, data: Partial<MockStoryNode> = {}) {
  const node: MockStoryNode = {
    id: generateId(),
    chapterId,
    nodeId: data.nodeId ?? `node_${generateId()}`,
    title: data.title ?? "Test Node",
    content: data.content ?? "Test content",
    speaker: data.speaker ?? null,
    speakerIcon: data.speakerIcon ?? null,
    order: data.order ?? 0,
    nextNodeId: data.nextNodeId ?? null,
    choicesJson: data.choicesJson ?? null,
    rewardsJson: data.rewardsJson ?? null,
    ...data,
  };
  getCollection<MockStoryNode>("storyNode").push(node);
  return node;
}

export function seedTestAdventure(db: MockDb, data: Partial<MockAdventure> = {}) {
  const adventure: MockAdventure = {
    id: generateId(),
    name: data.name ?? `adventure_${generateId()}`,
    type: data.type ?? "resource",
    minLevel: data.minLevel ?? 1,
    maxLevel: data.maxLevel ?? null,
    worldId: data.worldId ?? null,
    weight: data.weight ?? 100,
    isActive: data.isActive ?? true,
    title: data.title ?? "Test Adventure",
    description: data.description ?? "A test adventure",
    icon: data.icon ?? "❓",
    optionsJson: data.optionsJson ?? "[]",
    rewardsJson: data.rewardsJson ?? null,
    monsterJson: data.monsterJson ?? null,
    ...data,
  };
  getCollection<MockAdventure>("adventure").push(adventure);
  return adventure;
}

export function seedTestPlayer(db: MockDb, userId: string, data: Partial<MockPlayer> = {}) {
  const player: MockPlayer = {
    id: generateId(),
    userId,
    name: data.name ?? "Test Player",
    title: data.title ?? "领主",
    level: data.level ?? 1,
    exp: data.exp ?? 0,
    tier: data.tier ?? 1,
    stamina: data.stamina ?? 100,
    maxStamina: data.maxStamina ?? 100,
    staminaPerMin: data.staminaPerMin ?? 0.2,
    lastStaminaUpdate: data.lastStaminaUpdate ?? new Date(),
    gold: data.gold ?? 100,
    wood: data.wood ?? 50,
    stone: data.stone ?? 30,
    food: data.food ?? 100,
    crystals: data.crystals ?? 0,
    strength: data.strength ?? 10,
    agility: data.agility ?? 10,
    intellect: data.intellect ?? 10,
    charisma: data.charisma ?? 10,
    currentWorld: data.currentWorld ?? "main",
    lastSettlementDay: data.lastSettlementDay ?? 0,
    currentDayScore: data.currentDayScore ?? 0,
    streakDays: data.streakDays ?? 0,
    combatWins: data.combatWins ?? 0,
    bossKills: data.bossKills ?? 0,
    totalGoldEarned: data.totalGoldEarned ?? 0,
    ...data,
  };
  getCollection<MockPlayer>("player").push(player);
  return player;
}

export function seedTestExploredArea(db: MockDb, playerId: string, data: Partial<MockExploredArea> = {}) {
  const area: MockExploredArea = {
    id: generateId(),
    playerId,
    worldId: data.worldId ?? "main",
    positionX: data.positionX ?? 0,
    positionY: data.positionY ?? 0,
    name: data.name ?? "Test Area",
    discoveredAt: data.discoveredAt ?? new Date(),
    ...data,
  };
  getCollection<MockExploredArea>("exploredArea").push(area);
  return area;
}

export function seedTestStoryProgress(db: MockDb, playerId: string, storyId: string, data: Partial<MockStoryProgress> = {}) {
  const progress: MockStoryProgress = {
    id: generateId(),
    playerId,
    storyId,
    completed: data.completed ?? false,
    choices: data.choices ?? null,
    completedAt: data.completedAt ?? null,
    ...data,
  };
  getCollection<MockStoryProgress>("storyProgress").push(progress);
  return progress;
}
