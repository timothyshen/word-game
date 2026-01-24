// 卡牌背包界面
import { useState } from "react";
import { api } from "~/trpc/react";

type CardType = "all" | "building" | "recruit" | "skill" | "enhance" | "item";

const cardTypeLabels: Record<CardType, { label: string; icon: string }> = {
  all: { label: "全部", icon: "📦" },
  building: { label: "建筑", icon: "🏗️" },
  recruit: { label: "招募", icon: "👤" },
  skill: { label: "技能", icon: "📖" },
  enhance: { label: "强化", icon: "💎" },
  item: { label: "道具", icon: "🧪" },
};

const rarityColors: Record<string, string> = {
  普通: "#888888",
  精良: "#4a9eff",
  稀有: "#9966cc",
  史诗: "#ff9900",
  传说: "#ff4444",
};

export default function CardInventory() {
  const [selectedType, setSelectedType] = useState<CardType>("all");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const { data: allCards, isLoading } = api.card.getAll.useQuery();
  const utils = api.useUtils();

  const useCardMutation = api.card.useCard.useMutation({
    onSuccess: () => {
      void utils.card.getAll.invalidate();
    },
  });

  const filteredCards = allCards?.filter(
    (pc) => selectedType === "all" || pc.card.type === selectedType
  );

  const selectedCardData = allCards?.find((pc) => pc.id === selectedCard);

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-[#c9a227] flex items-center gap-2">
            <span>🎴</span>
            <span>卡牌背包</span>
          </h2>
          <span className="text-sm text-[#888]">
            共 {allCards?.reduce((sum, pc) => sum + pc.quantity, 0) ?? 0} 张
          </span>
        </div>

        {/* 类型筛选 */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {(Object.keys(cardTypeLabels) as CardType[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`
                px-3 py-1 text-sm border transition-colors
                ${
                  selectedType === type
                    ? "border-[#c9a227] text-[#c9a227] bg-[#c9a227]/10"
                    : "border-[#3d3529] text-[#888] hover:border-[#666]"
                }
              `}
            >
              {cardTypeLabels[type].icon} {cardTypeLabels[type].label}
            </button>
          ))}
        </div>

        <div className="flex gap-4">
          {/* 卡牌列表 */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center text-[#888] py-8">加载中...</div>
            ) : filteredCards?.length === 0 ? (
              <div className="text-center text-[#888] py-8 border border-dashed border-[#3d3529]">
                暂无卡牌
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredCards?.map((pc) => (
                  <div
                    key={pc.id}
                    onClick={() => setSelectedCard(pc.id)}
                    className={`
                      relative p-3 border cursor-pointer transition-all
                      ${
                        selectedCard === pc.id
                          ? "border-[#c9a227] bg-[#c9a227]/10"
                          : "border-[#3d3529] bg-[#12110d] hover:border-[#666]"
                      }
                    `}
                  >
                    {/* 稀有度边框 */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: rarityColors[pc.card.rarity] }}
                    />

                    {/* 图标 */}
                    <div className="text-3xl text-center mb-2">{pc.card.icon}</div>

                    {/* 名称 */}
                    <div className="text-sm text-center text-[#e0dcd0] truncate">
                      {pc.card.name}
                    </div>

                    {/* 稀有度 */}
                    <div
                      className="text-xs text-center mt-1"
                      style={{ color: rarityColors[pc.card.rarity] }}
                    >
                      {pc.card.rarity}
                    </div>

                    {/* 数量 */}
                    {pc.quantity > 1 && (
                      <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-[#0a0a08] border border-[#3d3529] text-xs text-[#c9a227]">
                        ×{pc.quantity}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 卡牌详情 */}
          {selectedCardData && (
            <div className="w-72 border border-[#3d3529] bg-[#12110d] p-4 flex-shrink-0">
              <div
                className="h-1 -mt-4 -mx-4 mb-4"
                style={{ backgroundColor: rarityColors[selectedCardData.card.rarity] }}
              />

              <div className="text-4xl text-center mb-3">
                {selectedCardData.card.icon}
              </div>

              <h3 className="text-lg text-[#c9a227] text-center mb-1">
                {selectedCardData.card.name}
              </h3>

              <div
                className="text-sm text-center mb-3"
                style={{ color: rarityColors[selectedCardData.card.rarity] }}
              >
                {selectedCardData.card.rarity} · {cardTypeLabels[selectedCardData.card.type as CardType]?.label}
              </div>

              <p className="text-sm text-[#888] mb-4 text-center">
                {selectedCardData.card.description}
              </p>

              <div className="text-sm text-[#666] text-center mb-4">
                持有数量: {selectedCardData.quantity}
              </div>

              <div className="space-y-2">
                {selectedCardData.card.type === "skill" ? (
                  <button
                    onClick={() => {
                      // TODO: 打开技能学习对话框
                      alert("技能学习功能开发中");
                    }}
                    className="w-full py-2 bg-[#4a9eff] text-white text-sm hover:bg-[#5aafff]"
                  >
                    学习技能
                  </button>
                ) : selectedCardData.card.type === "item" ? (
                  <button
                    onClick={() => {
                      useCardMutation.mutate({
                        cardId: selectedCardData.card.id,
                        quantity: 1,
                      });
                    }}
                    disabled={useCardMutation.isPending}
                    className="w-full py-2 bg-[#c9a227] text-[#0a0a08] text-sm hover:bg-[#ddb52f] disabled:opacity-50"
                  >
                    {useCardMutation.isPending ? "使用中..." : "使用"}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // TODO: 打开对应功能
                      alert(`${selectedCardData.card.type}卡使用功能开发中`);
                    }}
                    className="w-full py-2 bg-[#c9a227] text-[#0a0a08] text-sm hover:bg-[#ddb52f]"
                  >
                    使用
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
