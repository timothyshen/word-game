// 角色Hub - 整合角色管理相关功能

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import HubPanel, { type HubTab } from "./HubPanel";

interface CharacterHubProps {
  onClose: () => void;
  initialTab?: string;
  initialCharacterId?: string;
}

export default function CharacterHub({
  onClose,
  initialTab = "list",
  initialCharacterId,
}: CharacterHubProps) {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(
    initialCharacterId ?? null
  );

  const tabs: HubTab[] = [
    {
      id: "list",
      label: "我的角色",
      icon: "👥",
      content: (
        <CharacterListTab
          onSelectCharacter={setSelectedCharacterId}
          selectedId={selectedCharacterId}
        />
      ),
    },
    {
      id: "detail",
      label: "角色详情",
      icon: "📊",
      content: <CharacterDetailTab characterId={selectedCharacterId} />,
    },
    {
      id: "equipment",
      label: "装备管理",
      icon: "🛡️",
      content: <EquipmentTab characterId={selectedCharacterId} />,
    },
    {
      id: "breakthrough",
      label: "职阶突破",
      icon: "⬆️",
      content: <BreakthroughTab characterId={selectedCharacterId} />,
    },
  ];

  return (
    <HubPanel
      title="角色管理"
      icon="👥"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}

// 角色列表标签页
function CharacterListTab({
  onSelectCharacter,
  selectedId,
}: {
  onSelectCharacter: (id: string) => void;
  selectedId: string | null;
}) {
  const { data: player } = api.player.getStatus.useQuery();

  const characters = player?.characters ?? [];

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {characters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👤</div>
            <div className="text-[#888]">暂无角色</div>
            <div className="text-xs text-[#666] mt-1">使用招募卡获得角色</div>
          </div>
        ) : (
          <div className="space-y-2">
            {characters.map((char) => (
              <button
                key={char.id}
                onClick={() => onSelectCharacter(char.id)}
                className={`w-full flex items-center gap-3 p-3 transition-colors ${
                  selectedId === char.id
                    ? "bg-[#c9a227]/20 border border-[#c9a227]"
                    : "bg-[#1a1a20] hover:bg-[#222228] border border-transparent"
                }`}
              >
                <div className="w-12 h-12 bg-[#0a0a0c] border border-[#3a3a40] flex items-center justify-center text-2xl">
                  {char.character.portrait}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{char.character.name}</span>
                    <span className="text-xs px-1.5 py-0.5 bg-[#2a2a30] text-[#c9a227]">
                      {char.tier}阶
                    </span>
                  </div>
                  <div className="text-sm text-[#888]">
                    {char.character.baseClass} · Lv.{char.level}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-[#4a9]">
                    HP {char.hp}/{char.maxHp}
                  </div>
                  <div className="text-xs text-[#59b]">
                    MP {char.mp}/{char.maxMp}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 角色详情标签页
function CharacterDetailTab({ characterId }: { characterId: string | null }) {
  const { data: character, isLoading } = api.character.getById.useQuery(
    { characterId: characterId! },
    { enabled: !!characterId }
  );

  const utils = api.useUtils();

  const levelUpMutation = api.character.levelUp.useMutation({
    onSuccess: () => {
      void utils.character.getById.invalidate({ characterId: characterId! });
      void utils.player.getStatus.invalidate();
    },
  });

  const healMutation = api.character.heal.useMutation({
    onSuccess: () => {
      void utils.character.getById.invalidate({ characterId: characterId! });
    },
  });

  if (!characterId) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        <div className="text-center">
          <div className="text-4xl mb-4">👈</div>
          <div>请先从"我的角色"选择一个角色</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  if (!character) {
    return (
      <div className="h-full flex items-center justify-center text-[#e74c3c]">
        角色不存在
      </div>
    );
  }

  const canLevelUp = character.exp >= character.expToNext && character.level < character.maxLevel;
  const needsHeal = character.hp < character.maxHp || character.mp < character.maxMp;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* 基本信息 */}
        <div className="flex items-start gap-4 p-4 bg-[#1a1a20]">
          <div className="w-16 h-16 bg-[#0a0a0c] border-2 border-[#3a3a40] flex items-center justify-center text-4xl">
            {character.icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{character.name}</span>
              <span
                className="text-xs px-2 py-0.5"
                style={{
                  backgroundColor:
                    character.rarity === "传说"
                      ? "#c9a227"
                      : character.rarity === "稀有"
                      ? "#9b59b6"
                      : "#4a9",
                  color: "#000",
                }}
              >
                {character.rarity}
              </span>
            </div>
            <div className="text-sm text-[#888]">
              {character.baseClass} · Lv.{character.level}/{character.maxLevel}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs px-1.5 py-0.5 bg-[#2a2a30] text-[#c9a227]">
                {character.tier}阶
              </span>
            </div>
          </div>
        </div>

        {/* 状态栏 */}
        <div className="grid grid-cols-3 gap-4">
          <StatBar label="HP" current={character.hp} max={character.maxHp} color="#4a9" />
          <StatBar label="MP" current={character.mp} max={character.maxMp} color="#59b" />
          <StatBar label="EXP" current={character.exp} max={character.expToNext} color="#c9a227" />
        </div>

        {/* 恢复按钮 */}
        {needsHeal && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#888]">恢复:</span>
            {character.hp < character.maxHp && (
              <button
                onClick={() => healMutation.mutate({ characterId: characterId!, type: "hp" })}
                disabled={healMutation.isPending}
                className="text-xs px-2 py-1 bg-[#1a1a20] text-[#4a9] hover:bg-[#4a9] hover:text-[#08080a] disabled:opacity-50"
              >
                HP
              </button>
            )}
            {character.mp < character.maxMp && (
              <button
                onClick={() => healMutation.mutate({ characterId: characterId!, type: "mp" })}
                disabled={healMutation.isPending}
                className="text-xs px-2 py-1 bg-[#1a1a20] text-[#59b] hover:bg-[#59b] hover:text-[#08080a] disabled:opacity-50"
              >
                MP
              </button>
            )}
            <button
              onClick={() => healMutation.mutate({ characterId: characterId!, type: "both" })}
              disabled={healMutation.isPending}
              className="text-xs px-2 py-1 bg-[#1a1a20] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] disabled:opacity-50"
            >
              全部
            </button>
          </div>
        )}

        {/* 升级按钮 */}
        {canLevelUp && (
          <button
            onClick={() => levelUpMutation.mutate({ characterId: characterId! })}
            disabled={levelUpMutation.isPending}
            className="w-full py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50 animate-pulse"
          >
            {levelUpMutation.isPending ? "升级中..." : `升级到 Lv.${character.level + 1}`}
          </button>
        )}

        {/* 属性 */}
        <div>
          <SectionTitle>基础属性</SectionTitle>
          <div className="grid grid-cols-4 gap-3 mt-2">
            <StatBlock icon="⚔️" label="攻击" value={character.attack} />
            <StatBlock icon="🛡️" label="防御" value={character.defense} />
            <StatBlock icon="💨" label="速度" value={character.speed} />
            <StatBlock icon="🍀" label="幸运" value={character.luck} />
          </div>
        </div>

        {/* 技能 */}
        <div>
          <SectionTitle>技能 ({character.skills.length}/{character.skillSlots})</SectionTitle>
          {character.skills.length === 0 ? (
            <div className="mt-2 text-center py-4 text-[#666]">
              <div className="text-2xl mb-2">📖</div>
              <div className="text-sm">暂无技能</div>
            </div>
          ) : (
            <div className="space-y-2 mt-2">
              {character.skills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-2 bg-[#1a1a20]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{skill.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{skill.name}</span>
                        <span className="text-xs text-[#c9a227]">Lv.{skill.level}</span>
                      </div>
                      <div className="text-xs text-[#666] mt-0.5">{skill.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 简介 */}
        {character.description && (
          <div>
            <SectionTitle>简介</SectionTitle>
            <p className="text-sm text-[#888] mt-2 leading-relaxed">{character.description}</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 装备标签页
function EquipmentTab({ characterId }: { characterId: string | null }) {
  const { data: equipment, isLoading } = api.equipment.getCharacterEquipment.useQuery(
    { characterId: characterId! },
    { enabled: !!characterId }
  );

  const { data: inventory } = api.equipment.getAll.useQuery(undefined, {
    enabled: !!characterId,
  });

  const utils = api.useUtils();

  const equipMutation = api.equipment.equip.useMutation({
    onSuccess: () => {
      void utils.equipment.getCharacterEquipment.invalidate({ characterId: characterId! });
      void utils.equipment.getAll.invalidate();
    },
  });

  const unequipMutation = api.equipment.unequip.useMutation({
    onSuccess: () => {
      void utils.equipment.getCharacterEquipment.invalidate({ characterId: characterId! });
      void utils.equipment.getAll.invalidate();
    },
  });

  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const SLOT_ICONS: Record<string, string> = {
    mainHand: "🗡️",
    offHand: "🛡️",
    helmet: "⛑️",
    chest: "🎽",
    belt: "🎗️",
    gloves: "🧤",
    pants: "👖",
    boots: "👢",
    necklace: "📿",
    ring1: "💍",
    ring2: "💎",
  };

  const SLOT_NAMES: Record<string, string> = {
    mainHand: "主手",
    offHand: "副手",
    helmet: "头盔",
    chest: "胸甲",
    belt: "腰带",
    gloves: "手套",
    pants: "腿甲",
    boots: "鞋子",
    necklace: "项链",
    ring1: "戒指1",
    ring2: "戒指2",
  };

  if (!characterId) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        <div className="text-center">
          <div className="text-4xl mb-4">👈</div>
          <div>请先从"我的角色"选择一个角色</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-[#888]">
        加载中...
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        {/* 装备槽位 */}
        <div className="grid grid-cols-3 gap-2">
          {Object.entries(SLOT_ICONS).map(([slot, icon]) => {
            const slotData = equipment?.slots?.[slot];
            const equipped = slotData?.equipment;
            return (
              <button
                key={slot}
                onClick={() => setSelectedSlot(selectedSlot === slot ? null : slot)}
                className={`p-3 border transition-colors ${
                  selectedSlot === slot
                    ? "border-[#c9a227] bg-[#1a1810]"
                    : equipped
                    ? "border-[#4a9] bg-[#1a3a1a]/30"
                    : "border-[#2a2a30] bg-[#1a1a20]"
                }`}
              >
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs text-[#888]">{SLOT_NAMES[slot]}</div>
                {equipped && (
                  <div className="text-xs text-[#4a9] mt-1 truncate">{equipped.name}</div>
                )}
              </button>
            );
          })}
        </div>

        {/* 选中槽位的装备选择 */}
        {selectedSlot && (
          <div className="mt-4 p-3 bg-[#0a0a0c] border border-[#2a2a30]">
            <div className="text-sm text-[#c9a227] mb-2">
              {SLOT_ICONS[selectedSlot]} {SLOT_NAMES[selectedSlot]} - 可用装备
            </div>
            {equipment?.slots?.[selectedSlot]?.equipment && (
              <button
                onClick={() =>
                  unequipMutation.mutate({
                    characterId: characterId!,
                    slot: selectedSlot as "mainHand" | "offHand" | "helmet" | "chest" | "belt" | "gloves" | "pants" | "boots" | "necklace" | "ring1" | "ring2",
                  })
                }
                disabled={unequipMutation.isPending}
                className="w-full mb-2 py-2 text-sm border border-[#e74c3c] text-[#e74c3c] hover:bg-[#e74c3c] hover:text-[#08080a] disabled:opacity-50"
              >
                卸下当前装备
              </button>
            )}
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {inventory
                ?.filter((item) => item.equipment.slot === selectedSlot && !item.isEquipped)
                .map((item) => (
                  <button
                    key={item.id}
                    onClick={() =>
                      equipMutation.mutate({
                        characterId: characterId!,
                        equipmentId: item.id,
                        slot: selectedSlot as "mainHand" | "offHand" | "helmet" | "chest" | "belt" | "gloves" | "pants" | "boots" | "necklace" | "ring1" | "ring2",
                      })
                    }
                    disabled={equipMutation.isPending}
                    className="w-full flex items-center justify-between p-2 bg-[#1a1a20] hover:bg-[#222228] disabled:opacity-50"
                  >
                    <span>{item.equipment.name}</span>
                    <span className="text-xs text-[#888]">{item.equipment.rarity}</span>
                  </button>
                ))}
              {inventory?.filter((item) => item.equipment.slot === selectedSlot && !item.isEquipped).length === 0 && (
                <div className="text-center py-4 text-[#666] text-sm">无可用装备</div>
              )}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 突破标签页
function BreakthroughTab({ characterId }: { characterId: string | null }) {
  const { data: playerStatus } = api.breakthrough.getPlayerStatus.useQuery();
  const { data: characterStatus } = api.breakthrough.getCharacterStatus.useQuery(
    { characterId: characterId! },
    { enabled: !!characterId }
  );

  const utils = api.useUtils();

  const playerBreakthroughMutation = api.breakthrough.breakthroughPlayer.useMutation({
    onSuccess: () => {
      void utils.breakthrough.getPlayerStatus.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  const characterBreakthroughMutation = api.breakthrough.breakthroughCharacter.useMutation({
    onSuccess: () => {
      void utils.breakthrough.getCharacterStatus.invalidate({ characterId: characterId! });
      void utils.character.getById.invalidate({ characterId: characterId! });
    },
  });

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-6">
        {/* 玩家突破 */}
        <div className="p-4 bg-[#1a1a20] border border-[#2a2a30]">
          <SectionTitle>领主突破</SectionTitle>
          {playerStatus ? (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#888]">当前职阶</span>
                <span className="text-[#c9a227] font-bold text-lg">{playerStatus.currentTier}阶</span>
              </div>
              <div className="text-sm text-[#888] mb-3">
                技能槽位: {playerStatus.skillSlots}
                {playerStatus.nextTierSlots && ` → ${playerStatus.nextTierSlots}`}
              </div>
              {playerStatus.maxTier ? (
                <div className="text-center text-[#4a9] py-2">已达最高职阶</div>
              ) : (
                <>
                  {playerStatus.requirements && (
                    <div className="text-xs text-[#666] mb-2">
                      需要: Lv.{playerStatus.requirements.level} |
                      金币 {playerStatus.requirements.gold} |
                      水晶 {playerStatus.requirements.crystals}
                    </div>
                  )}
                  <button
                    onClick={() => playerBreakthroughMutation.mutate()}
                    disabled={!playerStatus.canBreakthrough || playerBreakthroughMutation.isPending}
                    className="w-full py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {playerBreakthroughMutation.isPending ? "突破中..." : "突破"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="text-[#888] mt-2">加载中...</div>
          )}
        </div>

        {/* 角色突破 */}
        <div className="p-4 bg-[#1a1a20] border border-[#2a2a30]">
          <SectionTitle>角色突破</SectionTitle>
          {!characterId ? (
            <div className="text-[#888] mt-2 text-center py-4">
              请先从"我的角色"选择一个角色
            </div>
          ) : characterStatus ? (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#888]">{characterStatus.characterName}</span>
                <span className="text-[#c9a227] font-bold">{characterStatus.currentTier}阶</span>
              </div>
              <div className="text-sm text-[#888] mb-3">
                技能槽位: {characterStatus.skillSlots}
                {characterStatus.nextTierSlots && ` → ${characterStatus.nextTierSlots}`}
              </div>
              {characterStatus.maxTier ? (
                <div className="text-center text-[#4a9] py-2">已达最高职阶</div>
              ) : (
                <>
                  {characterStatus.requirements && (
                    <div className="text-xs text-[#666] mb-2">
                      需要: Lv.{characterStatus.requirements.level} |
                      金币 {characterStatus.requirements.gold} |
                      水晶 {characterStatus.requirements.crystals}
                    </div>
                  )}
                  <button
                    onClick={() => characterBreakthroughMutation.mutate({ characterId: characterId! })}
                    disabled={!characterStatus.canBreakthrough || characterBreakthroughMutation.isPending}
                    className="w-full py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {characterBreakthroughMutation.isPending ? "突破中..." : "突破"}
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="text-[#888] mt-2">加载中...</div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}

// 辅助组件
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[#c9a227] text-sm font-bold flex items-center gap-2">
      <span className="text-[#3a3a40]">▸</span>
      {children}
    </div>
  );
}

function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const percent = (current / max) * 100;
  const barLength = 8;
  const filled = Math.round((percent / 100) * barLength);

  return (
    <div className="bg-[#1a1a20] p-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#888]">{label}</span>
        <span style={{ color }}>{current}/{max}</span>
      </div>
      <div className="font-mono text-xs">
        <span className="text-[#3a3a40]">[</span>
        <span style={{ color }}>{"█".repeat(filled)}</span>
        <span className="text-[#2a2a30]">{"░".repeat(barLength - filled)}</span>
        <span className="text-[#3a3a40]">]</span>
      </div>
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-[#1a1a20] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="text-[#c9a227] font-bold">{value}</div>
    </div>
  );
}
