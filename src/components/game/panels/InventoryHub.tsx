// 背包Hub - 整合物品、祭坛、商店

import { useState } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { api } from "~/trpc/react";
import { RARITY_COLORS } from "~/constants";
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
              <div className="text-4xl mb-4">📭</div>
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
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-sm truncate">{pc.card.name}</span>
                        <span className="text-xs">x{pc.quantity}</span>
                      </div>
                      <div
                        className="text-xs"
                        style={{ color: RARITY_COLORS[pc.card.rarity] ?? "#888" }}
                      >
                        {pc.card.rarity}
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
            <div className="text-4xl mb-4">🗿</div>
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
                      <div className="font-bold">{altar.name}</div>
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
            🎴 获得 {collectMutation.data.card.rarity} 卡牌: {collectMutation.data.card.name}
          </div>
        )}
        {collectAllMutation.isSuccess && collectAllMutation.data && (
          <div className="mt-4 p-3 bg-[#1a3a1a] border border-[#4a9]/30 text-sm text-[#4a9]">
            🎴 收集了 {collectAllMutation.data.collectedCount} 张卡牌
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
  const { data: player } = api.player.getStatus.useQuery();
  const { data: cards } = api.card.getAll.useQuery();

  const utils = api.useUtils();

  // 商品列表（简化示例）
  const shopItems = [
    { id: "gold_pack", name: "金币礼包", icon: "🪙", price: 100, currency: "crystals", reward: { gold: 1000 } },
    { id: "stamina_potion", name: "体力药水", icon: "🧪", price: 50, currency: "gold", reward: { stamina: 50 } },
    { id: "exp_book", name: "经验书", icon: "📖", price: 200, currency: "gold", reward: { exp: 100 } },
  ];

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
          <span className="text-[#c9a227]">🪙</span> {player?.gold?.toLocaleString() ?? 0}
        </span>
        <span className="text-sm">
          <span className="text-[#9b59b6]">💎</span> {player?.crystals ?? 0}
        </span>
      </div>

      {/* 内容 */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {mode === "buy" ? (
            <div className="space-y-2">
              {shopItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-[#1a1a20] border border-[#2a2a30]"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{item.icon}</div>
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="text-xs text-[#888]">
                        {item.currency === "crystals" ? "💎" : "🪙"} {item.price}
                      </div>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-[#4a9] text-[#08080a] font-bold hover:bg-[#5ba]">
                    购买
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {!cards || cards.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">📭</div>
                  <div className="text-[#888]">暂无可出售物品</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {cards.slice(0, 10).map((pc) => (
                    <div
                      key={pc.id}
                      className="flex items-center justify-between p-3 bg-[#1a1a20] border border-[#2a2a30]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">{pc.card.icon}</div>
                        <div>
                          <div className="font-bold">{pc.card.name}</div>
                          <div className="text-xs text-[#888]">x{pc.quantity}</div>
                        </div>
                      </div>
                      <button className="px-4 py-2 bg-[#e67e22] text-[#08080a] font-bold hover:bg-[#f39c12]">
                        出售
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
