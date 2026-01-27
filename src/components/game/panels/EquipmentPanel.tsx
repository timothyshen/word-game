// 装备面板 - 11槽位装备系统

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

interface EquipmentPanelProps {
  characterId: string;
  characterName: string;
  onClose: () => void;
}

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

export default function EquipmentPanel({
  characterId,
  characterName,
  onClose,
}: EquipmentPanelProps) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showEnhance, setShowEnhance] = useState<string | null>(null);

  const utils = api.useUtils();

  // 获取角色装备
  const { data: charEquipment, isLoading } = api.equipment.getCharacterEquipment.useQuery({
    characterId,
  });

  // 获取可用装备
  const { data: availableEquipment } = api.equipment.getAvailable.useQuery(
    { slot: selectedSlot as "mainHand" | "offHand" | "helmet" | "chest" | "belt" | "gloves" | "pants" | "boots" | "necklace" | "ring1" | "ring2" | undefined },
    { enabled: !!selectedSlot }
  );

  // 装备
  const equipMutation = api.equipment.equip.useMutation({
    onSuccess: () => {
      setSelectedSlot(null);
      void utils.equipment.getCharacterEquipment.invalidate();
      void utils.equipment.getAvailable.invalidate();
    },
  });

  // 卸下
  const unequipMutation = api.equipment.unequip.useMutation({
    onSuccess: () => {
      void utils.equipment.getCharacterEquipment.invalidate();
      void utils.equipment.getAvailable.invalidate();
    },
  });

  // 强化
  const enhanceMutation = api.equipment.enhance.useMutation({
    onSuccess: () => {
      void utils.equipment.getCharacterEquipment.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#c9a227] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  const slots = charEquipment?.slots ?? {};
  const totalBonus = charEquipment?.totalBonus ?? {
    attack: 0, defense: 0, speed: 0, luck: 0, hp: 0, mp: 0,
  };

  // 装备选择模态框
  if (selectedSlot) {
    const slotName = slots[selectedSlot]?.slotName ?? selectedSlot;
    return (
      <Dialog open={true} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent
          className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-md"
          showCloseButton={false}
        >
          <DialogHeader className="bg-[#151518] border-b border-[#2a2a30] p-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[#c9a227]">
                选择{slotName}装备
              </DialogTitle>
              <button onClick={() => setSelectedSlot(null)} className="text-[#666] hover:text-[#c9a227]">✕</button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[400px]">
            <div className="p-4 space-y-2">
              {availableEquipment?.length === 0 ? (
                <div className="text-center text-[#666] py-8">
                  没有可用的{slotName}装备
                </div>
              ) : (
                availableEquipment?.map((eq) => (
                  <button
                    key={eq.id}
                    onClick={() => {
                      equipMutation.mutate({
                        equipmentId: eq.id,
                        characterId,
                        slot: selectedSlot as "mainHand",
                      });
                    }}
                    disabled={equipMutation.isPending}
                    className="w-full p-3 bg-[#1a1a20] border-2 border-[#2a2a30] hover:border-[#c9a227] text-left flex items-center gap-3"
                    style={{ borderLeftColor: RARITY_COLORS[eq.equipment.rarity] }}
                  >
                    <div className="w-10 h-10 bg-[#2a2a30] flex items-center justify-center text-2xl">
                      {eq.equipment.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-[#e0dcd0]">
                        {eq.equipment.name}
                        {eq.enhanceLevel > 0 && (
                          <span className="text-[#c9a227] ml-1">+{eq.enhanceLevel}</span>
                        )}
                      </div>
                      <div className="text-xs" style={{ color: RARITY_COLORS[eq.equipment.rarity] }}>
                        {eq.equipment.rarity}
                      </div>
                      <div className="text-xs text-[#666] mt-1">
                        {eq.equipment.attackBonus > 0 && `攻击+${eq.equipment.attackBonus} `}
                        {eq.equipment.defenseBonus > 0 && `防御+${eq.equipment.defenseBonus} `}
                        {eq.equipment.speedBonus > 0 && `速度+${eq.equipment.speedBonus} `}
                        {eq.equipment.hpBonus > 0 && `HP+${eq.equipment.hpBonus} `}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    );
  }

  // 强化模态框
  if (showEnhance) {
    const slot = slots[showEnhance];
    const eq = slot?.equipment;

    if (!eq) {
      setShowEnhance(null);
      return null;
    }

    return (
      <Dialog open={true} onOpenChange={() => setShowEnhance(null)}>
        <DialogContent
          className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-sm"
          showCloseButton={false}
        >
          <DialogHeader className="bg-[#151518] border-b border-[#2a2a30] p-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-[#c9a227]">强化装备</DialogTitle>
              <button onClick={() => setShowEnhance(null)} className="text-[#666] hover:text-[#c9a227]">✕</button>
            </div>
          </DialogHeader>

          <div className="p-4">
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{eq.icon}</div>
              <div className="font-bold text-lg text-[#e0dcd0]">
                {eq.name} +{eq.enhanceLevel}
              </div>
              <div className="text-sm" style={{ color: RARITY_COLORS[eq.rarity] }}>
                {eq.rarity}
              </div>
            </div>

            <div className="bg-[#1a1a20] p-3 mb-4 text-sm">
              <div className="text-[#888] mb-2">当前属性</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {eq.stats.attack > 0 && <div>攻击: +{eq.stats.attack}</div>}
                {eq.stats.defense > 0 && <div>防御: +{eq.stats.defense}</div>}
                {eq.stats.speed > 0 && <div>速度: +{eq.stats.speed}</div>}
                {eq.stats.luck > 0 && <div>幸运: +{eq.stats.luck}</div>}
                {eq.stats.hp > 0 && <div>HP: +{eq.stats.hp}</div>}
                {eq.stats.mp > 0 && <div>MP: +{eq.stats.mp}</div>}
              </div>
            </div>

            {eq.enhanceLevel >= 10 ? (
              <div className="text-center text-[#c9a227] py-4">
                已达最高强化等级
              </div>
            ) : (
              <>
                <div className="text-xs text-[#888] mb-2 text-center">
                  成功率: {Math.max(30, 100 - eq.enhanceLevel * 8)}%
                </div>
                <button
                  onClick={() => enhanceMutation.mutate({ equipmentId: eq.id })}
                  disabled={enhanceMutation.isPending}
                  className="w-full py-3 bg-[#c9a227] text-[#000] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                >
                  {enhanceMutation.isPending ? "强化中..." : "强化 (+1)"}
                </button>
                {enhanceMutation.isSuccess && (
                  <div className={`text-center mt-2 text-sm ${
                    enhanceMutation.data.success ? "text-[#4a9]" : "text-[#e74c3c]"
                  }`}>
                    {enhanceMutation.data.success ? "强化成功！" : "强化失败..."}
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#c9a227] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-[#151518] border-b border-[#2a2a30] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#c9a227] flex items-center justify-center text-3xl">
                ⚔️
              </div>
              <div>
                <div className="text-[#c9a227] text-xs">装备管理</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  {characterName}
                </DialogTitle>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-xl">✕</button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {/* 属性加成总览 */}
            <div className="bg-[#1a1a20] p-4 mb-4">
              <div className="text-sm text-[#888] mb-2">装备属性加成</div>
              <div className="grid grid-cols-6 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#e74c3c]">攻击</div>
                  <div className="font-bold text-[#e74c3c]">+{totalBonus.attack}</div>
                </div>
                <div>
                  <div className="text-xs text-[#59b]">防御</div>
                  <div className="font-bold text-[#59b]">+{totalBonus.defense}</div>
                </div>
                <div>
                  <div className="text-xs text-[#4a9]">速度</div>
                  <div className="font-bold text-[#4a9]">+{totalBonus.speed}</div>
                </div>
                <div>
                  <div className="text-xs text-[#c9a227]">幸运</div>
                  <div className="font-bold text-[#c9a227]">+{totalBonus.luck}</div>
                </div>
                <div>
                  <div className="text-xs text-[#e67e22]">HP</div>
                  <div className="font-bold text-[#e67e22]">+{totalBonus.hp}</div>
                </div>
                <div>
                  <div className="text-xs text-[#9b59b6]">MP</div>
                  <div className="font-bold text-[#9b59b6]">+{totalBonus.mp}</div>
                </div>
              </div>
            </div>

            {/* 装备槽位 */}
            <div className="grid grid-cols-3 gap-3">
              {/* 左侧：武器和饰品 */}
              <div className="space-y-3">
                <SlotCard
                  slot="mainHand"
                  data={slots.mainHand}
                  onSelect={() => setSelectedSlot("mainHand")}
                  onEnhance={() => setShowEnhance("mainHand")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "mainHand" })}
                />
                <SlotCard
                  slot="offHand"
                  data={slots.offHand}
                  onSelect={() => setSelectedSlot("offHand")}
                  onEnhance={() => setShowEnhance("offHand")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "offHand" })}
                />
                <SlotCard
                  slot="necklace"
                  data={slots.necklace}
                  onSelect={() => setSelectedSlot("necklace")}
                  onEnhance={() => setShowEnhance("necklace")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "necklace" })}
                />
                <SlotCard
                  slot="ring1"
                  data={slots.ring1}
                  onSelect={() => setSelectedSlot("ring1")}
                  onEnhance={() => setShowEnhance("ring1")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "ring1" })}
                />
                <SlotCard
                  slot="ring2"
                  data={slots.ring2}
                  onSelect={() => setSelectedSlot("ring2")}
                  onEnhance={() => setShowEnhance("ring2")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "ring2" })}
                />
              </div>

              {/* 中间：角色形象 */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-24 h-32 bg-[#1a1a20] border-2 border-[#3a3a40] flex items-center justify-center text-5xl">
                  🧙
                </div>
                <div className="mt-2 text-sm text-[#888]">{characterName}</div>
              </div>

              {/* 右侧：护甲 */}
              <div className="space-y-3">
                <SlotCard
                  slot="helmet"
                  data={slots.helmet}
                  onSelect={() => setSelectedSlot("helmet")}
                  onEnhance={() => setShowEnhance("helmet")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "helmet" })}
                />
                <SlotCard
                  slot="chest"
                  data={slots.chest}
                  onSelect={() => setSelectedSlot("chest")}
                  onEnhance={() => setShowEnhance("chest")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "chest" })}
                />
                <SlotCard
                  slot="belt"
                  data={slots.belt}
                  onSelect={() => setSelectedSlot("belt")}
                  onEnhance={() => setShowEnhance("belt")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "belt" })}
                />
                <SlotCard
                  slot="gloves"
                  data={slots.gloves}
                  onSelect={() => setSelectedSlot("gloves")}
                  onEnhance={() => setShowEnhance("gloves")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "gloves" })}
                />
                <SlotCard
                  slot="pants"
                  data={slots.pants}
                  onSelect={() => setSelectedSlot("pants")}
                  onEnhance={() => setShowEnhance("pants")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "pants" })}
                />
                <SlotCard
                  slot="boots"
                  data={slots.boots}
                  onSelect={() => setSelectedSlot("boots")}
                  onEnhance={() => setShowEnhance("boots")}
                  onUnequip={() => unequipMutation.mutate({ characterId, slot: "boots" })}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function SlotCard({
  slot,
  data,
  onSelect,
  onEnhance,
  onUnequip,
}: {
  slot: string;
  data?: {
    slotName: string;
    equipment: {
      id: string;
      name: string;
      icon: string;
      rarity: string;
      enhanceLevel: number;
    } | null;
  };
  onSelect: () => void;
  onEnhance: () => void;
  onUnequip: () => void;
}) {
  const eq = data?.equipment;
  const slotName = data?.slotName ?? slot;

  if (!eq) {
    return (
      <button
        onClick={onSelect}
        className="w-full p-2 bg-[#1a1a20] border border-dashed border-[#3a3a40] hover:border-[#c9a227] text-center"
      >
        <div className="text-xl text-[#3a3a40]">{SLOT_ICONS[slot] ?? "❓"}</div>
        <div className="text-xs text-[#666]">{slotName}</div>
      </button>
    );
  }

  return (
    <div
      className="p-2 bg-[#1a1a20] border-2 text-center"
      style={{ borderColor: RARITY_COLORS[eq.rarity] }}
    >
      <div className="text-xl">{eq.icon}</div>
      <div className="text-xs font-bold truncate">
        {eq.name}
        {eq.enhanceLevel > 0 && (
          <span className="text-[#c9a227]">+{eq.enhanceLevel}</span>
        )}
      </div>
      <div className="text-xs" style={{ color: RARITY_COLORS[eq.rarity] }}>
        {eq.rarity}
      </div>
      <div className="flex gap-1 mt-1">
        <button
          onClick={onEnhance}
          className="flex-1 text-xs py-0.5 bg-[#c9a227]/20 text-[#c9a227] hover:bg-[#c9a227]/30"
        >
          强化
        </button>
        <button
          onClick={onUnequip}
          className="flex-1 text-xs py-0.5 bg-[#e74c3c]/20 text-[#e74c3c] hover:bg-[#e74c3c]/30"
        >
          卸下
        </button>
      </div>
    </div>
  );
}
