// 装备标签页

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface EquipmentTabProps {
  characterId: string | null;
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

type EquipmentSlot = "mainHand" | "offHand" | "helmet" | "chest" | "belt" | "gloves" | "pants" | "boots" | "necklace" | "ring1" | "ring2";

export default function EquipmentTab({ characterId }: EquipmentTabProps) {
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
                    slot: selectedSlot as EquipmentSlot,
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
                        slot: selectedSlot as EquipmentSlot,
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
