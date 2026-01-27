// 角色详情标签页

import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { SectionTitle, StatBar, StatBlock } from "./helpers";

interface CharacterDetailTabProps {
  characterId: string | null;
}

export default function CharacterDetailTab({ characterId }: CharacterDetailTabProps) {
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
