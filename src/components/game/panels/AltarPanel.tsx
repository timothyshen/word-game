// 卡牌祭坛面板 - 抽卡/合成/献祭

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface AltarPanelProps {
  onClose: () => void;
}

type TabType = "draw" | "synthesize" | "sacrifice";

const RARITY_COLORS: Record<string, string> = {
  "普通": "#888",
  "精良": "#4a9",
  "稀有": "#59b",
  "史诗": "#e67e22",
  "传说": "#c9a227",
};

export default function AltarPanel({ onClose }: AltarPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("draw");
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [drawResult, setDrawResult] = useState<Array<{
    id: string;
    name: string;
    type: string;
    rarity: string;
    icon: string;
    isNew: boolean;
  }> | null>(null);

  const utils = api.useUtils();

  // 获取祭坛状态
  const { data: status, isLoading } = api.altar.getStatus.useQuery();

  // 获取玩家卡牌
  const { data: playerCards } = api.card.getAll.useQuery();

  // 单抽
  const drawSingleMutation = api.altar.drawSingle.useMutation({
    onSuccess: (data) => {
      setDrawResult([{ ...data.card, isNew: data.isNew }]);
      void utils.altar.getStatus.invalidate();
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 十连抽
  const drawTenMutation = api.altar.drawTen.useMutation({
    onSuccess: (data) => {
      setDrawResult(data.cards);
      void utils.altar.getStatus.invalidate();
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 献祭
  const sacrificeMutation = api.altar.sacrifice.useMutation({
    onSuccess: () => {
      setSelectedCards([]);
      void utils.altar.getStatus.invalidate();
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  // 合成
  const synthesizeMutation = api.altar.synthesize.useMutation({
    onSuccess: (data) => {
      setSelectedCards([]);
      if ("result" in data && data.result) {
        setDrawResult([{ ...data.result, isNew: data.isNew ?? false }]);
      }
      void utils.altar.getStatus.invalidate();
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
  });

  const toggleCardSelection = (cardId: string) => {
    setSelectedCards((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : [...prev, cardId]
    );
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="bg-[#101014] border-2 border-[#9b59b6] p-8">
          <div className="text-center text-[#888]">加载中...</div>
        </DialogContent>
      </Dialog>
    );
  }

  // 抽卡结果展示
  if (drawResult) {
    return (
      <Dialog open={true} onOpenChange={() => setDrawResult(null)}>
        <DialogContent
          className="bg-[#101014] border-2 border-[#9b59b6] p-0 max-w-2xl"
          showCloseButton={false}
        >
          <DialogHeader className="bg-gradient-to-r from-[#1a1020] to-[#101014] border-b border-[#9b59b6]/50 p-6">
            <DialogTitle className="text-[#9b59b6] text-xl font-bold text-center">
              {drawResult.length === 1 ? "抽卡结果" : `${drawResult.length}连抽结果`}
            </DialogTitle>
          </DialogHeader>

          <div className="p-6">
            <div className={`grid gap-3 ${drawResult.length === 1 ? "grid-cols-1" : "grid-cols-5"}`}>
              {drawResult.map((card, i) => (
                <div
                  key={i}
                  className={`relative p-3 bg-[#1a1a20] border-2 text-center ${
                    drawResult.length === 1 ? "py-8" : ""
                  }`}
                  style={{ borderColor: RARITY_COLORS[card.rarity] ?? "#888" }}
                >
                  {card.isNew && (
                    <span className="absolute top-1 right-1 text-xs px-1.5 py-0.5 bg-[#c9a227] text-[#000]">
                      NEW
                    </span>
                  )}
                  <div className={`mb-2 ${drawResult.length === 1 ? "text-5xl" : "text-3xl"}`}>
                    {card.icon}
                  </div>
                  <div className={`font-bold ${drawResult.length === 1 ? "text-lg" : "text-xs"}`}>
                    {card.name}
                  </div>
                  <div
                    className="text-xs mt-1"
                    style={{ color: RARITY_COLORS[card.rarity] }}
                  >
                    {card.rarity}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setDrawResult(null)}
              className="w-full mt-6 py-3 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad]"
            >
              确定
            </button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#101014] border-2 border-[#9b59b6] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#1a1020] to-[#101014] border-b border-[#9b59b6]/50 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1a1a20] border-2 border-[#9b59b6] flex items-center justify-center text-3xl">
                🔮
              </div>
              <div>
                <div className="text-[#9b59b6] text-xs uppercase tracking-wider">卡牌祭坛</div>
                <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                  神秘召唤
                </DialogTitle>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-xs text-[#888]">水晶</div>
                <div className="text-lg font-bold text-[#9b59b6]">💎 {status?.crystals ?? 0}</div>
              </div>
              <button onClick={onClose} className="text-[#666] hover:text-[#9b59b6] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        {/* 标签页 */}
        <div className="flex border-b border-[#2a2a30]">
          {[
            { id: "draw" as const, label: "抽卡", icon: "🎴" },
            { id: "synthesize" as const, label: "合成", icon: "⚗️" },
            { id: "sacrifice" as const, label: "献祭", icon: "🔥" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedCards([]);
              }}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === tab.id
                  ? "bg-[#9b59b6]/20 text-[#9b59b6] border-b-2 border-[#9b59b6]"
                  : "text-[#666] hover:text-[#888]"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {/* 抽卡页面 */}
            {activeTab === "draw" && (
              <div className="space-y-6">
                {/* 概率展示 */}
                <div className="bg-[#1a1a20] p-4 rounded">
                  <div className="text-sm text-[#888] mb-3">抽卡概率</div>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(status?.cardStats ?? {}).map(([rarity, count]) => (
                      <div
                        key={rarity}
                        className="px-3 py-1.5 bg-[#2a2a30] text-sm"
                        style={{ borderLeft: `3px solid ${RARITY_COLORS[rarity]}` }}
                      >
                        <span style={{ color: RARITY_COLORS[rarity] }}>{rarity}</span>
                        <span className="text-[#666] ml-2">拥有{count}张</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 普通抽卡 */}
                <div className="bg-[#1a1a20] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-[#e0dcd0]">普通召唤</div>
                      <div className="text-xs text-[#666]">消耗5水晶</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => drawSingleMutation.mutate({ boosted: false })}
                        disabled={drawSingleMutation.isPending || (status?.crystals ?? 0) < 5}
                        className="px-4 py-2 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        单抽 ×1
                      </button>
                      <button
                        onClick={() => drawTenMutation.mutate({ boosted: false })}
                        disabled={drawTenMutation.isPending || (status?.crystals ?? 0) < 45}
                        className="px-4 py-2 bg-[#8e44ad] text-white font-bold hover:bg-[#7b3a9e] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        十连 ×10
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[#666]">
                    十连抽消耗45水晶（9折），保底至少1张精良
                  </div>
                </div>

                {/* 提升抽卡 */}
                <div className="bg-[#1a1a20] p-4 border-l-4 border-[#c9a227]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-[#c9a227]">高级召唤</div>
                      <div className="text-xs text-[#666]">消耗15水晶，稀有度UP</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => drawSingleMutation.mutate({ boosted: true })}
                        disabled={drawSingleMutation.isPending || (status?.crystals ?? 0) < 15}
                        className="px-4 py-2 bg-[#c9a227] text-[#000] font-bold hover:bg-[#ddb52f] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        单抽 ×1
                      </button>
                      <button
                        onClick={() => drawTenMutation.mutate({ boosted: true })}
                        disabled={drawTenMutation.isPending || (status?.crystals ?? 0) < 135}
                        className="px-4 py-2 bg-[#b8860b] text-[#000] font-bold hover:bg-[#c9a227] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        十连 ×10
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-[#888]">
                    稀有度提升：普通30% → 精良35% → 稀有25% → 史诗8% → 传说2%
                  </div>
                </div>
              </div>
            )}

            {/* 合成页面 */}
            {activeTab === "synthesize" && (
              <div className="space-y-4">
                <div className="bg-[#1a1a20] p-4">
                  <div className="font-bold text-[#e0dcd0] mb-2">品质提升</div>
                  <div className="text-sm text-[#888] mb-3">
                    选择3张相同稀有度的卡牌，合成1张更高品质的卡牌
                  </div>

                  {/* 卡牌选择 */}
                  <div className="grid grid-cols-5 gap-2 mb-4">
                    {playerCards?.filter(pc => pc.quantity > 0 && pc.card.rarity !== "传说").map((pc) => (
                      <button
                        key={pc.card.id}
                        onClick={() => toggleCardSelection(pc.card.id)}
                        className={`p-2 border-2 text-center transition-all ${
                          selectedCards.includes(pc.card.id)
                            ? "border-[#9b59b6] bg-[#9b59b6]/20"
                            : "border-[#2a2a30] hover:border-[#3a3a40]"
                        }`}
                        style={selectedCards.includes(pc.card.id) ? {} : { borderLeftColor: RARITY_COLORS[pc.card.rarity] }}
                      >
                        <div className="text-xl">{pc.card.icon}</div>
                        <div className="text-xs truncate">{pc.card.name}</div>
                        <div className="text-xs text-[#666]">×{pc.quantity}</div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      if (selectedCards.length === 3) {
                        synthesizeMutation.mutate({
                          recipeId: "basic_upgrade",
                          materialCardIds: selectedCards,
                        });
                      }
                    }}
                    disabled={selectedCards.length !== 3 || synthesizeMutation.isPending}
                    className="w-full py-3 bg-[#9b59b6] text-white font-bold hover:bg-[#8e44ad] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    合成 ({selectedCards.length}/3)
                  </button>
                </div>

                <div className="bg-[#1a1a20] p-4">
                  <div className="font-bold text-[#e0dcd0] mb-2">水晶提取</div>
                  <div className="text-sm text-[#888] mb-3">
                    选择5张卡牌分解为水晶
                  </div>
                  <button
                    onClick={() => {
                      if (selectedCards.length === 5) {
                        synthesizeMutation.mutate({
                          recipeId: "crystal_extraction",
                          materialCardIds: selectedCards,
                        });
                      }
                    }}
                    disabled={selectedCards.length !== 5 || synthesizeMutation.isPending}
                    className="w-full py-3 bg-[#59b] text-white font-bold hover:bg-[#4a8] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    提取水晶 ({selectedCards.length}/5)
                  </button>
                </div>
              </div>
            )}

            {/* 献祭页面 */}
            {activeTab === "sacrifice" && (
              <div className="space-y-4">
                <div className="bg-[#1a1a20] p-4">
                  <div className="font-bold text-[#e0dcd0] mb-2">卡牌献祭</div>
                  <div className="text-sm text-[#888] mb-3">
                    选择卡牌献祭，获得水晶和金币
                  </div>

                  <div className="grid grid-cols-5 gap-2 mb-4 max-h-[300px] overflow-y-auto">
                    {playerCards?.filter(pc => pc.quantity > 0).map((pc) => (
                      <button
                        key={pc.card.id}
                        onClick={() => toggleCardSelection(pc.card.id)}
                        className={`p-2 border-2 text-center transition-all ${
                          selectedCards.includes(pc.card.id)
                            ? "border-[#e74c3c] bg-[#e74c3c]/20"
                            : "border-[#2a2a30] hover:border-[#3a3a40]"
                        }`}
                        style={selectedCards.includes(pc.card.id) ? {} : { borderLeftColor: RARITY_COLORS[pc.card.rarity] }}
                      >
                        <div className="text-xl">{pc.card.icon}</div>
                        <div className="text-xs truncate">{pc.card.name}</div>
                        <div className="text-xs" style={{ color: RARITY_COLORS[pc.card.rarity] }}>
                          {pc.card.rarity}
                        </div>
                        <div className="text-xs text-[#666]">×{pc.quantity}</div>
                      </button>
                    ))}
                  </div>

                  {selectedCards.length > 0 && (
                    <div className="mb-4 p-3 bg-[#2a2a30] text-sm">
                      <span className="text-[#888]">预计获得：</span>
                      <span className="text-[#9b59b6] ml-2">
                        💎 {selectedCards.reduce((sum, id) => {
                          const pc = playerCards?.find(c => c.card.id === id);
                          if (!pc) return sum;
                          const rewards: Record<string, number> = {
                            "普通": 1, "精良": 2, "稀有": 5, "史诗": 15, "传说": 50
                          };
                          return sum + (rewards[pc.card.rarity] ?? 1);
                        }, 0)}
                      </span>
                      <span className="text-[#c9a227] ml-4">
                        🪙 {selectedCards.reduce((sum, id) => {
                          const pc = playerCards?.find(c => c.card.id === id);
                          if (!pc) return sum;
                          const rewards: Record<string, number> = {
                            "普通": 10, "精良": 25, "稀有": 50, "史诗": 100, "传说": 250
                          };
                          return sum + (rewards[pc.card.rarity] ?? 10);
                        }, 0)}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      if (selectedCards.length > 0) {
                        sacrificeMutation.mutate({ cardIds: selectedCards });
                      }
                    }}
                    disabled={selectedCards.length === 0 || sacrificeMutation.isPending}
                    className="w-full py-3 bg-[#e74c3c] text-white font-bold hover:bg-[#c0392b] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    献祭 {selectedCards.length} 张卡牌
                  </button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
