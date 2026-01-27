// 角色列表面板
import { useState } from "react";
import { api } from "~/trpc/react";
import { RARITY_COLORS } from "~/constants";

export default function CharacterPanel() {
  const { data: player, isLoading } = api.player.getStatus.useQuery();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-[#888] py-8">加载中...</div>
        </div>
      </div>
    );
  }

  if (!player) return null;

  const characters = player.characters;
  const selectedChar = characters.find((c) => c.id === selectedCharId);

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-[#c9a227] flex items-center gap-2">
            <span>👥</span>
            <span>角色</span>
          </h2>
          <span className="text-sm text-[#888]">
            共 {characters.length} 名角色
          </span>
        </div>

        {characters.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#3d3529] text-[#888]">
            <div className="text-4xl mb-2">👤</div>
            <div>暂无角色</div>
            <div className="text-sm mt-2">使用招募卡来获得新角色</div>
          </div>
        ) : (
          <div className="flex gap-4">
            {/* 角色列表 */}
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {characters.map((pc) => {
                const char = pc.character;
                const rarity = char.rarity;

                return (
                  <div
                    key={pc.id}
                    onClick={() => setSelectedCharId(pc.id)}
                    className={`
                      relative border cursor-pointer transition-all p-3
                      ${
                        selectedCharId === pc.id
                          ? "border-[#c9a227] bg-[#c9a227]/10"
                          : "border-[#3d3529] bg-[#12110d] hover:border-[#666]"
                      }
                    `}
                  >
                    {/* 稀有度边框 */}
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: RARITY_COLORS[rarity] }}
                    />

                    {/* 头像 */}
                    <div className="text-4xl text-center mb-2">{char.portrait}</div>

                    {/* 名称 */}
                    <div className="text-center">
                      <div className="text-[#e0dcd0] font-medium">{char.name}</div>
                      <div className="text-xs text-[#888]">{char.baseClass}</div>
                    </div>

                    {/* 等级和职阶 */}
                    <div className="flex justify-center gap-2 mt-2 text-xs">
                      <span className="px-1 border border-[#3d3529] text-[#888]">
                        Lv.{pc.level}
                      </span>
                      <span className="px-1 border border-[#3d3529] text-[#c9a227]">
                        {pc.tier}阶
                      </span>
                    </div>

                    {/* 当前任务 */}
                    {pc.workingAt && (
                      <div className="mt-2 text-xs text-center text-[#4a9eff]">
                        {pc.workingAt}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 角色详情 */}
            {selectedChar && (
              <div className="w-80 border border-[#3d3529] bg-[#12110d] p-4 flex-shrink-0">
                <div
                  className="h-1 -mt-4 -mx-4 mb-4"
                  style={{ backgroundColor: RARITY_COLORS[selectedChar.character.rarity] }}
                />

                {/* 基本信息 */}
                <div className="text-center mb-4">
                  <div className="text-5xl mb-2">{selectedChar.character.portrait}</div>
                  <h3 className="text-lg text-[#c9a227]">{selectedChar.character.name}</h3>
                  <div className="text-sm text-[#888]">
                    {selectedChar.character.baseClass} · {selectedChar.character.rarity}
                  </div>
                  {selectedChar.profession && (
                    <div className="text-sm text-[#4a9eff] mt-1">
                      职业: {selectedChar.profession.profession.name}
                    </div>
                  )}
                </div>

                {/* 属性 */}
                <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                  <StatItem label="等级" value={selectedChar.level} />
                  <StatItem label="职阶" value={`${selectedChar.tier}阶`} />
                  <StatItem label="HP" value={`${selectedChar.hp}/${selectedChar.maxHp}`} color="#66bb6a" />
                  <StatItem label="MP" value={`${selectedChar.mp}/${selectedChar.maxMp}`} color="#4a9eff" />
                  <StatItem label="攻击" value={selectedChar.attack} color="#ff6b6b" />
                  <StatItem label="防御" value={selectedChar.defense} color="#ffa726" />
                  <StatItem label="速度" value={selectedChar.speed} color="#26c6da" />
                  <StatItem label="幸运" value={selectedChar.luck} color="#ab47bc" />
                </div>

                {/* 技能 */}
                <div className="mb-4">
                  <h4 className="text-sm text-[#888] mb-2">
                    技能 ({selectedChar.learnedSkills.length}/{selectedChar.tier * 6})
                  </h4>
                  {selectedChar.learnedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {selectedChar.learnedSkills.map((cs) => (
                        <span
                          key={cs.id}
                          className="px-2 py-1 bg-[#1a1a20] border border-[#3d3529] text-xs"
                          title={cs.skill.description}
                        >
                          {cs.skill.icon} {cs.skill.name} Lv.{cs.level}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[#666]">暂无技能</div>
                  )}
                </div>

                {/* 背景故事 */}
                <div className="p-2 bg-[#0a0a08] border border-[#3d3529] text-xs text-[#888]">
                  {selectedChar.character.story}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  color = "#e0dcd0",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex justify-between p-2 bg-[#0a0a08] border border-[#3d3529]">
      <span className="text-[#888]">{label}</span>
      <span style={{ color }}>{value}</span>
    </div>
  );
}
