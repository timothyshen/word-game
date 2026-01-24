// 卡牌背包界面
"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";

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

interface CardInventoryProps {
  onClose?: () => void;
}

export default function CardInventory({ onClose }: CardInventoryProps) {
  const [selectedType, setSelectedType] = useState<CardType>("all");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [showBuildDialog, setShowBuildDialog] = useState(false);
  const [showSkillDialog, setShowSkillDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [buildPosition, setBuildPosition] = useState({ x: 0, y: 0 });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: allCards, isLoading } = api.card.getAll.useQuery();
  const { data: playerData } = api.player.getStatus.useQuery();
  const utils = api.useUtils();

  // Mutations
  const useBuildingCard = api.card.useBuildingCard.useMutation({
    onSuccess: (data) => {
      setMessage({ type: "success", text: `成功建造了${data.buildingName}！` });
      setShowBuildDialog(false);
      setSelectedCard(null);
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
    onError: (error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const useRecruitCard = api.card.useRecruitCard.useMutation({
    onSuccess: (data) => {
      setMessage({ type: "success", text: `成功招募了${data.characterName}！` });
      setSelectedCard(null);
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
    onError: (error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const learnSkill = api.card.learnSkill.useMutation({
    onSuccess: (data) => {
      setMessage({ type: "success", text: `成功学习了${data.skillName}！` });
      setShowSkillDialog(false);
      setSelectedCard(null);
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
    onError: (error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const useItemCard = api.card.useItemCard.useMutation({
    onSuccess: (data) => {
      setMessage({ type: "success", text: `成功使用了${data.itemName}！` });
      setShowItemDialog(false);
      setSelectedCard(null);
      void utils.card.getAll.invalidate();
      void utils.player.getStatus.invalidate();
    },
    onError: (error) => {
      setMessage({ type: "error", text: error.message });
    },
  });

  const filteredCards = allCards?.filter(
    (pc) => selectedType === "all" || pc.card.type === selectedType
  );

  const selectedCardData = allCards?.find((pc) => pc.id === selectedCard);

  // 清除消息
  const clearMessage = () => setMessage(null);

  // 处理卡牌使用
  const handleUseCard = () => {
    if (!selectedCardData) return;

    switch (selectedCardData.card.type) {
      case "building":
        setShowBuildDialog(true);
        break;
      case "recruit":
        useRecruitCard.mutate({ cardId: selectedCardData.card.id });
        break;
      case "skill":
        setShowSkillDialog(true);
        break;
      case "item":
        setShowItemDialog(true);
        break;
      default:
        setMessage({ type: "error", text: "该卡牌类型暂不支持使用" });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[90vh] bg-[#0a0a08] border border-[#3d3529] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#12110d] border-b border-[#3d3529]">
          <h2 className="text-xl text-[#c9a227] flex items-center gap-2">
            <span>🎴</span>
            <span>卡牌背包</span>
          </h2>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#888]">
              共 {allCards?.reduce((sum, pc) => sum + pc.quantity, 0) ?? 0} 张
            </span>
            {onClose && (
              <button onClick={onClose} className="text-[#888] hover:text-[#c9a227]">✕</button>
            )}
          </div>
        </div>

        {/* 消息提示 */}
        {message && (
          <div
            className={`px-4 py-2 text-sm ${message.type === "success" ? "bg-[#4a9]/20 text-[#4a9]" : "bg-red-900/20 text-red-400"}`}
            onClick={clearMessage}
          >
            {message.text}
          </div>
        )}

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-60px)]">
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

                <button
                  onClick={handleUseCard}
                  disabled={useBuildingCard.isPending || useRecruitCard.isPending || learnSkill.isPending || useItemCard.isPending}
                  className="w-full py-2 bg-[#c9a227] text-[#0a0a08] text-sm font-medium hover:bg-[#ddb52f] disabled:opacity-50"
                >
                  {useBuildingCard.isPending || useRecruitCard.isPending || learnSkill.isPending || useItemCard.isPending
                    ? "处理中..."
                    : selectedCardData.card.type === "skill"
                    ? "学习技能"
                    : selectedCardData.card.type === "recruit"
                    ? "招募角色"
                    : selectedCardData.card.type === "building"
                    ? "建造建筑"
                    : "使用"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 建造位置选择对话框 */}
      <Dialog open={showBuildDialog} onOpenChange={setShowBuildDialog}>
        <DialogContent className="bg-[#12110d] border-[#3d3529] text-[#e0dcd0]">
          <DialogHeader>
            <DialogTitle className="text-[#c9a227]">选择建造位置</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#888]">选择要建造的位置坐标：</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[#666]">X 坐标</label>
                <input
                  type="number"
                  value={buildPosition.x}
                  onChange={(e) => setBuildPosition({ ...buildPosition, x: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0]"
                />
              </div>
              <div>
                <label className="text-xs text-[#666]">Y 坐标</label>
                <input
                  type="number"
                  value={buildPosition.y}
                  onChange={(e) => setBuildPosition({ ...buildPosition, y: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-[#0a0a08] border border-[#3d3529] text-[#e0dcd0]"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (selectedCardData) {
                  useBuildingCard.mutate({
                    cardId: selectedCardData.card.id,
                    positionX: buildPosition.x,
                    positionY: buildPosition.y,
                  });
                }
              }}
              disabled={useBuildingCard.isPending}
              className="w-full py-2 bg-[#c9a227] text-[#0a0a08] hover:bg-[#ddb52f] disabled:opacity-50"
            >
              {useBuildingCard.isPending ? "建造中..." : "确认建造"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 技能学习目标选择 */}
      <Dialog open={showSkillDialog} onOpenChange={setShowSkillDialog}>
        <DialogContent className="bg-[#12110d] border-[#3d3529] text-[#e0dcd0]">
          <DialogHeader>
            <DialogTitle className="text-[#c9a227]">选择学习目标</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={() => {
                if (selectedCardData) {
                  learnSkill.mutate({
                    cardId: selectedCardData.card.id,
                    targetType: "player",
                  });
                }
              }}
              disabled={learnSkill.isPending}
              className="w-full py-3 bg-[#1a1a20] border border-[#3d3529] hover:border-[#c9a227] text-left px-4"
            >
              <div className="text-[#c9a227]">👤 玩家本人</div>
              <div className="text-xs text-[#666]">
                技能槽: {playerData?.learnedSkills.length ?? 0}/{(playerData?.tier ?? 1) * 6}
              </div>
            </button>

            {playerData?.characters.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  if (selectedCardData) {
                    learnSkill.mutate({
                      cardId: selectedCardData.card.id,
                      targetType: "character",
                      targetId: char.id,
                    });
                  }
                }}
                disabled={learnSkill.isPending}
                className="w-full py-3 bg-[#1a1a20] border border-[#3d3529] hover:border-[#c9a227] text-left px-4"
              >
                <div className="flex items-center gap-2">
                  <span>{char.character.portrait}</span>
                  <span className="text-[#e0dcd0]">{char.character.name}</span>
                  <span className="text-xs text-[#888]">Lv.{char.level}</span>
                </div>
                <div className="text-xs text-[#666]">
                  技能槽: {char.learnedSkills.length}/{char.tier * 6}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 道具使用目标选择 */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="bg-[#12110d] border-[#3d3529] text-[#e0dcd0]">
          <DialogHeader>
            <DialogTitle className="text-[#c9a227]">选择使用目标</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {playerData?.characters.map((char) => (
              <button
                key={char.id}
                onClick={() => {
                  if (selectedCardData) {
                    useItemCard.mutate({
                      cardId: selectedCardData.card.id,
                      targetType: "character",
                      targetId: char.id,
                    });
                  }
                }}
                disabled={useItemCard.isPending}
                className="w-full py-3 bg-[#1a1a20] border border-[#3d3529] hover:border-[#c9a227] text-left px-4"
              >
                <div className="flex items-center gap-2">
                  <span>{char.character.portrait}</span>
                  <span className="text-[#e0dcd0]">{char.character.name}</span>
                  <span className="text-xs text-[#888]">Lv.{char.level}</span>
                </div>
                <div className="text-xs text-[#666]">
                  HP: {char.hp}/{char.maxHp} | MP: {char.mp}/{char.maxMp}
                </div>
              </button>
            ))}

            {playerData?.characters.length === 0 && (
              <div className="text-center text-[#888] py-4">暂无可使用道具的角色</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
