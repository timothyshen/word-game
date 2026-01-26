-- CreateTable
CREATE TABLE "PlayerAchievement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "claimedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerAchievement_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ShopPurchase" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ShopPurchase_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CombatSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "playerTeam" TEXT NOT NULL,
    "enemyTeam" TEXT NOT NULL,
    "combatType" TEXT NOT NULL DEFAULT 'normal',
    "areaLevel" INTEGER NOT NULL DEFAULT 1,
    "logs" TEXT NOT NULL DEFAULT '[]',
    "rewards" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CombatSession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '领主',
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "currentWorld" TEXT NOT NULL DEFAULT 'main',
    "tier" INTEGER NOT NULL DEFAULT 1,
    "stamina" INTEGER NOT NULL DEFAULT 100,
    "maxStamina" INTEGER NOT NULL DEFAULT 100,
    "staminaPerMin" REAL NOT NULL DEFAULT 0.2,
    "lastStaminaUpdate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gold" INTEGER NOT NULL DEFAULT 100,
    "wood" INTEGER NOT NULL DEFAULT 50,
    "stone" INTEGER NOT NULL DEFAULT 30,
    "food" INTEGER NOT NULL DEFAULT 100,
    "crystals" INTEGER NOT NULL DEFAULT 0,
    "strength" INTEGER NOT NULL DEFAULT 10,
    "agility" INTEGER NOT NULL DEFAULT 10,
    "intellect" INTEGER NOT NULL DEFAULT 10,
    "charisma" INTEGER NOT NULL DEFAULT 10,
    "lastSettlementDay" INTEGER NOT NULL DEFAULT 0,
    "currentDayScore" INTEGER NOT NULL DEFAULT 0,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "combatWins" INTEGER NOT NULL DEFAULT 0,
    "bossKills" INTEGER NOT NULL DEFAULT 0,
    "totalGoldEarned" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("agility", "charisma", "createdAt", "crystals", "currentDayScore", "currentWorld", "exp", "food", "gold", "id", "intellect", "lastSettlementDay", "lastStaminaUpdate", "level", "maxStamina", "name", "stamina", "staminaPerMin", "stone", "streakDays", "strength", "tier", "title", "updatedAt", "userId", "wood") SELECT "agility", "charisma", "createdAt", "crystals", "currentDayScore", "currentWorld", "exp", "food", "gold", "id", "intellect", "lastSettlementDay", "lastStaminaUpdate", "level", "maxStamina", "name", "stamina", "staminaPerMin", "stone", "streakDays", "strength", "tier", "title", "updatedAt", "userId", "wood" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "PlayerAchievement_playerId_achievementId_key" ON "PlayerAchievement"("playerId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "ShopPurchase_playerId_itemId_date_key" ON "ShopPurchase"("playerId", "itemId", "date");

-- CreateIndex
CREATE INDEX "CombatSession_playerId_idx" ON "CombatSession"("playerId");
