"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface PartyPanelProps {
  onClose: () => void;
}

const RARITY_COLORS: Record<string, string> = {
  common: "#888",
  uncommon: "#4a9",
  rare: "#59b",
  epic: "#e67e22",
  legendary: "#c9a227",
};

export default function PartyPanel({ onClose }: PartyPanelProps) {
  const [partyIds, setPartyIds] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  const { data: currentParty, isLoading: partyLoading } =
    api.party.getParty.useQuery();
  const { data: characters, isLoading: charsLoading } =
    api.character.getAll.useQuery();

  const utils = api.useUtils();

  const saveMutation = api.party.setParty.useMutation({
    onSuccess: () => {
      setDirty(false);
      void utils.party.getParty.invalidate();
    },
  });

  // Initialize local state from server data
  useEffect(() => {
    if (currentParty) {
      setPartyIds(currentParty);
    }
  }, [currentParty]);

  const isLoading = partyLoading || charsLoading;

  const partyMembers = partyIds
    .map((id) => characters?.find((c) => c.id === id))
    .filter(Boolean);

  const availableCharacters = characters?.filter(
    (c) => !partyIds.includes(c.id)
  );

  const handleAdd = (characterId: string) => {
    if (partyIds.length >= 3) return;
    setPartyIds((prev) => [...prev, characterId]);
    setDirty(true);
  };

  const handleRemove = (characterId: string) => {
    setPartyIds((prev) => prev.filter((id) => id !== characterId));
    setDirty(true);
  };

  const handleSave = () => {
    if (partyIds.length === 0) return;
    saveMutation.mutate({ members: partyIds });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#0a0a15]/95 border border-[#3d3529] p-0 max-w-2xl max-h-[85vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#3d3529] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-lg text-[#e0dcd0]">
                编队管理
              </DialogTitle>
              <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-1" />
            </div>
            <button
              onClick={onClose}
              className="text-[#5a6a7a] hover:text-[#c9a227] text-xl"
            >
              ✕
            </button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-[#888]">加载中...</div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            {/* Party Slots */}
            <div className="p-4 border-b border-[#2a3a4a]/50 bg-[#050810]/80">
              <div className="text-xs text-[#666] mb-3 tracking-wider uppercase">
                当前编队 ({partyIds.length}/3)
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((slot) => {
                  const member = partyMembers[slot];
                  if (member) {
                    return (
                      <button
                        key={slot}
                        onClick={() => handleRemove(member.id)}
                        className="group relative p-3 border border-[#3d3529] bg-[#0a0a15] hover:border-[#e74c3c]/50 transition-all text-left"
                      >
                        <div className="absolute top-1 right-1 text-[#e74c3c] opacity-0 group-hover:opacity-100 text-xs transition-opacity">
                          ✕
                        </div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-10 h-10 bg-[#1a1a20] border flex items-center justify-center text-xl rounded"
                            style={{
                              borderColor:
                                RARITY_COLORS[member.rarity] ?? "#888",
                            }}
                          >
                            {member.icon ?? "🧙"}
                          </div>
                          <div className="min-w-0">
                            <div
                              className="text-sm font-bold truncate"
                              style={{
                                color:
                                  RARITY_COLORS[member.rarity] ?? "#e0dcd0",
                              }}
                            >
                              {member.name}
                            </div>
                            <div className="text-xs text-[#666]">
                              Lv.{member.level}{" "}
                              <span className="text-[#888]">
                                {member.baseClass}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-[#2a2a30] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#e74c3c]"
                              style={{
                                width: `${(member.hp / member.maxHp) * 100}%`,
                              }}
                            />
                          </div>
                          <span className="text-[9px] text-[#666]">
                            {member.hp}/{member.maxHp}
                          </span>
                        </div>
                      </button>
                    );
                  }
                  return (
                    <div
                      key={slot}
                      className="p-3 border border-dashed border-[#2a3a4a] bg-[#0a0a08]/50 flex items-center justify-center min-h-[80px]"
                    >
                      <span className="text-[#444] text-sm">空槽位</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Available Characters */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-4 pt-3 pb-1">
                <div className="text-xs text-[#666] tracking-wider uppercase">
                  可选角色
                </div>
              </div>
              <ScrollArea className="flex-1 min-h-[120px]">
                <div className="px-4 pb-4 space-y-2">
                  {availableCharacters && availableCharacters.length > 0 ? (
                    availableCharacters.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => handleAdd(char.id)}
                        disabled={partyIds.length >= 3}
                        className={`w-full p-3 border text-left transition-all flex items-center gap-3 ${
                          partyIds.length >= 3
                            ? "border-[#2a2a30] text-[#444] cursor-not-allowed"
                            : "border-[#2a3a4a] bg-[#0a0a15] hover:border-[#c9a227] hover:bg-[#1a1a20]"
                        }`}
                      >
                        <div
                          className="w-10 h-10 bg-[#1a1a20] border flex items-center justify-center text-xl rounded flex-shrink-0"
                          style={{
                            borderColor: RARITY_COLORS[char.rarity] ?? "#888",
                          }}
                        >
                          {char.icon ?? "🧙"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-bold truncate"
                              style={{
                                color: RARITY_COLORS[char.rarity] ?? "#e0dcd0",
                              }}
                            >
                              {char.name}
                            </span>
                            <span className="text-xs text-[#666]">
                              Lv.{char.level}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[#666] mt-0.5">
                            <span>{char.baseClass}</span>
                            <span>
                              ATK {char.attack} / DEF {char.defense}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-[#e74c3c]">
                              ♥ {char.hp}/{char.maxHp}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] text-[#3498db]">
                              ◆ {char.mp}/{char.maxMp}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-[#444] py-8 text-sm">
                      没有更多可选角色
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Save Button */}
            <div className="p-4 border-t border-[#2a3a4a]/50 bg-[#050810]/80">
              <button
                onClick={handleSave}
                disabled={
                  !dirty || partyIds.length === 0 || saveMutation.isPending
                }
                className={`w-full py-3 font-bold transition-all ${
                  dirty && partyIds.length > 0
                    ? "bg-[#c9a227] text-[#000] hover:bg-[#ddb52f]"
                    : "bg-[#1a1a20] text-[#444] cursor-not-allowed border border-[#2a2a30]"
                }`}
              >
                {saveMutation.isPending
                  ? "保存中..."
                  : saveMutation.isSuccess && !dirty
                    ? "已保存"
                    : "保存编队"}
              </button>
              {saveMutation.isError && (
                <div className="text-xs text-[#e74c3c] mt-2 text-center">
                  保存失败: {saveMutation.error.message}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
