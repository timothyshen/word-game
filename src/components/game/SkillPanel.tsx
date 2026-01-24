// 技能面板 - 展示已学习技能
import { api } from "~/trpc/react";

const skillTypeLabels: Record<string, { label: string; color: string }> = {
  combat: { label: "战斗", color: "#ff6b6b" },
  production: { label: "生产", color: "#4ecdc4" },
  utility: { label: "辅助", color: "#a29bfe" },
};

export default function SkillPanel() {
  const { data: player, isLoading } = api.player.getStatus.useQuery();

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

  const skillSlots = player.skillSlots;
  const usedSlots = player.learnedSkills.length;
  const emptySlots = skillSlots - usedSlots;

  return (
    <div className="p-4">
      <div className="max-w-6xl mx-auto">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl text-[#c9a227] flex items-center gap-2">
            <span>⚔️</span>
            <span>技能</span>
          </h2>
          <div className="text-sm text-[#888]">
            技能槽: <span className="text-[#c9a227]">{usedSlots}</span> / {skillSlots}
            <span className="text-[#666] ml-2">({player.tier}阶 × 6)</span>
          </div>
        </div>

        {/* 技能类型说明 */}
        <div className="flex gap-4 mb-4 text-sm">
          {Object.entries(skillTypeLabels).map(([type, { label, color }]) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-3 h-3" style={{ backgroundColor: color }} />
              <span className="text-[#888]">{label}</span>
            </div>
          ))}
        </div>

        {/* 已学技能 */}
        {usedSlots === 0 ? (
          <div className="text-center py-12 border border-dashed border-[#3d3529] text-[#888]">
            <div className="text-4xl mb-2">📖</div>
            <div>暂无已学技能</div>
            <div className="text-sm mt-2">使用技能卡来学习新技能</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {player.learnedSkills.map((ps) => {
              const skill = ps.skill;
              const typeInfo = skillTypeLabels[skill.type] ?? { label: "未知", color: "#888" };

              return (
                <div
                  key={ps.id}
                  className="border border-[#3d3529] bg-[#12110d] p-4 relative"
                >
                  {/* 类型标识 */}
                  <div
                    className="absolute top-0 left-0 right-0 h-1"
                    style={{ backgroundColor: typeInfo.color }}
                  />

                  {/* 图标和等级 */}
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{skill.icon}</span>
                    <span className="px-2 py-0.5 bg-[#1a1a20] border border-[#3d3529] text-xs text-[#c9a227]">
                      Lv.{ps.level}
                    </span>
                  </div>

                  {/* 名称 */}
                  <h3 className="text-[#e0dcd0] font-medium mb-1">{skill.name}</h3>

                  {/* 类型 */}
                  <div className="text-xs mb-2" style={{ color: typeInfo.color }}>
                    {typeInfo.label}技能
                  </div>

                  {/* 描述 */}
                  <p className="text-sm text-[#888] mb-2">{skill.description}</p>

                  {/* 冷却 */}
                  {skill.cooldown > 0 && (
                    <div className="text-xs text-[#666]">
                      冷却: {skill.cooldown}回合
                    </div>
                  )}
                </div>
              );
            })}

            {/* 空槽位 */}
            {Array.from({ length: emptySlots }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="border border-dashed border-[#3d3529] bg-[#0a0a08] p-4 flex items-center justify-center min-h-[140px]"
              >
                <div className="text-center text-[#3d3529]">
                  <div className="text-2xl mb-1">+</div>
                  <div className="text-xs">空槽位</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 提示 */}
        <div className="mt-6 p-3 border border-[#3d3529] bg-[#0a0a08] text-sm text-[#666]">
          <strong className="text-[#888]">提示:</strong> 使用技能卡可以学习新技能或升级已有技能。
          升级职阶可以解锁更多技能槽位。
        </div>
      </div>
    </div>
  );
}
