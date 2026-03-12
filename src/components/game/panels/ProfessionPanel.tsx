// 职业面板 - 学习和管理职业

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface ProfessionPanelProps {
  onClose: () => void;
}

type TabType = "player" | "character";

export default function ProfessionPanel({ onClose }: ProfessionPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("player");
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedProfessionId, setSelectedProfessionId] = useState<string | null>(null);

  const utils = api.useUtils();

  // 获取所有职业
  const { data: professions, isLoading } = api.profession.getAll.useQuery();

  // 获取玩家职业
  const { data: playerProfession } = api.profession.getPlayerProfession.useQuery();

  // 获取角色列表
  const { data: characters } = api.character.getAll.useQuery();

  // 获取选中角色的职业
  const { data: characterProfession } = api.profession.getCharacterProfession.useQuery(
    { characterId: selectedCharacterId! },
    { enabled: !!selectedCharacterId }
  );

  // 玩家学习职业
  const learnPlayerMutation = api.profession.learnPlayerProfession.useMutation({
    onSuccess: () => {
      void utils.profession.getPlayerProfession.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedProfessionId(null);
    },
  });

  // 角色学习职业
  const learnCharacterMutation = api.profession.learnCharacterProfession.useMutation({
    onSuccess: () => {
      void utils.profession.getCharacterProfession.invalidate();
      void utils.character.getAll.invalidate();
      setSelectedProfessionId(null);
    },
  });

  if (isLoading) {
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
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl text-[#e0dcd0]">
              职业系统
            </DialogTitle>
            <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
          </div>
          <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-2" />
        </DialogHeader>

        {/* 标签页 */}
        <div className="flex border-b border-[#2a2a30]">
          <button
            onClick={() => setActiveTab("player")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "player"
                ? "bg-[#4a9]/20 text-[#4a9] border-b-2 border-[#4a9]"
                : "text-[#666] hover:text-[#888]"
            }`}
          >
            👤 领主职业
          </button>
          <button
            onClick={() => setActiveTab("character")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "character"
                ? "bg-[#4a9]/20 text-[#4a9] border-b-2 border-[#4a9]"
                : "text-[#666] hover:text-[#888]"
            }`}
          >
            🧙 角色职业
          </button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {/* 玩家职业 */}
          {activeTab === "player" && (
            <div className="p-4">
              {/* 当前职业 */}
              {playerProfession?.hasProfession ? (
                <div className="bg-[#1a3a1a] p-4 border border-[#4a9]/30 mb-4">
                  <div className="text-[#4a9] text-sm mb-2">当前职业</div>
                  <div className="text-xl font-bold text-[#e0dcd0]">
                    {playerProfession.profession?.name}
                  </div>
                  <div className="text-sm text-[#888] mt-1">
                    {playerProfession.profession?.description}
                  </div>
                  {playerProfession.profession?.bonuses && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(playerProfession.profession.bonuses).map(([stat, value]) => (
                        <span key={stat} className="text-xs px-2 py-1 bg-[#4a9]/20 text-[#4a9]">
                          {stat} +{value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-[#1a1a20] p-4 border border-[#2a2a30] mb-4 text-center">
                  <div className="text-[#888]">尚未选择职业</div>
                  <div className="text-xs text-[#666] mt-1">选择下方职业进行学习</div>
                </div>
              )}

              {/* 可选职业列表 */}
              {!playerProfession?.hasProfession && (
                <div className="space-y-3">
                  <div className="text-sm text-[#c9a227] mb-2">可选职业</div>
                  {professions?.map((profession) => (
                    <div
                      key={profession.id}
                      className={`p-4 border transition-colors cursor-pointer ${
                        selectedProfessionId === profession.id
                          ? "border-[#4a9] bg-[#4a9]/10"
                          : "border-[#2a2a30] bg-[#1a1a20] hover:border-[#3a3a40]"
                      }`}
                      onClick={() => setSelectedProfessionId(
                        selectedProfessionId === profession.id ? null : profession.id
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-white">{profession.name}</div>
                      </div>
                      <div className="text-sm text-[#888] mt-1">{profession.description}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(profession.bonuses).map(([stat, value]) => (
                          <span key={stat} className="text-xs px-2 py-1 bg-[#2a2a30] text-[#4a9]">
                            {stat} +{value}
                          </span>
                        ))}
                      </div>

                      {selectedProfessionId === profession.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            learnPlayerMutation.mutate({ professionId: profession.id });
                          }}
                          disabled={learnPlayerMutation.isPending}
                          className="mt-3 w-full py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba] disabled:opacity-50"
                        >
                          {learnPlayerMutation.isPending ? "学习中..." : "学习此职业"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 操作反馈 */}
              {learnPlayerMutation.isSuccess && (
                <div className="mt-4 p-3 bg-[#1a3a1a] text-sm text-[#4a9] text-center">
                  职业学习成功！
                </div>
              )}
              {learnPlayerMutation.error && (
                <div className="mt-4 p-3 bg-[#3a1a1a] text-sm text-[#e74c3c] text-center">
                  {learnPlayerMutation.error.message}
                </div>
              )}
            </div>
          )}

          {/* 角色职业 */}
          {activeTab === "character" && (
            <div className="p-4">
              {/* 角色选择 */}
              <div className="mb-4">
                <div className="text-sm text-[#888] mb-2">选择角色</div>
                <div className="grid grid-cols-4 gap-2">
                  {characters?.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => {
                        setSelectedCharacterId(char.id);
                        setSelectedProfessionId(null);
                      }}
                      className={`p-2 border text-center ${
                        selectedCharacterId === char.id
                          ? "border-[#4a9] bg-[#4a9]/10"
                          : "border-[#2a2a30] bg-[#1a1a20] hover:border-[#3a3a40]"
                      }`}
                    >
                      <div className="text-2xl">{char.icon}</div>
                      <div className="text-xs truncate">{char.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 选中角色的职业信息 */}
              {selectedCharacterId && characterProfession && (
                <div className="border-t border-[#2a2a30] pt-4">
                  <div className="text-center mb-4">
                    <div className="text-[#c9a227] font-bold">{characterProfession.characterName}</div>
                    <div className="text-sm text-[#888]">{characterProfession.baseClass}</div>
                  </div>

                  {characterProfession.hasProfession ? (
                    <div className="bg-[#1a3a1a] p-4 border border-[#4a9]/30">
                      <div className="text-[#4a9] text-sm mb-2">当前职业</div>
                      <div className="font-bold">{characterProfession.profession?.name}</div>
                      <div className="text-sm text-[#888] mt-1">
                        {characterProfession.profession?.description}
                      </div>
                      {characterProfession.profession?.bonuses && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {Object.entries(characterProfession.profession.bonuses).map(([stat, value]) => (
                            <span key={stat} className="text-xs px-2 py-1 bg-[#4a9]/20 text-[#4a9]">
                              {stat} +{value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-sm text-[#888] text-center">尚未选择职业</div>
                      {professions?.map((profession) => (
                        <div
                          key={profession.id}
                          className={`p-3 border transition-colors cursor-pointer ${
                            selectedProfessionId === profession.id
                              ? "border-[#4a9] bg-[#4a9]/10"
                              : "border-[#2a2a30] bg-[#1a1a20] hover:border-[#3a3a40]"
                          }`}
                          onClick={() => setSelectedProfessionId(
                            selectedProfessionId === profession.id ? null : profession.id
                          )}
                        >
                          <div className="font-bold text-sm">{profession.name}</div>
                          <div className="text-xs text-[#888] mt-1">{profession.description}</div>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {Object.entries(profession.bonuses).map(([stat, value]) => (
                              <span key={stat} className="text-[10px] px-1.5 py-0.5 bg-[#2a2a30] text-[#4a9]">
                                {stat} +{value}
                              </span>
                            ))}
                          </div>

                          {selectedProfessionId === profession.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                learnCharacterMutation.mutate({
                                  characterId: selectedCharacterId,
                                  professionId: profession.id,
                                });
                              }}
                              disabled={learnCharacterMutation.isPending}
                              className="mt-2 w-full py-1.5 bg-[#4a9] text-[#08080a] text-sm font-bold hover:bg-[#5ba] disabled:opacity-50"
                            >
                              {learnCharacterMutation.isPending ? "学习中..." : "学习"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {learnCharacterMutation.isSuccess && (
                    <div className="mt-4 p-3 bg-[#1a3a1a] text-sm text-[#4a9] text-center">
                      角色职业学习成功！
                    </div>
                  )}
                  {learnCharacterMutation.error && (
                    <div className="mt-4 p-3 bg-[#3a1a1a] text-sm text-[#e74c3c] text-center">
                      {learnCharacterMutation.error.message}
                    </div>
                  )}
                </div>
              )}

              {!selectedCharacterId && (
                <div className="text-center py-8 text-[#666]">
                  请选择角色查看职业信息
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* 底部提示 */}
        <div className="p-3 bg-[#050810] border-t border-[#2a3a4a] text-xs text-[#5a6a7a] text-center">
          职业一旦选择无法更改，请谨慎选择
        </div>
      </DialogContent>
    </Dialog>
  );
}
