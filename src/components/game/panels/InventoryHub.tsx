// 背包Hub - 整合物品、祭坛、商店

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { RARITY_COLORS, getRarityStars } from "~/constants";
import HubPanel, { type HubTab } from "./HubPanel";

interface InventoryHubProps {
  onClose: () => void;
  initialTab?: string;
}

export default function InventoryHub({
  onClose,
  initialTab = "backpack",
}: InventoryHubProps) {
  const tabs: HubTab[] = [
    {
      id: "backpack",
      label: "物品背包",
      icon: "🎒",
      content: <BackpackTab />,
    },
    {
      id: "altar",
      label: "卡牌祭坛",
      icon: "🗿",
      content: <AltarTab />,
    },
    {
      id: "shop",
      label: "商店交易",
      icon: "🏪",
      content: <ShopTab />,
    },
  ];

  return (
    <HubPanel
      title="物品管理"
      icon="🎒"
      tabs={tabs}
      defaultTab={initialTab}
      onClose={onClose}
    />
  );
}

// 背包标签页
function BackpackTab() {
  const [filter, setFilter] = useState<string>("all");
  const { data: cards } = api.card.getAll.useQuery();

  const cardTypes = [
    { id: "all", label: "全部", icon: "📦" },
    { id: "building", label: "建筑", icon: "🏗️" },
    { id: "recruit", label: "招募", icon: "👥" },
    { id: "skill", label: "技能", icon: "📖" },
    { id: "item", label: "道具", icon: "🧪" },
    { id: "enhance", label: "强化", icon: "⚡" },
  ];

  const filteredCards = cards?.filter(
    (c) => filter === "all" || c.card.type === filter
  ) ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* 筛选 */}
      <div className="flex-shrink-0 flex gap-1 p-3 border-b border-[#2a2a30] overflow-x-auto hide-scrollbar">
        {cardTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setFilter(type.id)}
            className={`px-3 py-1 text-sm whitespace-nowrap transition-colors ${
              filter === type.id
                ? "bg-[#c9a227] text-[#08080a]"
                : "bg-[#1a1a20] text-[#888] hover:text-[#e0dcd0]"
            }`}
          >
            {type.icon} {type.label}
          </button>
        ))}
      </div>

      {/* 卡牌列表 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[#888]">暂无卡牌</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {filteredCards.map((pc) => (
                <div
                  key={pc.id}
                  className="p-3 bg-[#1a1a20] border border-[#2a2a30] hover:border-[#3a3a40]"
                >
                  <div className="flex items-start gap-2">
                    <div className="text-2xl">{pc.card.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-white">
                        <span className="font-bold text-sm truncate">{pc.card.name}</span>
                        <span className="text-xs">x{pc.quantity}</span>
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: RARITY_COLORS[pc.card.rarity] ?? "#888" }}
                      >
                        {pc.card.rarity} {getRarityStars(pc.card.rarity)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#666] mt-2 line-clamp-2">
                    {pc.card.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// 祭坛标签页
function AltarTab() {
  const { data: altars, isLoading } = api.altar.getDiscoveredAltars.useQuery();
  const utils = api.useUtils();

  const collectMutation = api.altar.collectDailyCard.useMutation({
    onSuccess: () => {
      void utils.altar.getDiscoveredAltars.invalidate();
    },
  });

  const collectAllMutation = api.altar.collectAllDailyCards.useMutation({
    onSuccess: () => {
      void utils.altar.getDiscoveredAltars.invalidate();
    },
  });

  const challengeMutation = api.altar.challengeGuardian.useMutation({
    onSuccess: () => {
      void utils.altar.getDiscoveredAltars.invalidate();
    },
  });

  const canCollectAny = altars?.some((a) => a.canCollect) ?? false;

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
        {/* 一键收集 */}
        {canCollectAny && (
          <button
            onClick={() => collectAllMutation.mutate()}
            disabled={collectAllMutation.isPending}
            className="w-full mb-4 py-3 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
          >
            {collectAllMutation.isPending ? "收集中..." : "一键收集所有祭坛"}
          </button>
        )}

        {/* 祭坛列表 */}
        {!altars || altars.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-[#888]">暂未发现祭坛</div>
            <div className="text-xs text-[#666] mt-1">探索野外可发现祭坛</div>
          </div>
        ) : (
          <div className="space-y-3">
            {altars.map((altar) => (
              <div
                key={altar.id}
                className={`p-4 border ${
                  altar.canCollect
                    ? "border-[#4a9] bg-[#1a3a1a]/30"
                    : altar.isDefeated
                    ? "border-[#2a2a30] bg-[#1a1a20]"
                    : "border-[#e67e22] bg-[#3a2a1a]/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{altar.icon}</div>
                    <div>
                      <div className="font-bold text-white">{altar.name}</div>
                      <div className="text-xs text-[#888]">{altar.description}</div>
                    </div>
                  </div>
                  <div>
                    {altar.canCollect ? (
                      <button
                        onClick={() => collectMutation.mutate({ altarId: altar.id })}
                        disabled={collectMutation.isPending}
                        className="px-4 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba] disabled:opacity-50"
                      >
                        收集
                      </button>
                    ) : altar.isDefeated ? (
                      <span className="text-xs text-[#666]">今日已收集</span>
                    ) : (
                      <button
                        onClick={() => challengeMutation.mutate({ altarId: altar.id })}
                        disabled={challengeMutation.isPending}
                        className="px-4 py-2 bg-[#e67e22] text-[#08080a] font-bold hover:bg-[#f39c12] disabled:opacity-50"
                      >
                        挑战守卫
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 操作反馈 */}
        {collectMutation.isSuccess && collectMutation.data && (
          <div className="mt-4 p-3 bg-[#1a3a1a] border border-[#4a9]/30 text-sm text-[#4a9]">
            获得 {collectMutation.data.card.rarity} 卡牌: {collectMutation.data.card.name}
          </div>
        )}
        {collectAllMutation.isSuccess && collectAllMutation.data && (
          <div className="mt-4 p-3 bg-[#1a3a1a] border border-[#4a9]/30 text-sm text-[#4a9]">
            收集了 {collectAllMutation.data.collectedCount} 张卡牌
          </div>
        )}
        {challengeMutation.isSuccess && challengeMutation.data && (
          <div
            className={`mt-4 p-3 border text-sm ${
              challengeMutation.data.victory
                ? "bg-[#1a3a1a] border-[#4a9]/30 text-[#4a9]"
                : "bg-[#3a1a1a] border-[#e74c3c]/30 text-[#e74c3c]"
            }`}
          >
            {challengeMutation.data.message}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

// 商店标签页
function ShopTab() {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [category, setCategory] = useState<"all" | "resource" | "special" | "card">("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [selectedSellCard, setSelectedSellCard] = useState<string | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);

  const utils = api.useUtils();
  const { data: shopData, isLoading } = api.shop.getItems.useQuery({ category });
  const { data: playerCards } = api.card.getAll.useQuery();

  const buyMutation = api.shop.buy.useMutation({
    onSuccess: () => {
      void utils.shop.getItems.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedItem(null);
      setBuyQuantity(1);
    },
  });

  const { data: sellPricePreview } = api.shop.getSellPrice.useQuery(
    { cardId: selectedSellCard! },
    { enabled: !!selectedSellCard }
  );

  const sellMutation = api.shop.sell.useMutation({
    onSuccess: () => {
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedSellCard(null);
      setSellQuantity(1);
    },
  });

  const items = shopData?.items ?? [];
  const playerResources = shopData?.playerResources ?? { gold: 0, crystals: 0 };
  const sellableCards = playerCards?.filter((pc) => pc.quantity > 0) ?? [];

  return (
    <div className="h-full flex flex-col">
      {/* 模式切换 */}
      <div className="flex-shrink-0 flex border-b border-[#2a2a30]">
        <button
          onClick={() => setMode("buy")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            mode === "buy"
              ? "bg-[#1a1810] text-[#c9a227] border-b-2 border-[#c9a227]"
              : "text-[#888] hover:text-[#e0dcd0]"
          }`}
        >
          🛒 购买
        </button>
        <button
          onClick={() => setMode("sell")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${
            mode === "sell"
              ? "bg-[#1a1810] text-[#c9a227] border-b-2 border-[#c9a227]"
              : "text-[#888] hover:text-[#e0dcd0]"
          }`}
        >
          💰 出售
        </button>
      </div>

      {/* 资源显示 */}
      <div className="flex-shrink-0 flex items-center justify-center gap-6 p-3 bg-[#0a0a0c] border-b border-[#2a2a30]">
        <span className="text-sm">
          <span className="text-[#c9a227]">🪙</span> {playerResources.gold.toLocaleString()}
        </span>
        <span className="text-sm">
          <span className="text-[#9b59b6]">💎</span> {playerResources.crystals}
        </span>
      </div>

      {mode === "buy" ? (
        <>
          {/* 分类筛选 */}
          <div className="flex-shrink-0 flex gap-1 p-3 border-b border-[#2a2a30]">
            {([
              { id: "all" as const, label: "全部" },
              { id: "resource" as const, label: "资源" },
              { id: "special" as const, label: "特殊" },
              { id: "card" as const, label: "卡包" },
            ]).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1 text-sm transition-colors ${
                  category === cat.id
                    ? "bg-[#c9a227] text-[#08080a]"
                    : "bg-[#1a1a20] text-[#888] hover:text-[#e0dcd0]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              {isLoading ? (
                <div className="text-center py-12 text-[#888]">加载中...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-[#888]">暂无商品</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { setSelectedItem(item.id); setBuyQuantity(1); }}
                      disabled={!item.canBuy || (item.remaining !== undefined && item.remaining <= 0)}
                      className={`p-3 text-left border transition-colors ${
                        selectedItem === item.id
                          ? "border-[#c9a227] bg-[#c9a227]/10"
                          : "border-[#2a2a30] bg-[#1a1a20] hover:bg-[#222228]"
                      } ${!item.canBuy ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="text-2xl">{item.icon}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-white truncate">{item.name}</div>
                          <div className="text-xs text-[#666] mt-1 line-clamp-1">{item.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            {item.price.gold ? <span className="text-xs text-[#c9a227]">🪙 {item.price.gold}</span> : null}
                            {item.price.crystals ? <span className="text-xs text-[#9b59b6]">💎 {item.price.crystals}</span> : null}
                          </div>
                          {item.stock !== undefined && (
                            <div className="text-xs text-[#666] mt-1">限购: {item.remaining}/{item.stock}</div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 购买确认 */}
          {selectedItem && (() => {
            const item = items.find((i) => i.id === selectedItem);
            if (!item) return null;
            const maxQty = item.remaining ?? 99;
            return (
              <div className="flex-shrink-0 border-t border-[#2a2a30] p-3 bg-[#151518] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <div className="font-bold text-sm text-white">{item.name}</div>
                    <div className="text-xs text-[#888]">
                      {(item.price.gold ?? 0) * buyQuantity > 0 && <span className="text-[#c9a227]">🪙 {(item.price.gold ?? 0) * buyQuantity}</span>}
                      {(item.price.crystals ?? 0) * buyQuantity > 0 && <span className="text-[#9b59b6] ml-2">💎 {(item.price.crystals ?? 0) * buyQuantity}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBuyQuantity((q) => Math.max(1, q - 1))} className="w-7 h-7 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888] text-sm">-</button>
                  <span className="w-6 text-center text-sm">{buyQuantity}</span>
                  <button onClick={() => setBuyQuantity((q) => Math.min(maxQty, q + 1))} className="w-7 h-7 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888] text-sm">+</button>
                  <button
                    onClick={() => buyMutation.mutate({ itemId: selectedItem, quantity: buyQuantity })}
                    disabled={buyMutation.isPending}
                    className="px-3 py-1.5 bg-[#c9a227] text-[#08080a] text-sm font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                  >
                    {buyMutation.isPending ? "..." : "购买"}
                  </button>
                </div>
              </div>
            );
          })()}
        </>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-4">
              {sellableCards.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-[#888]">暂无可出售物品</div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {sellableCards.map((pc) => {
                    const rarityPrices: Record<string, { gold: number; crystals: number }> = {
                      "普通": { gold: 10, crystals: 0 }, "精良": { gold: 30, crystals: 1 },
                      "稀有": { gold: 80, crystals: 3 }, "史诗": { gold: 200, crystals: 10 }, "传说": { gold: 500, crystals: 30 },
                    };
                    const price = rarityPrices[pc.card.rarity] ?? rarityPrices["普通"]!;
                    return (
                      <button
                        key={pc.card.id}
                        onClick={() => { setSelectedSellCard(pc.card.id); setSellQuantity(1); }}
                        className={`p-3 border text-left transition-colors ${
                          selectedSellCard === pc.card.id
                            ? "border-[#c9a227] bg-[#c9a227]/10"
                            : "border-[#2a2a30] bg-[#1a1a20] hover:bg-[#222228]"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div className="text-2xl">{pc.card.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-white truncate">{pc.card.name}</div>
                            <div className="text-xs text-[#666]">{pc.card.rarity} x{pc.quantity}</div>
                            <div className="text-xs mt-1">
                              <span className="text-[#c9a227]">🪙 {price.gold}</span>
                              {price.crystals > 0 && <span className="text-[#9b59b6] ml-1">💎 {price.crystals}</span>}
                              <span className="text-[#666]">/张</span>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* 出售确认 */}
          {selectedSellCard && sellPricePreview && (
            <div className="flex-shrink-0 border-t border-[#2a2a30] p-3 bg-[#151518] flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-white">{sellPricePreview.cardName}</div>
                <div className="text-xs text-[#888]">
                  获得: <span className="text-[#c9a227]">🪙 {sellPricePreview.pricePerUnit.gold * sellQuantity}</span>
                  {sellPricePreview.pricePerUnit.crystals > 0 && <span className="text-[#9b59b6] ml-1">💎 {sellPricePreview.pricePerUnit.crystals * sellQuantity}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSellQuantity((q) => Math.max(1, q - 1))} className="w-7 h-7 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888] text-sm">-</button>
                <span className="w-6 text-center text-sm">{sellQuantity}</span>
                <button onClick={() => setSellQuantity((q) => Math.min(sellPricePreview.quantity, q + 1))} className="w-7 h-7 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888] text-sm">+</button>
                <button
                  onClick={() => sellMutation.mutate({ cardId: selectedSellCard, quantity: sellQuantity })}
                  disabled={sellMutation.isPending}
                  className="px-3 py-1.5 bg-[#c9a227] text-[#08080a] text-sm font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                >
                  {sellMutation.isPending ? "..." : "出售"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* 操作反馈 */}
      {buyMutation.isSuccess && (
        <div className="flex-shrink-0 p-2 bg-[#1a3a1a] border-t border-[#4a9]/30 text-xs text-[#4a9] text-center">购买成功</div>
      )}
      {sellMutation.isSuccess && (
        <div className="flex-shrink-0 p-2 bg-[#1a3a1a] border-t border-[#4a9]/30 text-xs text-[#4a9] text-center">出售成功</div>
      )}
      {(buyMutation.error ?? sellMutation.error) && (
        <div className="flex-shrink-0 p-2 bg-[#3a1a1a] border-t border-[#e74c3c]/30 text-xs text-[#e74c3c] text-center">
          {buyMutation.error?.message ?? sellMutation.error?.message}
        </div>
      )}
    </div>
  );
}
