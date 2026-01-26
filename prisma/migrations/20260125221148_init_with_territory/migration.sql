-- CreateTable
CREATE TABLE "Post" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "Post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,
    CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
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
    CONSTRAINT "Player_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Profession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "bonuses" TEXT NOT NULL,
    "unlockConditions" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerProfession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerProfession_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerProfession_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "baseClass" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "portrait" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "story" TEXT,
    "baseAttack" INTEGER NOT NULL,
    "baseDefense" INTEGER NOT NULL,
    "baseSpeed" INTEGER NOT NULL,
    "baseLuck" INTEGER NOT NULL,
    "baseHp" INTEGER NOT NULL,
    "baseMp" INTEGER NOT NULL,
    "traits" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerCharacter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "level" INTEGER NOT NULL DEFAULT 1,
    "maxLevel" INTEGER NOT NULL DEFAULT 20,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "hp" INTEGER NOT NULL,
    "maxHp" INTEGER NOT NULL,
    "mp" INTEGER NOT NULL,
    "maxMp" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "workingAt" TEXT,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,
    "luck" INTEGER NOT NULL,
    "affection" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerCharacter_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterProfession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerCharacterId" TEXT NOT NULL,
    "professionId" TEXT NOT NULL,
    "obtainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterProfession_playerCharacterId_fkey" FOREIGN KEY ("playerCharacterId") REFERENCES "PlayerCharacter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterProfession_professionId_fkey" FOREIGN KEY ("professionId") REFERENCES "Profession" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "attackBonus" INTEGER NOT NULL DEFAULT 0,
    "defenseBonus" INTEGER NOT NULL DEFAULT 0,
    "speedBonus" INTEGER NOT NULL DEFAULT 0,
    "luckBonus" INTEGER NOT NULL DEFAULT 0,
    "hpBonus" INTEGER NOT NULL DEFAULT 0,
    "mpBonus" INTEGER NOT NULL DEFAULT 0,
    "specialEffects" TEXT,
    "requiredLevel" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "PlayerEquipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "enhanceLevel" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerEquipment_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquippedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerEquipmentId" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "playerId" TEXT,
    "playerCharacterId" TEXT,
    CONSTRAINT "EquippedItem_playerEquipmentId_fkey" FOREIGN KEY ("playerEquipmentId") REFERENCES "PlayerEquipment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquippedItem_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EquippedItem_playerCharacterId_fkey" FOREIGN KEY ("playerCharacterId") REFERENCES "PlayerCharacter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rarity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '🃏',
    "effects" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerCard" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "PlayerCard_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Building" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slot" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxLevel" INTEGER NOT NULL,
    "baseEffects" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerBuilding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "assignedCharId" TEXT,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlayerBuilding_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerBuilding_buildingId_fkey" FOREIGN KEY ("buildingId") REFERENCES "Building" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoryProgress" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "choices" TEXT,
    "completedAt" DATETIME,
    CONSTRAINT "StoryProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnlockFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "flagName" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT 'true',
    "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UnlockFlag_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EconomyLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "goldIncome" INTEGER NOT NULL DEFAULT 0,
    "woodIncome" INTEGER NOT NULL DEFAULT 0,
    "stoneIncome" INTEGER NOT NULL DEFAULT 0,
    "foodIncome" INTEGER NOT NULL DEFAULT 0,
    "crystalsIncome" INTEGER NOT NULL DEFAULT 0,
    "goldExpense" INTEGER NOT NULL DEFAULT 0,
    "woodExpense" INTEGER NOT NULL DEFAULT 0,
    "stoneExpense" INTEGER NOT NULL DEFAULT 0,
    "foodExpense" INTEGER NOT NULL DEFAULT 0,
    "crystalsExpense" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "EconomyLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MilitaryStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "totalPower" INTEGER NOT NULL DEFAULT 0,
    "defensePower" INTEGER NOT NULL DEFAULT 0,
    "morale" INTEGER NOT NULL DEFAULT 100,
    "soldiers" INTEGER NOT NULL DEFAULT 0,
    "maxSoldiers" INTEGER NOT NULL DEFAULT 10,
    "reserveSoldiers" INTEGER NOT NULL DEFAULT 0,
    "threatLevel" TEXT NOT NULL DEFAULT 'low',
    "nearbyThreats" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MilitaryStatus_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "effects" TEXT NOT NULL,
    "cooldown" INTEGER NOT NULL DEFAULT 0,
    "levelData" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "PlayerSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlayerSkill_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlayerSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CharacterSkill" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerCharacterId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "exp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CharacterSkill_playerCharacterId_fkey" FOREIGN KEY ("playerCharacterId") REFERENCES "PlayerCharacter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CharacterSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "baseScore" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL DEFAULT 0,
    "bonusReason" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActionLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SettlementLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "totalScore" INTEGER NOT NULL,
    "grade" TEXT NOT NULL,
    "rewards" TEXT NOT NULL,
    "breakdown" TEXT NOT NULL,
    "settledAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SettlementLog_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WildernessFacility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL DEFAULT 'main',
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "data" TEXT NOT NULL,
    "remainingUses" INTEGER,
    "expiresAt" DATETIME,
    "isDiscovered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WildernessFacility_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExploredArea" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "worldId" TEXT NOT NULL DEFAULT 'main',
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "discoveredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExploredArea_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BossStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "bossId" TEXT NOT NULL,
    "weeklyAttempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" DATETIME,
    "lastDefeat" DATETIME,
    "weekStartDate" DATETIME NOT NULL,
    CONSTRAINT "BossStatus_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TerritoryTile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "positionX" INTEGER NOT NULL,
    "positionY" INTEGER NOT NULL,
    "terrain" TEXT NOT NULL DEFAULT 'grass',
    "unlocked" BOOLEAN NOT NULL DEFAULT false,
    "unlockedAt" DATETIME,
    "unlockCost" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TerritoryTile_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Post_name_idx" ON "Post"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Player_userId_key" ON "Player"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profession_name_key" ON "Profession"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfession_playerId_key" ON "PlayerProfession"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterProfession_playerCharacterId_key" ON "CharacterProfession"("playerCharacterId");

