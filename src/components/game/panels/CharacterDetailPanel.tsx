// 角色详情面板组件 - 使用 API 数据

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { RARITY_COLORS } from "~/constants";
import { SectionTitle } from "./character/helpers";
import EquipmentPanel from "./EquipmentPanel";
import SkillTreePanel from "./SkillTreePanel";
import { PanelSkeleton } from "~/components/game/PanelSkeleton";

interface CharacterDetailPanelProps {
  characterId: string;
  onClose: () => void;
}

export default function CharacterDetailPanel({
  characterId,
  onClose,
}: CharacterDetailPanelProps) {
  const [healingType, setHealingType] = useState<"hp" | "mp" | "both" | null>(null);
  const [showEquipmentPanel, setShowEquipmentPanel] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);

  const utils = api.useUtils();

  // 获取角色详情
  const { data: character, isLoading } = api.character.getById.useQuery({ characterId });

  // 升级mutation
  const levelUpMutation = api.character.levelUp.useMutation({
    onSuccess: () => {
      void utils.character.getById.invalidate({ characterId });
      void utils.player.getStatus.invalidate();
    },
  });

  // 恢复mutation
  const healMutation = api.character.heal.useMutation({
    onSuccess: () => {
      void utils.character.getById.invalidate({ characterId });
      setHealingType(null);
    },
  });

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-8">
          <PanelSkeleton />
        </DialogContent>
      </Dialog>
    );
  }

  if (!character) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-8">
          <div className="text-center text-[#e74c3c]">角色不存在</div>
        </DialogContent>
      </Dialog>
    );
  }

  const canLevelUp = character.exp >= character.expToNext && character.level < character.maxLevel;
  const needsHeal = character.hp < character.maxHp || character.mp < character.maxMp;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 max-w-lg h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 固定头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#050810] border border-[#2a3a4a] flex items-center justify-center text-4xl">
                {character.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-display font-bold text-lg text-[#e0dcd0]">{character.name}</DialogTitle>
                  <span
                    className="text-xs px-2 py-0.5"
                    style={{ backgroundColor: RARITY_COLORS[character.rarity] ?? "#888", color: "#000" }}
                  >
                    {character.rarity}
                  </span>
                </div>
                <div className="text-sm text-[#888]">{character.baseClass} · Lv.{character.level}/{character.maxLevel}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-1.5 py-0.5 bg-[#050810] border border-[#3d3529] text-[#c9a227]">
                    {character.tier}阶
                  </span>
                  {character.profession && (
                    <span className="text-xs px-1.5 py-0.5 bg-[#050810] border border-[#2a3a4a] text-[#4a9]">
                      {character.profession.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[var(--game-text-subtle)] hover:text-[var(--game-gold)] transition-colors" aria-label="关闭">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full [&_[data-slot=scroll-area-scrollbar]]:hidden">
            <div className="text-[#e0dcd0]">
            {/* 状态栏 */}
            <div className="p-4 border-b border-[#2a3a4a]/50">
              <div className="grid grid-cols-3 gap-4">
                <StatBar label="HP" current={character.hp} max={character.maxHp} color="#4a9" />
                <StatBar label="MP" current={character.mp} max={character.maxMp} color="#59b" />
                <StatBar label="EXP" current={character.exp} max={character.expToNext} color="#c9a227" />
              </div>

              {/* 恢复按钮 */}
              {needsHeal && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-[#888]">恢复:</span>
                  {character.hp < character.maxHp && (
                    <button
                      onClick={() => healMutation.mutate({ characterId, type: "hp" })}
                      disabled={healMutation.isPending}
                      className="text-xs px-2 py-1 bg-[#050810] text-[#4a9] hover:bg-[#4a9] hover:text-[#08080a] disabled:opacity-50"
                    >
                      {healMutation.isPending && healingType === "hp" ? "..." : "HP"}
                    </button>
                  )}
                  {character.mp < character.maxMp && (
                    <button
                      onClick={() => { setHealingType("mp"); healMutation.mutate({ characterId, type: "mp" }); }}
                      disabled={healMutation.isPending}
                      className="text-xs px-2 py-1 bg-[#050810] text-[#59b] hover:bg-[#59b] hover:text-[#08080a] disabled:opacity-50"
                    >
                      {healMutation.isPending && healingType === "mp" ? "..." : "MP"}
                    </button>
                  )}
                  <button
                    onClick={() => { setHealingType("both"); healMutation.mutate({ characterId, type: "both" }); }}
                    disabled={healMutation.isPending}
                    className="text-xs px-2 py-1 bg-[#050810] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a] disabled:opacity-50"
                  >
                    {healMutation.isPending && healingType === "both" ? "..." : "全部"}
                  </button>
                </div>
              )}

              {/* 升级按钮 */}
              {canLevelUp && (
                <div className="mt-3">
                  <button
                    onClick={() => levelUpMutation.mutate({ characterId })}
                    disabled={levelUpMutation.isPending}
                    className="w-full py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50 animate-attention"
                  >
                    {levelUpMutation.isPending ? "升级中..." : `升级到 Lv.${character.level + 1}`}
                  </button>
                </div>
              )}

              {/* 当前状态 */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-[#888]">当前状态:</span>
                {character.status === "working" ? (
                  <span className="text-[#4a9]">🔧 在 {character.workingAt} 工作中</span>
                ) : character.status === "exploring" ? (
                  <span className="text-[#c9a227]">🗺️ 探索中</span>
                ) : character.status === "combat" ? (
                  <span className="text-[#e74c3c]">⚔️ 战斗中</span>
                ) : character.status === "resting" ? (
                  <span className="text-[#59b]">🛏️ 休息中</span>
                ) : (
                  <span className="text-[#888]">💤 空闲</span>
                )}
              </div>
            </div>

            {/* 属性 */}
            <div className="p-4 border-b border-[#2a3a4a]/50">
              <SectionTitle>基础属性</SectionTitle>
              <div className="grid grid-cols-4 gap-3 mt-2">
                <StatBlock icon="⚔️" label="攻击" value={character.attack} />
                <StatBlock icon="🛡️" label="防御" value={character.defense} />
                <StatBlock icon="💨" label="速度" value={character.speed} />
                <StatBlock icon="🍀" label="幸运" value={character.luck} />
              </div>
              {character.baseStats && (
                <div className="mt-2 text-xs text-[#666]">
                  基础: 攻{character.baseStats.attack} 防{character.baseStats.defense} 速{character.baseStats.speed} 运{character.baseStats.luck}
                </div>
              )}
            </div>

            {/* 技能 */}
            <div className="p-4 border-b border-[#2a3a4a]/50">
              <SectionTitle>技能 ({character.skills.length}/{character.skillSlots})</SectionTitle>
              {character.skills.length === 0 ? (
                <div className="mt-2 text-center py-4 text-[#666]">
                  <div className="text-sm">暂无技能</div>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  {character.skills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between p-2 bg-[#050810]">
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
                      <span className="text-xs text-[#888]">{skill.type}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 职业加成 */}
            {character.profession && character.profession.bonuses && (
              <div className="p-4 border-b border-[#2a3a4a]/50">
                <SectionTitle>职业加成 - {character.profession.name}</SectionTitle>
                <div className="mt-2 text-sm text-[#888]">
                  {character.profession.description}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(character.profession.bonuses).map(([stat, bonus]) => (
                    <span key={stat} className="text-xs px-2 py-1 bg-[#050810] text-[#4a9]">
                      {stat} +{bonus}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 背景故事 */}
            {character.description && (
              <div className="p-4 border-b border-[#2a3a4a]/50">
                <SectionTitle>简介</SectionTitle>
                <p className="text-sm text-[#888] mt-2 leading-relaxed">{character.description}</p>
              </div>
            )}

            {/* 操作反馈 */}
            {levelUpMutation.isSuccess && (
              <div className="p-3 bg-[#1a3a1a] text-sm text-[#4a9]">
                升级成功！
              </div>
            )}
            {healMutation.isSuccess && (
              <div className="p-3 bg-[#1a3a1a] text-sm text-[#4a9]">
                恢复成功！
              </div>
            )}
            {(levelUpMutation.error ?? healMutation.error) && (
              <div className="p-3 bg-[#3a1a1a] text-sm text-[#e74c3c]">
                {levelUpMutation.error?.message ?? healMutation.error?.message}
              </div>
            )}

          </div>
          </ScrollArea>
        </div>

        {/* 固定底部按钮 */}
        <div className="flex-shrink-0 bg-[#050810] border-t border-[#2a3a4a]/50 p-4 flex gap-2">
          <button
            onClick={() => setShowEquipmentPanel(true)}
            className="flex-1 py-2 border border-[#9b59b6] text-[#9b59b6] hover:bg-[#9b59b6] hover:text-[#08080a]"
          >
            🛡️ 装备
          </button>
          <button
            onClick={() => setShowSkillTree(true)}
            className="flex-1 py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]"
          >
            🌳 技能树
          </button>
          {character.status === "working" ? (
            <button
              className="flex-1 py-2 border border-[#666] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227]"
            >
              取消工作
            </button>
          ) : (
            <button
              className="flex-1 py-2 border border-[#4a9] text-[#4a9] hover:bg-[#4a9] hover:text-[#08080a]"
            >
              分配工作
            </button>
          )}
          <button className="flex-1 py-2 border border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]">
            带去探索
          </button>
        </div>
      </DialogContent>

      {/* 装备面板 */}
      {showEquipmentPanel && (
        <EquipmentPanel
          characterId={characterId}
          characterName={character.name}
          onClose={() => setShowEquipmentPanel(false)}
        />
      )}

      {/* 技能树面板 */}
      {showSkillTree && (
        <SkillTreePanel
          characterId={characterId}
          characterName={character.name}
          onClose={() => setShowSkillTree(false)}
        />
      )}
    </Dialog>
  );
}

function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const percent = (current / max) * 100;
  const barLength = 8;
  const filled = Math.round((percent / 100) * barLength);

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#888]">{label}</span>
        <span style={{ color }}>{current}/{max}</span>
      </div>
      <div className="font-mono text-xs">
        <span className="text-[#2a3a4a]">[</span>
        <span style={{ color }}>{"█".repeat(filled)}</span>
        <span className="text-[#2a3a4a]/60">{"░".repeat(barLength - filled)}</span>
        <span className="text-[#2a3a4a]">]</span>
      </div>
    </div>
  );
}

function StatBlock({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-[#050810] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="text-[#c9a227] font-bold">{value}</div>
    </div>
  );
}
