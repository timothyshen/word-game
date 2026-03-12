// 背包面板 - 显示玩家拥有的卡牌

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

interface BackpackPanelProps {
  onClose: () => void;
}

type TabType = "all" | "building" | "character" | "skill" | "item" | "chest";

const RARITY_ORDER = ["传说", "史诗", "稀有", "精良", "普通"];

const TYPE_LABELS: Record<string, string> = {
  building: "建筑",
  character: "角色",
  skill: "技能",
  item: "道具",
  equipment: "装备",
  resource: "资源",
  chest: "宝箱",
};

interface ChestResult {
  chestName: string;
  chestRarity: string;
  cards: Array<{ id: string; name: string; type: string; rarity: string; icon: string; description: string }>;
}

export default function BackpackPanel({ onClose }: BackpackPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [selectedCard, setSelectedCard] = useState<{
    id: string;
    name: string;
    type: string;
    rarity: string;
    icon: string;
    description: string;
    quantity: number;
  } | null>(null);
  const [chestResult, setChestResult] = useState<ChestResult | null>(null);

  const utils = api.useUtils();

  // 获取玩家卡牌
  const { data: playerCards, isLoading } = api.card.getAll.useQuery();

  // 使用卡牌
  const useCardMutation = api.card.useCard.useMutation({
    onSuccess: () => {
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedCard(null);
    },
  });

  // 开启宝箱
  const openChestMutation = api.card.openChest.useMutation({
    onSuccess: (data) => {
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedCard(null);
      setChestResult(data);
    },
  });

  // 过滤卡牌
  const filteredCards = playerCards
    ?.filter((pc) => pc.quantity > 0)
    .filter((pc) => activeTab === "all" || pc.card.type === activeTab)
    .sort((a, b) => {
      // 先按稀有度排序
      const rarityDiff = RARITY_ORDER.indexOf(a.card.rarity) - RARITY_ORDER.indexOf(b.card.rarity);
      if (rarityDiff !== 0) return rarityDiff;
      // 再按名称排序
      return a.card.name.localeCompare(b.card.name);
    });

  // 统计各类型数量
  const cardCounts = {
    all: playerCards?.filter((pc) => pc.quantity > 0).length ?? 0,
    building: playerCards?.filter((pc) => pc.quantity > 0 && pc.card.type === "building").length ?? 0,
    character: playerCards?.filter((pc) => pc.quantity > 0 && pc.card.type === "character").length ?? 0,
    skill: playerCards?.filter((pc) => pc.quantity > 0 && pc.card.type === "skill").length ?? 0,
    item: playerCards?.filter((pc) => pc.quantity > 0 && (pc.card.type === "item" || pc.card.type === "equipment" || pc.card.type === "resource")).length ?? 0,
    chest: playerCards?.filter((pc) => pc.quantity > 0 && pc.card.type === "chest").length ?? 0,
  };

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
        className="p-0 max-w-3xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <DialogTitle className="font-display text-xl text-[#e0dcd0]">
                  我的收藏
                </DialogTitle>
                <div className="font-game-serif text-[#5a6a7a] text-xs tracking-wider">卡牌背包</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-[#888]">
                共 <span className="text-[#c9a227] font-bold">{cardCounts.all}</span> 张卡牌
              </div>
              <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        {/* 标签页 */}
        <div className="flex border-b border-[#2a2a30]">
          {[
            { id: "all" as const, label: "全部", icon: "📦" },
            { id: "building" as const, label: "建筑", icon: "🏠" },
            { id: "character" as const, label: "角色", icon: "👤" },
            { id: "skill" as const, label: "技能", icon: "📖" },
            { id: "item" as const, label: "道具", icon: "🧪" },
            { id: "chest" as const, label: "宝箱", icon: "📦" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === tab.id
                  ? "bg-[#c9a227]/20 text-[#c9a227] border-b-2 border-[#c9a227]"
                  : "text-[#666] hover:text-[#888]"
              }`}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
              <span className="ml-1 text-xs">({cardCounts[tab.id]})</span>
            </button>
          ))}
        </div>

        {/* 内容区域 */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {(!filteredCards || filteredCards.length === 0) ? (
              <div className="text-center py-12">
                <div className="text-[#888]">暂无卡牌</div>
                <div className="text-sm text-[#666] mt-2">
                  通过探索、祭坛或商店获取卡牌
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {filteredCards.map((pc) => (
                  <button
                    key={pc.card.id}
                    onClick={() => setSelectedCard({
                      id: pc.card.id,
                      name: pc.card.name,
                      type: pc.card.type,
                      rarity: pc.card.rarity,
                      icon: pc.card.icon,
                      description: pc.card.description,
                      quantity: pc.quantity,
                    })}
                    className="relative p-3 bg-[#1a1a20] border-2 text-center hover:bg-[#222228] transition-colors"
                    style={{ borderColor: RARITY_COLORS[pc.card.rarity] ?? "#888" }}
                  >
                    {/* 数量标记 */}
                    {pc.quantity > 1 && (
                      <span className="absolute top-1 right-1 text-xs px-1.5 py-0.5 bg-[#2a2a30] text-[#e0dcd0]">
                        ×{pc.quantity}
                      </span>
                    )}
                    <div className="text-2xl mb-1">{pc.card.icon}</div>
                    <div className="text-xs truncate">{pc.card.name}</div>
                    <div
                      className="text-[10px] mt-0.5"
                      style={{ color: RARITY_COLORS[pc.card.rarity] }}
                    >
                      {pc.card.rarity}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* 卡牌详情弹窗 */}
        {selectedCard && (
          <Dialog open={true} onOpenChange={() => setSelectedCard(null)}>
            <DialogContent className="p-0 max-w-md" showCloseButton={false}>
              <DialogHeader className="p-4 border-b border-[#2a2a30]">
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 bg-[#0a0a15] border flex items-center justify-center text-4xl"
                    style={{ borderColor: (RARITY_COLORS[selectedCard.rarity] ?? "#888") + "4D" }}
                  >
                    {selectedCard.icon}
                  </div>
                  <div>
                    <DialogTitle className="font-bold text-lg text-[#e0dcd0]">
                      {selectedCard.name}
                    </DialogTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="text-sm"
                        style={{ color: RARITY_COLORS[selectedCard.rarity] }}
                      >
                        {selectedCard.rarity}
                      </span>
                      <span className="text-xs text-[#666]">
                        {TYPE_LABELS[selectedCard.type] ?? selectedCard.type}
                      </span>
                      <span className="text-xs text-[#888]">
                        ×{selectedCard.quantity}
                      </span>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="p-4">
                <p className="text-sm text-[#888] mb-4">{selectedCard.description}</p>

                <div className="flex gap-2">
                  {selectedCard.type === "chest" ? (
                    <button
                      onClick={() => openChestMutation.mutate({ cardId: selectedCard.id })}
                      disabled={openChestMutation.isPending}
                      className="flex-1 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                    >
                      {openChestMutation.isPending ? "开启中..." : "开启宝箱"}
                    </button>
                  ) : (
                    <button
                      onClick={() => useCardMutation.mutate({ cardId: selectedCard.id })}
                      disabled={useCardMutation.isPending}
                      className="flex-1 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                    >
                      {useCardMutation.isPending ? "使用中..." : "使用卡牌"}
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="px-4 py-2 border border-[#3a3a40] text-[#888] hover:text-[#e0dcd0]"
                  >
                    关闭
                  </button>
                </div>

                {(useCardMutation.error ?? openChestMutation.error) && (
                  <div className="mt-3 p-2 bg-[#3a1a1a] border border-[#e74c3c]/30 text-sm text-[#e74c3c]">
                    {(useCardMutation.error ?? openChestMutation.error)?.message}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
        {/* 宝箱开启结果 */}
        {chestResult && (
          <Dialog open={true} onOpenChange={() => setChestResult(null)}>
            <DialogContent className="p-0 max-w-md" showCloseButton={false}>
              <DialogHeader className="p-4 border-b border-[#2a3a4a]">
                <DialogTitle className="text-[#c9a227] font-bold text-lg text-center">
                  {chestResult.chestName} 开启结果
                </DialogTitle>
              </DialogHeader>
              <div className="p-4">
                <div className="flex flex-col gap-2">
                  {chestResult.cards.map((card, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 border border-[#2a3a4a] rounded">
                      <span className="text-xl">{card.icon}</span>
                      <span className="flex-1 text-sm text-[#e0dcd0]">{card.name}</span>
                      <span className="text-xs" style={{ color: RARITY_COLORS[card.rarity] }}>
                        {card.rarity}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setChestResult(null)}
                  className="mt-4 w-full py-2 bg-[#c9a227]/20 border border-[#c9a227] text-[#c9a227] rounded text-sm hover:bg-[#c9a227]/30"
                >
                  确定
                </button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