-- CreateIndex
CREATE UNIQUE INDEX "EquippedItem_playerEquipmentId_key" ON "EquippedItem"("playerEquipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "EquippedItem_playerId_slot_key" ON "EquippedItem"("playerId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "EquippedItem_playerCharacterId_slot_key" ON "EquippedItem"("playerCharacterId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "Card_name_key" ON "Card"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCard_playerId_cardId_key" ON "PlayerCard"("playerId", "cardId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerBuilding_playerId_positionX_positionY_key" ON "PlayerBuilding"("playerId", "positionX", "positionY");

-- CreateIndex
CREATE UNIQUE INDEX "StoryProgress_playerId_storyId_key" ON "StoryProgress"("playerId", "storyId");

-- CreateIndex
CREATE UNIQUE INDEX "UnlockFlag_playerId_flagName_key" ON "UnlockFlag"("playerId", "flagName");

-- CreateIndex
CREATE UNIQUE INDEX "EconomyLog_playerId_day_key" ON "EconomyLog"("playerId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "MilitaryStatus_playerId_key" ON "MilitaryStatus"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_name_key" ON "Skill"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerSkill_playerId_skillId_key" ON "PlayerSkill"("playerId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSkill_playerCharacterId_skillId_key" ON "CharacterSkill"("playerCharacterId", "skillId");

-- CreateIndex
CREATE INDEX "ActionLog_playerId_day_idx" ON "ActionLog"("playerId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementLog_playerId_day_key" ON "SettlementLog"("playerId", "day");

-- CreateIndex
CREATE INDEX "WildernessFacility_playerId_worldId_idx" ON "WildernessFacility"("playerId", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "WildernessFacility_playerId_worldId_positionX_positionY_key" ON "WildernessFacility"("playerId", "worldId", "positionX", "positionY");

-- CreateIndex
CREATE INDEX "ExploredArea_playerId_worldId_idx" ON "ExploredArea"("playerId", "worldId");

-- CreateIndex
CREATE UNIQUE INDEX "ExploredArea_playerId_worldId_positionX_positionY_key" ON "ExploredArea"("playerId", "worldId", "positionX", "positionY");

-- CreateIndex
CREATE INDEX "BossStatus_playerId_idx" ON "BossStatus"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "BossStatus_playerId_bossId_key" ON "BossStatus"("playerId", "bossId");

-- CreateIndex
CREATE INDEX "TerritoryTile_playerId_idx" ON "TerritoryTile"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TerritoryTile_playerId_positionX_positionY_key" ON "TerritoryTile"("playerId", "positionX", "positionY");
