// 剧情面板 - 主线剧情系统

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface StoryPanelProps {
  onClose: () => void;
}

export default function StoryPanel({ onClose }: StoryPanelProps) {
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [showRewards, setShowRewards] = useState<{
    gold?: number;
    crystals?: number;
    exp?: number;
  } | null>(null);

  const utils = api.useUtils();

  // 获取所有章节
  const { data: chapters, isLoading } = api.story.getChapters.useQuery();

  // 获取当前节点
  const { data: currentNode, refetch: refetchNode } = api.story.getCurrentNode.useQuery(
    { chapterId: selectedChapterId! },
    { enabled: !!selectedChapterId }
  );

  // 推进剧情
  const advanceMutation = api.story.advanceStory.useMutation({
    onSuccess: (data) => {
      if (data.isCompleted && data.rewards) {
        setShowRewards(data.rewards);
      }
      void refetchNode();
      void utils.story.getChapters.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#0a0a15]/95 border border-[#2a3a4a] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 关闭奖励弹窗
  const closeRewards = () => {
    setShowRewards(null);
    setSelectedChapterId(null);
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#0a0a15]/95 border border-[#2a3a4a] p-0 max-w-lg max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-display text-lg text-[#e0dcd0]">
                {selectedChapterId ? "阅读剧情" : "故事档案"}
              </DialogTitle>
              <div className="h-px bg-gradient-to-r from-[#c9a227]/40 to-transparent mt-1" />
            </div>
            <div className="flex items-center gap-2">
              {selectedChapterId && (
                <button
                  onClick={() => setSelectedChapterId(null)}
                  className="text-sm text-[#5a6a7a] hover:text-[#c9a227] px-2"
                >
                  返回
                </button>
              )}
              <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        {/* 奖励弹窗 */}
        {showRewards && (
          <div className="p-4 bg-[#1a3a1a]/50 border-b border-[#4a9]/20">
            <div className="text-center">
              <div className="text-lg font-bold text-[#4a9] mb-2">🎉 章节完成!</div>
              <div className="flex items-center justify-center gap-4 text-sm">
                {showRewards.gold && <span className="text-[#c9a227]">🪙 {showRewards.gold}</span>}
                {showRewards.crystals && <span className="text-[#9b59b6]">💎 {showRewards.crystals}</span>}
                {showRewards.exp && <span className="text-[#4a9eff]">⭐ {showRewards.exp} EXP</span>}
              </div>
              <button
                onClick={closeRewards}
                className="mt-3 px-4 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba]"
              >
                确定
              </button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          {/* 章节列表 */}
          {!selectedChapterId && (
            <div className="p-4 space-y-3">
              {chapters?.map((chapter) => (
                <div
                  key={chapter.id}
                  className={`p-4 border transition-colors cursor-pointer ${
                    chapter.isCompleted
                      ? "border-[#4a9]/30 bg-[#1a3a1a]/10"
                      : "border-[#2a3a4a] bg-[#0a0a15] hover:border-[#3d3529]"
                  }`}
                  onClick={() => !chapter.isCompleted && setSelectedChapterId(chapter.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {chapter.isCompleted ? "✅" : "📖"}
                      </div>
                      <div>
                        <div className="font-bold">{chapter.title}</div>
                        <div className="text-sm text-[#888] mt-1">{chapter.description}</div>
                      </div>
                    </div>
                    {chapter.isCompleted ? (
                      <span className="text-xs text-[#4a9]">已完成</span>
                    ) : (
                      <span className="text-xs text-[#c9a227]">{chapter.nodeCount} 节点</span>
                    )}
                  </div>

                  {/* 奖励预览 */}
                  <div className="flex items-center gap-3 mt-3 text-xs">
                    <span className="text-[#666]">奖励:</span>
                    {chapter.rewards.gold && <span className="text-[#c9a227]">🪙 {chapter.rewards.gold}</span>}
                    {chapter.rewards.crystals && <span className="text-[#9b59b6]">💎 {chapter.rewards.crystals}</span>}
                    {chapter.rewards.exp && <span className="text-[#4a9eff]">⭐ {chapter.rewards.exp}</span>}
                  </div>
                </div>
              ))}

              {chapters?.length === 0 && (
                <div className="text-center py-12 text-[#666]">
                  <div className="text-4xl mb-4">📜</div>
                  <div>暂无剧情章节</div>
                </div>
              )}
            </div>
          )}

          {/* 剧情阅读 */}
          {selectedChapterId && currentNode && (
            <div className="p-4">
              {currentNode.completed ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">✅</div>
                  <div className="text-[#4a9] font-bold">章节已完成</div>
                  <button
                    onClick={() => setSelectedChapterId(null)}
                    className="mt-4 px-4 py-2 border border-[#c9a227]/20 text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]"
                  >
                    返回章节列表
                  </button>
                </div>
              ) : currentNode.node ? (
                <div className="space-y-4">
                  {/* 进度 */}
                  <div className="flex items-center justify-between text-xs text-[#666]">
                    <span>进度: {currentNode.progress}/{currentNode.totalNodes}</span>
                    <div className="w-32 h-1 bg-[#2a3a4a]">
                      <div
                        className="h-full bg-[#c9a227]"
                        style={{ width: `${((currentNode.progress ?? 0) / (currentNode.totalNodes ?? 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* 节点内容 */}
                  <div className="bg-[#050810] p-4 border border-[#2a3a4a]">
                    {/* 标题 */}
                    <div className="text-[#c9a227] font-bold mb-3">{currentNode.node.title}</div>

                    {/* 说话者 */}
                    {currentNode.node.speaker && (
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 bg-[#0a0a15] border border-[#2a3a4a] flex items-center justify-center text-xl">
                          {currentNode.node.speakerIcon ?? "👤"}
                        </div>
                        <span className="text-[#4a9]">{currentNode.node.speaker}</span>
                      </div>
                    )}

                    {/* 内容 */}
                    <div className="font-game-serif text-[#e0dcd0] leading-relaxed whitespace-pre-wrap">
                      {currentNode.node.content}
                    </div>
                  </div>

                  {/* 选项 */}
                  {currentNode.node.choices ? (
                    <div className="space-y-2">
                      {currentNode.node.choices.map((choice, index) => (
                        <button
                          key={index}
                          onClick={() => advanceMutation.mutate({
                            chapterId: selectedChapterId,
                            choiceIndex: index,
                          })}
                          disabled={advanceMutation.isPending}
                          className="w-full p-3 text-left border border-[#2a3a4a] bg-[#0a0a15] hover:border-[#c9a227]/40 hover:bg-[#050810] transition-colors disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[#c9a227]">▸</span>
                            <span>{choice.text}</span>
                          </div>
                          {choice.rewards && (
                            <div className="mt-1 ml-5 text-xs text-[#4a9]">
                              奖励:
                              {Object.entries(choice.rewards).map(([key, value]) => (
                                <span key={key} className="ml-1">{key}: +{value}</span>
                              ))}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <button
                      onClick={() => advanceMutation.mutate({ chapterId: selectedChapterId })}
                      disabled={advanceMutation.isPending}
                      className="w-full py-3 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                    >
                      {advanceMutation.isPending ? "继续中..." : "继续"}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-[#666]">
                  加载剧情中...
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* 操作反馈 */}
        {advanceMutation.error && (
          <div className="p-3 bg-[#3a1a1a]/50 border-t border-[#e74c3c]/20 text-sm text-[#e74c3c] text-center">
            {advanceMutation.error.message}
          </div>
        )}

        {/* 底部提示 */}
        <div className="p-3 bg-[#050810] border-t border-[#2a3a4a] text-xs text-[#5a6a7a] text-center">
          完成剧情可获得丰厚奖励
        </div>
      </DialogContent>
    </Dialog>
  );
}
