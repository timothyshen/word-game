// 商店面板 - 购买物品和出售卡牌

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";

interface ShopPanelProps {
  onClose: () => void;
}

type TabType = "buy" | "sell";
type CategoryType = "all" | "resource" | "special" | "card";

export default function ShopPanel({ onClose }: ShopPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>("buy");
  const [category, setCategory] = useState<CategoryType>("all");
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [selectedSellCard, setSelectedSellCard] = useState<string | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);

  const utils = api.useUtils();

  // 获取商店物品
  const { data: shopData, isLoading } = api.shop.getItems.useQuery({ category });

  // 获取玩家卡牌（用于出售）
  const { data: playerCards } = api.card.getAll.useQuery();

  // 购买物品
  const buyMutation = api.shop.buy.useMutation({
    onSuccess: () => {
      void utils.shop.getItems.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedItem(null);
      setBuyQuantity(1);
    },
  });

  // 获取出售价格预览
  const { data: sellPricePreview } = api.shop.getSellPrice.useQuery(
    { cardId: selectedSellCard! },
    { enabled: !!selectedSellCard }
  );

  // 出售卡牌
  const sellMutation = api.shop.sell.useMutation({
    onSuccess: () => {
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
      setSelectedSellCard(null);
      setSellQuantity(1);
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

  const items = shopData?.items ?? [];
  const playerResources = shopData?.playerResources ?? { gold: 0, crystals: 0 };

  // 可出售的卡牌（数量>0）
  const sellableCards = playerCards?.filter((pc) => pc.quantity > 0) ?? [];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="bg-[#0a0a15]/95 border border-[#2a3a4a] p-0 max-w-2xl max-h-[90vh] flex flex-col gap-0"
        showCloseButton={false}
      >
        {/* 头部 */}
        <DialogHeader className="sticky top-0 z-10 bg-gradient-to-r from-[#0a0a15] to-[#050810] border-b border-[#2a3a4a] p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <DialogTitle className="font-display text-xl text-[#e0dcd0]">
                  冒险者商会
                </DialogTitle>
                <div className="font-game-serif text-[#5a6a7a] text-xs tracking-wider">商店</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-[#c9a227]">🪙 {playerResources.gold}</span>
                <span className="mx-2 text-[#3a3a40]">|</span>
                <span className="text-[#9b59b6]">💎 {playerResources.crystals}</span>
              </div>
              <button onClick={onClose} className="text-[#5a6a7a] hover:text-[#c9a227] text-xl">✕</button>
            </div>
          </div>
        </DialogHeader>

        {/* 标签页 */}
        <div className="flex border-b border-[#2a2a30]">
          <button
            onClick={() => setActiveTab("buy")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "buy"
                ? "bg-[#c9a227]/20 text-[#c9a227] border-b-2 border-[#c9a227]"
                : "text-[#666] hover:text-[#888]"
            }`}
          >
            🛒 购买
          </button>
          <button
            onClick={() => setActiveTab("sell")}
            className={`flex-1 py-3 text-center transition-colors ${
              activeTab === "sell"
                ? "bg-[#c9a227]/20 text-[#c9a227] border-b-2 border-[#c9a227]"
                : "text-[#666] hover:text-[#888]"
            }`}
          >
            💰 出售
          </button>
        </div>

        {/* 购买内容 */}
        {activeTab === "buy" && (
          <>
            {/* 分类筛选 */}
            <div className="flex gap-2 p-3 border-b border-[#2a2a30]">
              {[
                { id: "all" as const, label: "全部" },
                { id: "resource" as const, label: "资源" },
                { id: "special" as const, label: "特殊" },
                { id: "card" as const, label: "卡包" },
              ].map((cat) => (
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

            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4 grid grid-cols-2 gap-3">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setSelectedItem(item.id);
                      setBuyQuantity(1);
                    }}
                    disabled={!item.canBuy || (item.remaining !== undefined && item.remaining <= 0)}
                    className={`p-3 text-left border transition-colors ${
                      selectedItem === item.id
                        ? "border-[#c9a227] bg-[#c9a227]/10"
                        : "border-[#2a2a30] bg-[#1a1a20] hover:bg-[#222228]"
                    } ${!item.canBuy ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{item.icon}</div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-white">{item.name}</div>
                        <div className="text-xs text-[#666] mt-1">{item.description}</div>
                        <div className="flex items-center gap-2 mt-2">
                          {item.price.gold && (
                            <span className="text-xs text-[#c9a227]">🪙 {item.price.gold}</span>
                          )}
                          {item.price.crystals && (
                            <span className="text-xs text-[#9b59b6]">💎 {item.price.crystals}</span>
                          )}
                        </div>
                        {item.stock !== undefined && (
                          <div className="text-xs text-[#666] mt-1">
                            今日限购: {item.remaining}/{item.stock}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>

            {/* 购买确认 */}
            {selectedItem && (
              <div className="border-t border-[#2a2a30] p-4 bg-[#151518]">
                {(() => {
                  const item = items.find((i) => i.id === selectedItem);
                  if (!item) return null;
                  const maxQty = item.remaining ?? 99;
                  const totalGold = (item.price.gold ?? 0) * buyQuantity;
                  const totalCrystals = (item.price.crystals ?? 0) * buyQuantity;

                  return (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{item.icon}</span>
                        <div>
                          <div className="font-bold text-white">{item.name}</div>
                          <div className="text-sm text-[#888]">
                            {totalGold > 0 && <span className="text-[#c9a227]">🪙 {totalGold}</span>}
                            {totalCrystals > 0 && <span className="text-[#9b59b6] ml-2">💎 {totalCrystals}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setBuyQuantity((q) => Math.max(1, q - 1))}
                            className="w-8 h-8 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888]"
                          >
                            -
                          </button>
                          <span className="w-8 text-center">{buyQuantity}</span>
                          <button
                            onClick={() => setBuyQuantity((q) => Math.min(maxQty, q + 1))}
                            className="w-8 h-8 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888]"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => buyMutation.mutate({ itemId: selectedItem, quantity: buyQuantity })}
                          disabled={buyMutation.isPending}
                          className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                        >
                          {buyMutation.isPending ? "购买中..." : "购买"}
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}

        {/* 出售内容 */}
        {activeTab === "sell" && (
          <>
            <ScrollArea className="flex-1 min-h-0">
              <div className="p-4">
                {sellableCards.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-[#888]">没有可出售的卡牌</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {sellableCards.map((pc) => {
                      const rarityPrices: Record<string, { gold: number; crystals: number }> = {
                        "普通": { gold: 10, crystals: 0 },
                        "精良": { gold: 30, crystals: 1 },
                        "稀有": { gold: 80, crystals: 3 },
                        "史诗": { gold: 200, crystals: 10 },
                        "传说": { gold: 500, crystals: 30 },
                      };
                      const price = rarityPrices[pc.card.rarity] ?? rarityPrices["普通"]!;
                      const isSelected = selectedSellCard === pc.card.id;

                      return (
                        <button
                          key={pc.card.id}
                          onClick={() => {
                            setSelectedSellCard(pc.card.id);
                            setSellQuantity(1);
                          }}
                          className={`p-3 border text-left transition-colors ${
                            isSelected
                              ? "border-[#c9a227] bg-[#c9a227]/10"
                              : "border-[#2a2a30] bg-[#1a1a20] hover:bg-[#222228]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className="text-2xl">{pc.card.icon}</div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-white">{pc.card.name}</div>
                              <div className="text-xs text-[#666]">{pc.card.rarity} x{pc.quantity}</div>
                              <div className="text-xs mt-1">
                                <span className="text-[#c9a227]">🪙 {price.gold}</span>
                                {price.crystals > 0 && (
                                  <span className="text-[#9b59b6] ml-2">💎 {price.crystals}</span>
                                )}
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
              <div className="border-t border-[#2a2a30] p-4 bg-[#151518]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-bold text-white">{sellPricePreview.cardName}</div>
                      <div className="text-sm text-[#888]">
                        获得:
                        <span className="text-[#c9a227] ml-1">🪙 {sellPricePreview.pricePerUnit.gold * sellQuantity}</span>
                        {sellPricePreview.pricePerUnit.crystals > 0 && (
                          <span className="text-[#9b59b6] ml-2">💎 {sellPricePreview.pricePerUnit.crystals * sellQuantity}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSellQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888]"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{sellQuantity}</span>
                      <button
                        onClick={() => setSellQuantity((q) => Math.min(sellPricePreview.quantity, q + 1))}
                        className="w-8 h-8 bg-[#2a2a30] hover:bg-[#3a3a40] text-[#888]"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => sellMutation.mutate({ cardId: selectedSellCard, quantity: sellQuantity })}
                      disabled={sellMutation.isPending}
                      className="px-4 py-2 bg-[#c9a227] text-[#08080a] font-bold hover:bg-[#ddb52f] disabled:opacity-50"
                    >
                      {sellMutation.isPending ? "出售中..." : "出售"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* 操作反馈 */}
        {buyMutation.isSuccess && (
          <div className="p-3 bg-[#1a3a1a] border-t border-[#4a9]/30 text-sm text-[#4a9]">
            购买成功！
          </div>
        )}
        {sellMutation.isSuccess && (
          <div className="p-3 bg-[#1a3a1a] border-t border-[#4a9]/30 text-sm text-[#4a9]">
            出售成功！
          </div>
        )}
        {(buyMutation.error ?? sellMutation.error) && (
          <div className="p-3 bg-[#3a1a1a] border-t border-[#e74c3c]/30 text-sm text-[#e74c3c]">
            {buyMutation.error?.message ?? sellMutation.error?.message}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
