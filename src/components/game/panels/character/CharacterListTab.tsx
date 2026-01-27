// 角色列表标签页

import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface CharacterListTabProps {
  onSelectCharacter: (id: string) => void;
  selectedId: string | null;
}

export default function CharacterListTab({
  onSelectCharacter,
  selectedId,
}: CharacterListTabProps) {
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
