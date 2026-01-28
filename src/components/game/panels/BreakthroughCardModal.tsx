// 突破卡模态框组件

import { useState } from "react";
import { breakthroughCardData, professionTemplates, charactersData } from "~/data/fixtures";
import { RARITY_COLORS } from "~/constants";

type BreakthroughCard = typeof breakthroughCardData.availableCards[0];
type ProfessionTemplate = typeof professionTemplates[0];

interface BreakthroughCardModalProps {
  card: BreakthroughCard;
  onClose: () => void;
  onSelectProfession: (professionId: string) => void;
}

export default function BreakthroughCardModal({
  card,
  onClose,
  onSelectProfession,
}: BreakthroughCardModalProps) {
  const [selectedProfessionId, setSelectedProfessionId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(false);

  const character = charactersData.find(c => c.id === card.characterId);

  const handleSelect = (professionId: string) => {
    setSelectedProfessionId(professionId);
    setConfirmStep(false);
  };

  const handleConfirm = () => {
    if (selectedProfessionId) {
      if (!confirmStep) {
        setConfirmStep(true);
      } else {
        onSelectProfession(selectedProfessionId);
      }
    }
  };

  const selectedProfession = selectedProfessionId
    ? professionTemplates.find(p => p.id === selectedProfessionId)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#101014] border-2 border-[#c9a227] w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 头部 - 突破卡样式 */}
        <div className="bg-gradient-to-b from-[#2a2020] to-[#151518] border-b border-[#c9a227]/50 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-4xl rounded-lg shadow-lg">
                ⚡
              </div>
              <div>
                <div className="text-[#c9a227] text-xs uppercase tracking-wider">突破卡</div>
                <div className="font-bold text-xl mt-1">{card.characterName}</div>
                <div className="text-sm text-[#888] mt-1">
                  来源: {card.obtainedFrom}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="text-[#666] hover:text-[#c9a227] text-2xl">✕</button>
          </div>

          {/* 有效期提示 */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-[#888]">⏳ 有效期:</span>
            <span className={`font-bold ${card.expiresIn <= 1 ? "text-[#e74c3c]" : "text-[#c9a227]"}`}>
              {card.expiresIn}日
            </span>
            {card.expiresIn <= 1 && (
              <span className="text-xs text-[#e74c3c] animate-pulse">即将过期!</span>
            )}
          </div>
        </div>

        {/* 角色信息 */}
        {character && (
          <div className="p-4 border-b border-[#2a2a30]">
            <SectionTitle>角色信息</SectionTitle>
            <div className="mt-2 flex items-center gap-4 p-3 bg-[#1a1a20]">
              <div className="w-12 h-12 bg-[#2a2a30] flex items-center justify-center text-3xl">
                {character.portrait}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white">{character.name}</span>
                  <span
                    className="text-xs px-2 py-0.5"
                    style={{ backgroundColor: RARITY_COLORS[character.rarity], color: "#000" }}
                  >
                    {character.rarity}
                  </span>
                </div>
                <div className="text-sm text-[#888]">
                  {character.class} · Lv.{character.level}
                </div>
                <div className="text-xs text-[#666] mt-1">
                  当前职业: {character.profession ?? <span className="text-[#c9a227]">无</span>}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#888]">已有技能</div>
                <div className="flex flex-wrap gap-1 mt-1 justify-end">
                  {character.skills.map((skill, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 bg-[#2a2a30] text-[#c9a227]">
                      {skill.name} Lv.{skill.level}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 可选职业 */}
        <div className="p-4 border-b border-[#2a2a30]">
          <SectionTitle>可选职业</SectionTitle>
          <div className="mt-3 space-y-3">
            {card.professionOptions.map((option) => {
              const profession = professionTemplates.find(p => p.id === option.professionId);
              if (!profession) return null;

              const isSelected = selectedProfessionId === option.professionId;

              return (
                <div
                  key={option.professionId}
                  onClick={() => handleSelect(option.professionId)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[#1a1a20] border-2 border-[#c9a227]"
                      : "bg-[#1a1a20] border-2 border-transparent hover:border-[#3a3a40]"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#2a2a30] flex items-center justify-center text-2xl">
                        {profession.icon}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{profession.name}</span>
                          <span
                            className="text-xs px-2 py-0.5"
                            style={{ backgroundColor: RARITY_COLORS[profession.rarity], color: "#000" }}
                          >
                            {profession.rarity}
                          </span>
                          {option.recommended && (
                            <span className="text-xs px-2 py-0.5 bg-[#4a9] text-[#000]">
                              推荐
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-[#888] mt-1">{profession.description}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[#888]">匹配度</div>
                      <div className={`text-lg font-bold ${
                        option.matchScore >= 80 ? "text-[#4a9]" :
                        option.matchScore >= 50 ? "text-[#c9a227]" : "text-[#888]"
                      }`}>
                        {option.matchScore}%
                      </div>
                    </div>
                  </div>

                  {/* 匹配原因 */}
                  <div className="mt-2 text-xs text-[#666]">
                    📋 {option.matchReason}
                  </div>

                  {/* 职业加成 */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {profession.bonuses.map((bonus, i) => (
                      <span key={i} className="text-xs px-2 py-1 bg-[#2a2a30] text-[#4a9]">
                        {bonus.type} {bonus.value}
                      </span>
                    ))}
                  </div>

                  {/* 技能树预览 */}
                  <div className="mt-3">
                    <div className="text-xs text-[#888] mb-1">技能树预览</div>
                    <div className="flex items-center gap-1">
                      {profession.skillTree.map((skill, i) => (
                        <span key={i} className="flex items-center">
                          <span className="text-xs px-2 py-0.5 bg-[#2a2a30] text-[#e0dcd0]">
                            {skill}
                          </span>
                          {i < profession.skillTree.length - 1 && (
                            <span className="text-[#3a3a40] mx-1">→</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 选中指示器 */}
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-2 text-[#c9a227]">
                      <span>✓</span>
                      <span className="text-sm">已选择此职业</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 突破说明 */}
        <div className="p-4 border-b border-[#2a2a30]">
          <SectionTitle>注意事项</SectionTitle>
          <div className="mt-2 space-y-1">
            {breakthroughCardData.breakthroughInfo.notes.map((note, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-[#888]">
                <span className="text-[#e74c3c]">⚠️</span>
                <span>{note}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 确认区域 */}
        <div className="p-4">
          {confirmStep && selectedProfession ? (
            <div className="mb-4 p-4 bg-[#2a2020] border border-[#e74c3c]/50">
              <div className="flex items-center gap-2 text-[#e74c3c] mb-2">
                <span className="text-lg">⚠️</span>
                <span className="font-bold">确认突破</span>
              </div>
              <p className="text-sm text-[#888]">
                确定要让 <span className="text-[#c9a227]">{card.characterName}</span> 突破为{" "}
                <span className="text-[#c9a227]">{selectedProfession.name}</span> 吗？
              </p>
              <p className="text-sm text-[#e74c3c] mt-2">
                职业一旦选择无法更改！
              </p>
            </div>
          ) : null}

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-[#666] text-[#888] hover:border-[#c9a227] hover:text-[#c9a227]"
            >
              {confirmStep ? "取消" : "稍后再说"}
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selectedProfessionId}
              className={`flex-1 py-3 border font-bold ${
                selectedProfessionId
                  ? confirmStep
                    ? "border-[#e74c3c] bg-[#e74c3c] text-[#000] hover:bg-[#c0392b]"
                    : "border-[#c9a227] text-[#c9a227] hover:bg-[#c9a227] hover:text-[#08080a]"
                  : "border-[#3a3a40] text-[#555] cursor-not-allowed"
              }`}
            >
              {confirmStep ? "确认突破!" : "选择并突破"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[#c9a227] text-sm font-bold flex items-center gap-2">
      <span className="text-[#3a3a40]">▸</span>
      {children}
    </div>
  );
}

// 突破卡列表组件 - 显示所有可用突破卡
export function BreakthroughCardList({
  onSelectCard,
}: {
  onSelectCard: (card: typeof breakthroughCardData.availableCards[0]) => void;
}) {
  const { availableCards, usedCards, breakthroughInfo } = breakthroughCardData;

  return (
    <div className="space-y-4">
      {/* 系统说明 */}
      <div className="p-4 bg-[#1a1a20] border border-[#c9a227]/30">
        <div className="flex items-center gap-2 text-[#c9a227] mb-2">
          <span className="text-lg">⚡</span>
          <span className="font-bold">{breakthroughInfo.title}</span>
        </div>
        <p className="text-sm text-[#888]">{breakthroughInfo.description}</p>
        <div className="mt-3">
          <div className="text-xs text-[#888] mb-1">突破条件:</div>
          <ul className="text-sm text-[#666] space-y-1">
            {breakthroughInfo.conditions.map((cond, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="text-[#4a9]">•</span>
                {cond}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* 可用突破卡 */}
      {availableCards.length > 0 && (
        <div>
          <div className="text-sm font-bold text-[#c9a227] mb-2">
            可用突破卡 ({availableCards.length})
          </div>
          <div className="space-y-2">
            {availableCards.map((card) => (
              <div
                key={card.id}
                onClick={() => onSelectCard(card)}
                className="p-4 bg-[#1a1a20] border border-[#c9a227]/50 cursor-pointer hover:border-[#c9a227] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#c9a227] to-[#8b6914] flex items-center justify-center text-xl rounded">
                      ⚡
                    </div>
                    <div>
                      <div className="font-bold">{card.characterName}</div>
                      <div className="text-xs text-[#888]">{card.obtainedFrom}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-bold ${
                      card.expiresIn <= 1 ? "text-[#e74c3c]" : "text-[#c9a227]"
                    }`}>
                      {card.expiresIn}日后过期
                    </div>
                    <div className="text-xs text-[#888]">
                      {card.professionOptions.length}个可选职业
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 已使用记录 */}
      {usedCards.length > 0 && (
        <div>
          <div className="text-sm font-bold text-[#888] mb-2">
            已使用 ({usedCards.length})
          </div>
          <div className="space-y-2">
            {usedCards.map((card) => {
              const profession = professionTemplates.find(p => p.id === card.selectedProfession);
              return (
                <div
                  key={card.id}
                  className="p-3 bg-[#1a1a20] border border-[#2a2a30] opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#2a2a30] flex items-center justify-center text-lg">
                        {profession?.icon ?? "?"}
                      </div>
                      <div>
                        <div className="text-sm text-white">{card.characterName}</div>
                        <div className="text-xs text-[#666]">
                          → {profession?.name ?? "未知职业"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-[#666]">{card.usedAt}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 无可用卡 */}
      {availableCards.length === 0 && (
        <div className="p-8 text-center text-[#666]">
          <div className="text-4xl mb-2">📭</div>
          <div>暂无可用突破卡</div>
          <div className="text-sm mt-1">继续培养角色以获得突破机会</div>
        </div>
      )}
    </div>
  );
}
