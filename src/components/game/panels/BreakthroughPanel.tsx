// 突破面板 - 玩家和角色阶位突破

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface BreakthroughPanelProps {
  onClose: () => void;
}

type TabType = "player" | "character";

export default function BreakthroughPanel({ onClose }: BreakthroughPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("player");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

  const utils = api.useUtils();

  // 获取玩家突破状态
  const { data: playerStatus, isLoading: playerLoading } = api.breakthrough.getPlayerStatus.useQuery();

  // 获取角色列表
  const { data: characters } = api.character.getAll.useQuery();

  // 获取选中角色的突破状态
  const { data: characterStatus } = api.breakthrough.getCharacterStatus.useQuery(
    { characterId: selectedCharacterId! },
    { enabled: !!selectedCharacterId }
  );

  // 玩家突破
  const playerBreakthroughMutation = api.breakthrough.breakthroughPlayer.useMutation({
    onSuccess: () => {
      void utils.breakthrough.getPlayerStatus.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 角色突破
  const characterBreakthroughMutation = api.breakthrough.breakthroughCharacter.useMutation({
    onSuccess: () => {
      void utils.breakthrough.getCharacterStatus.invalidate();
      void utils.character.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  if (playerLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="p-0 max-w-lg max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#9b59b6]/20 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-xl text-[#e0dcd0]">
                阶位提升
              </DialogTitle>
              <div className="font-game-serif text-[#9b59b6] text-xs tracking-wider mt-1">突破</div>
            </div>
            <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
          </div>
          <div className="h-px bg-gradient-to-r from-[#9b59b6]/40 to-transparent mt-3" />
        </DialogHeader>

        {/* 标签页 */}
        <div className="flex border-b border-[#2a3a4a]">
          <button
            onClick={() => setActiveTab("player")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "player"
                ? "bg-[#9b59b6]/20 text-[#9b59b6] border-b border-[#9b59b6]"
                : "text-[#5a6a7a] hover:text-[#888]"
            }`}
          >
            👤 领主突破
          </button>
          <button
            onClick={() => setActiveTab("character")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "character"
                ? "bg-[#9b59b6]/20 text-[#9b59b6] border-b border-[#9b59b6]"
                : "text-[#5a6a7a] hover:text-[#888]"
            }`}
          >
            🧙 角色突破
          </button>
        </div>

        {/* 玩家突破内容 */}
        {activeTab === "player" && playerStatus && (
          <div className="p-4">
            {/* 当前阶位 */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-2">{playerStatus.currentTier}</div>
              <div className="text-[#c9a227] text-xl font-bold">{playerStatus.currentTier}阶领主</div>
              <div className="text-sm text-[#888] mt-1">
                技能槽位: {playerStatus.skillSlots}
              </div>
            </div>

            {playerStatus.maxTier ? (
              <div className="text-center py-8">
                <div className="text-[#c9a227] font-bold">已达最高阶位</div>
                <div className="text-sm text-[#888] mt-2">恭喜！你已经是最强大的领主了</div>
              </div>
            ) : (
              <>
                {/* 突破条件 */}
                <div className="bg-[#0a0f18] p-4 border border-[#2a3a4a] mb-4">
                  <div className="text-[#9b59b6] text-sm font-bold mb-3">
                    突破到 {playerStatus.currentTier + 1}阶 条件
                  </div>
                  <div className="space-y-2">
                    <ConditionRow
                      label="等级要求"
                      current={playerStatus.currentResources?.level ?? 0}
                      required={playerStatus.requirements?.level ?? 0}
                      met={playerStatus.checks?.meetsLevel ?? false}
                    />
                    <ConditionRow
                      label="金币"
                      current={playerStatus.currentResources?.gold ?? 0}
                      required={playerStatus.requirements?.gold ?? 0}
                      met={playerStatus.checks?.meetsGold ?? false}
                      icon="🪙"
                    />
                    <ConditionRow
                      label="水晶"
                      current={playerStatus.currentResources?.crystals ?? 0}
                      required={playerStatus.requirements?.crystals ?? 0}
                      met={playerStatus.checks?.meetsCrystals ?? false}
                      icon="💎"
                    />
                  </div>
                </div>

                {/* 突破收益 */}
                <div className="bg-[#0a0f18] p-4 border border-[#2a3a4a] mb-4">
                  <div className="text-[#4a9] text-sm font-bold mb-2">突破收益</div>
                  <div className="text-sm text-[#888]">
                    <div>• 技能槽位增加到 {playerStatus.nextTierSlots} 个</div>
                    <div>• 等级上限提升</div>
                    <div>• 解锁更多内容</div>
                  </div>
                </div>

                {/* 突破按钮 */}
                <button
                  onClick={() => playerBreakthroughMutation.mutate()}
                  disabled={!playerStatus.canBreakthrough || playerBreakthroughMutation.isPending}
                  className={`w-full py-3 font-bold ${
                    playerStatus.canBreakthrough
                      ? "bg-[#9b59b6] text-[#fff] hover:bg-[#8e44ad] animate-attention"
                      : "bg-[#1a2030] text-[#444] cursor-not-allowed"
                  } disabled:opacity-50`}
                >
                  {playerBreakthroughMutation.isPending ? "突破中..." : "立即突破"}
                </button>
              </>
            )}

            {/* 操作反馈 */}
            {playerBreakthroughMutation.isSuccess && (
              <div className="mt-4 p-3 bg-[#1a3a1a] text-sm text-[#4a9] text-center">
                突破成功！
              </div>
            )}
            {playerBreakthroughMutation.error && (
              <div className="mt-4 p-3 bg-[#3a1a1a] text-sm text-[#e74c3c] text-center">
                {playerBreakthroughMutation.error.message}
              </div>
            )}
          </div>
        )}

        {/* 角色突破内容 */}
        {activeTab === "character" && (
          <ScrollArea className="flex-1 min-h-0">
            <div className="p-4">
              {/* 角色选择 */}
              <div className="mb-4">
                <div className="text-sm text-[#888] mb-2">选择角色</div>
                <div className="grid grid-cols-4 gap-2">
                  {characters?.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacterId(char.id)}
                      className={`p-2 border text-center ${
                        selectedCharacterId === char.id
                          ? "border-[#9b59b6] bg-[#9b59b6]/10"
                          : "border-[#2a3a4a] bg-[#0a0f18] hover:border-[#3d4a5a]"
                      }`}
                    >
                      <div className="text-2xl">{char.icon}</div>
                      <div className="text-xs truncate">{char.name}</div>
                      <div className="text-xs text-[#c9a227]">{char.tier}阶</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 选中角色的突破信息 */}
              {selectedCharacterId && characterStatus && (
                <div className="border-t border-[#2a3a4a] pt-4">
                  <div className="text-center mb-4">
                    <div className="text-[#c9a227] font-bold">{characterStatus.characterName}</div>
                    <div className="text-sm text-[#888]">当前 {characterStatus.currentTier}阶</div>
                  </div>

                  {characterStatus.maxTier ? (
                    <div className="text-center py-4">
                      <div className="text-[#c9a227]">已达最高阶位</div>
                    </div>
                  ) : (
                    <>
                      <div className="bg-[#0a0f18] p-4 border border-[#2a3a4a] mb-4">
                        <div className="text-[#9b59b6] text-sm font-bold mb-3">
                          突破到 {characterStatus.currentTier + 1}阶 条件
                        </div>
                        <div className="space-y-2">
                          <ConditionRow
                            label="角色等级"
                            current={characterStatus.currentStatus?.level ?? 0}
                            required={characterStatus.requirements?.level ?? 0}
                            met={characterStatus.checks?.meetsLevel ?? false}
                          />
                          <ConditionRow
                            label="金币"
                            current={characterStatus.currentStatus?.gold ?? 0}
                            required={characterStatus.requirements?.gold ?? 0}
                            met={characterStatus.checks?.meetsGold ?? false}
                            icon="🪙"
                          />
                          <ConditionRow
                            label="水晶"
                            current={characterStatus.currentStatus?.crystals ?? 0}
                            required={characterStatus.requirements?.crystals ?? 0}
                            met={characterStatus.checks?.meetsCrystals ?? false}
                            icon="💎"
                          />
                        </div>
                      </div>

                      <button
                        onClick={() => characterBreakthroughMutation.mutate({ characterId: selectedCharacterId })}
                        disabled={!characterStatus.canBreakthrough || characterBreakthroughMutation.isPending}
                        className={`w-full py-3 font-bold ${
                          characterStatus.canBreakthrough
                            ? "bg-[#9b59b6] text-[#fff] hover:bg-[#8e44ad]"
                            : "bg-[#1a2030] text-[#444] cursor-not-allowed"
                        } disabled:opacity-50`}
                      >
                        {characterBreakthroughMutation.isPending ? "突破中..." : "角色突破"}
                      </button>
                    </>
                  )}

                  {characterBreakthroughMutation.isSuccess && (
                    <div className="mt-4 p-3 bg-[#1a3a1a] text-sm text-[#4a9] text-center">
                      角色突破成功！
                    </div>
                  )}
                  {characterBreakthroughMutation.error && (
                    <div className="mt-4 p-3 bg-[#3a1a1a] text-sm text-[#e74c3c] text-center">
                      {characterBreakthroughMutation.error.message}
                    </div>
                  )}
                </div>
              )}

              {!selectedCharacterId && (
                <div className="text-center py-8 text-[#5a6a7a]">
                  请选择要突破的角色
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConditionRow({
  label,
  current,
  required,
  met,
  icon,
}: {
  label: string;
  current: number;
  required: number;
  met: boolean;
  icon?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#888]">
        {icon && <span className="mr-1">{icon}</span>}
        {label}
      </span>
      <span className={met ? "text-[#4a9]" : "text-[#e74c3c]"}>
        {current.toLocaleString()} / {required.toLocaleString()}
        {met && " ✓"}
      </span>
    </div>
  );
}
