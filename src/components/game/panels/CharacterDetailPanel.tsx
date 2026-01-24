// 角色详情面板组件 - 使用 shadcn/ui

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { charactersData } from "~/data/fixtures";

type Character = typeof charactersData[0];

interface CharacterDetailPanelProps {
  character: Character;
  onClose: () => void;
  onAssign?: () => void;
  onUnassign?: () => void;
}

export default function CharacterDetailPanel({
  character,
  onClose,
  onAssign,
  onUnassign,
}: CharacterDetailPanelProps) {
  const rarityColors: Record<string, string> = {
    "普通": "#888",
    "精英": "#4a9",
    "稀有": "#9b59b6",
    "传说": "#c9a227",
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-lg h-[90vh] flex flex-col gap-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* 固定头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-[#151518] border-b border-[#2a2a30] p-4 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#1a1a20] border-2 border-[#3a3a40] flex items-center justify-center text-4xl">
                {character.portrait}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="font-bold text-lg text-[#e0dcd0]">{character.name}</DialogTitle>
                  <span
                    className="text-xs px-2 py-0.5"
                    style={{ backgroundColor: rarityColors[character.rarity], color: "#000" }}
                  >
                    {character.rarity}
                  </span>
                </div>
                <div className="text-sm text-[#888]">{character.class} · Lv.{character.level}/{character.maxLevel}</div>
                <div className="flex items-center gap-2 mt-1">
                  {character.traits.map((trait, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 bg-[#2a2a30] text-[#c9a227]">
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        {/* 可滚动内容 */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea className="h-full [&_[data-slot=scroll-area-scrollbar]]:hidden">
            <div className="text-[#e0dcd0]">
            {/* 状态栏 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <div className="grid grid-cols-3 gap-4">
                <StatBar label="HP" current={character.hp} max={character.maxHp} color="#4a9" />
                <StatBar label="MP" current={character.mp} max={character.maxMp} color="#59b" />
                <StatBar label="EXP" current={character.exp} max={character.expToNext} color="#c9a227" />
              </div>

              {/* 当前状态 */}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-sm text-[#888]">当前状态:</span>
                {character.status === "working" ? (
                  <span className="text-[#4a9]">🔧 在 {character.workingAt} 工作中</span>
                ) : (
                  <span className="text-[#888]">💤 空闲</span>
                )}
              </div>
            </div>

            {/* 属性 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>基础属性</SectionTitle>
              <div className="grid grid-cols-4 gap-3 mt-2">
                <StatBlock icon="⚔️" label="攻击" value={character.stats.attack} />
                <StatBlock icon="🛡️" label="防御" value={character.stats.defense} />
                <StatBlock icon="💨" label="速度" value={character.stats.speed} />
                <StatBlock icon="🍀" label="幸运" value={character.stats.luck} />
              </div>
            </div>

            {/* 技能 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>技能 ({character.skills.length})</SectionTitle>
              <div className="space-y-2 mt-2">
                {character.skills.map((skill, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-[#1a1a20]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{skill.name}</span>
                        <span className="text-xs text-[#c9a227]">Lv.{skill.level}</span>
                      </div>
                      <div className="text-xs text-[#666] mt-0.5">{skill.description}</div>
                    </div>
                    {skill.cooldown > 0 && (
                      <span className="text-xs text-[#888]">CD: {skill.cooldown}回合</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 装备 - 11槽位 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>装备 (11)</SectionTitle>
              {/* 主要装备 - 8槽 */}
              <div className="mt-2">
                <div className="text-xs text-[#666] mb-1">主要装备</div>
                <div className="grid grid-cols-4 gap-2">
                  <EquipSlot label="主手" item={character.equipment.mainHand} icon="🗡️" />
                  <EquipSlot label="副手" item={character.equipment.offHand} icon="🛡️" />
                  <EquipSlot label="头盔" item={character.equipment.helmet} icon="⛑️" />
                  <EquipSlot label="胸甲" item={character.equipment.chest} icon="🎽" />
                  <EquipSlot label="腰带" item={character.equipment.belt} icon="🎗️" />
                  <EquipSlot label="护手" item={character.equipment.gloves} icon="🧤" />
                  <EquipSlot label="裤子" item={character.equipment.pants} icon="👖" />
                  <EquipSlot label="鞋子" item={character.equipment.boots} icon="👢" />
                </div>
              </div>
              {/* 首饰 - 3槽 */}
              <div className="mt-3">
                <div className="text-xs text-[#666] mb-1">首饰</div>
                <div className="grid grid-cols-3 gap-2">
                  <EquipSlot label="项链" item={character.equipment.necklace} icon="📿" />
                  <EquipSlot label="戒指" item={character.equipment.ring1} icon="💍" />
                  <EquipSlot label="戒指" item={character.equipment.ring2} icon="💍" />
                </div>
              </div>
            </div>

            {/* 好感度 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>好感度</SectionTitle>
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm">❤️ {getAffectionLevel(character.affection)}</span>
                  <span className="text-xs text-[#888]">{character.affection}/100</span>
                </div>
                <div className="h-2 bg-[#1a1a20]">
                  <div
                    className="h-full bg-gradient-to-r from-[#e74c3c] to-[#c9a227]"
                    style={{ width: `${character.affection}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 背景故事 */}
            <div className="p-4 border-b border-[#2a2a30]">
              <SectionTitle>背景故事</SectionTitle>
              <p className="text-sm text-[#888] mt-2 leading-relaxed">{character.story}</p>
            </div>

          </div>
          </ScrollArea>
        </div>

        {/* 固定底部按钮 */}
        <div className="flex-shrink-0 bg-[#151518] border-t border-[#2a2a30] p-4 flex gap-2">
          {character.status === "working" ? (
            <button
              onClick={onUnassign}
              className="flex-1 py-2 border border-[#666] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227]"
            >
              取消工作
            </button>
          ) : (
            <button
              onClick={onAssign}
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
    </Dialog>
  );
}

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
    <div>
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

function EquipSlot({ label, item, icon }: { label: string; item: string | null; icon: string }) {
  return (
    <div className="bg-[#1a1a20] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className={`text-sm truncate ${item ? "text-[#e0dcd0]" : "text-[#444]"}`}>
        {item ?? "空"}
      </div>
    </div>
  );
}

function getAffectionLevel(affection: number): string {
  if (affection >= 90) return "挚友";
  if (affection >= 70) return "信赖";
  if (affection >= 50) return "友好";
  if (affection >= 30) return "熟识";
  return "陌生";
}
