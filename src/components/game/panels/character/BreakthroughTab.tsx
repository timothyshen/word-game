// 突破标签页

import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { SectionTitle } from "./helpers";

interface BreakthroughTabProps {
  characterId: string | null;
}

export default function BreakthroughTab({ characterId }: BreakthroughTabProps) {
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
