// Variant D: 命令行/终端风格 - 极简文字界面
// 设计理念：纯文字界面，ASCII 艺术边框，打字机效果，类 MUD 游戏

import { buildingsData, charactersData, tasksData, playerData, resourcesData, dailyInfo } from "../data/fixtures";

export default function VariantD() {
  return (
    <div className="min-h-screen bg-[#0a0a08] text-[#b8b0a0] font-mono p-4 text-sm leading-relaxed">
      {/* 标题 ASCII 艺术 */}
      <pre className="text-[#c9a227] text-center text-xs mb-4">
{`╔══════════════════════════════════════════════════════════════╗
║   ▄▀▀▀▄  ▄▀▀▀▄  ▄▀▀▀▄   ▀▀█▀▀  ▀█▀   ▄▀▀▀▄  ▄▀▀▄ ▄▀▀▄        ║
║   ▀▄▄▄   █   █  █   █     █     █    █   █  █  █ █  █        ║
║   ▄   █  █   █  █   █     █     █    █▀▀▀█  █  █ █  █        ║
║   ▀▀▀▀    ▀▀▀    ▀▀▀      ▀    ▀▀▀   ▀   ▀  ▀  ▀ ▀  ▀        ║
║                      — 诸 天 领 域 —                          ║
╚══════════════════════════════════════════════════════════════╝`}
      </pre>

      <div className="max-w-4xl mx-auto">
        {/* 状态栏 */}
        <div className="border border-[#3d3529] p-2 mb-4">
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <span><span className="text-[#888]">玩家:</span> <span className="text-[#c9a227]">{playerData.name}</span></span>
            <span><span className="text-[#888]">职业:</span> {playerData.title}</span>
            <span><span className="text-[#888]">等级:</span> <span className="text-[#c9a227]">{playerData.level}</span></span>
            <span><span className="text-[#888]">位置:</span> {playerData.currentWorld}</span>
            <span><span className="text-[#888]">行动点:</span> <span className="text-[#4a9]">{playerData.actionPoints.current}</span>/{playerData.actionPoints.max}</span>
            <span><span className="text-[#888]">天数:</span> {dailyInfo.day}</span>
          </div>
        </div>

        {/* 资源显示 */}
        <TerminalSection title="RESOURCES">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <ResourceLine name="金币" value={resourcesData.gold} color="#c9a227" bar={true} max={5000} />
            <ResourceLine name="木材" value={resourcesData.wood} color="#8b6914" bar={true} max={1000} />
            <ResourceLine name="石材" value={resourcesData.stone} color="#888" bar={true} max={500} />
            <ResourceLine name="粮食" value={resourcesData.food} color="#a67c52" bar={true} max={1000} />
            <ResourceLine name="水晶" value={resourcesData.crystals} color="#9b59b6" bar={true} max={100} />
          </div>
        </TerminalSection>

        {/* 建筑列表 */}
        <TerminalSection title="BUILDINGS">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#c9a227] border-b border-[#3d3529]">
                <th className="text-left py-1">名称</th>
                <th className="text-left py-1">等级</th>
                <th className="text-left py-1">状态</th>
                <th className="text-left py-1">分配</th>
                <th className="text-left py-1">操作</th>
              </tr>
            </thead>
            <tbody>
              {buildingsData.map((b, i) => (
                <tr key={b.id} className={`border-b border-[#1a1814] hover:bg-[#1a1814] ${i % 2 === 0 ? 'bg-[#0f0f0c]' : ''}`}>
                  <td className="py-1">{b.icon} {b.name}</td>
                  <td className="py-1 text-[#c9a227]">{b.level}</td>
                  <td className="py-1">
                    <span className={b.status === "working" ? "text-[#4a9]" : b.status === "ready" ? "text-[#c9a227]" : "text-[#666]"}>
                      [{b.status === "working" ? "运作" : b.status === "ready" ? "就绪" : "空闲"}]
                    </span>
                  </td>
                  <td className="py-1 text-[#888]">{b.assignedChar || "-"}</td>
                  <td className="py-1">
                    <span className="text-[#c9a227] cursor-pointer hover:underline">[进入]</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-[#c9a227] cursor-pointer hover:underline">&gt; [B] 建造新建筑</div>
        </TerminalSection>

        {/* 角色列表 */}
        <TerminalSection title="CHARACTERS">
          <div className="space-y-1">
            {charactersData.map((c) => (
              <div key={c.id} className="flex items-center gap-4 py-1 hover:bg-[#1a1814] px-1">
                <span className="w-32 truncate">{c.portrait} {c.name}</span>
                <span className="w-16 text-[#888]">{c.class}</span>
                <span className="w-12 text-[#c9a227]">Lv.{c.level}</span>
                <span className="w-24">
                  <span className="text-[#888]">HP:</span>
                  <span className={c.hp === c.maxHp ? "text-[#4a9]" : "text-[#c9a227]"}> {c.hp}</span>
                  <span className="text-[#666]">/{c.maxHp}</span>
                </span>
                <span className={`w-16 ${c.status === "working" ? "text-[#4a9]" : "text-[#666]"}`}>
                  [{c.status === "working" ? "工作" : "待命"}]
                </span>
                <span className="text-[#c9a227] cursor-pointer hover:underline">[详情]</span>
              </div>
            ))}
          </div>
        </TerminalSection>

        {/* 任务列表 */}
        <TerminalSection title="QUESTS">
          {tasksData.map((t, i) => (
            <div key={t.id} className="py-1 px-1 hover:bg-[#1a1814]">
              <span className="text-[#c9a227]">{i + 1}.</span>{" "}
              <span className="font-bold">{t.title}</span>
              {t.status === "new" && <span className="text-[#c9a227] ml-2">[NEW]</span>}
              <span className="text-[#888] ml-4">
                | 类型: {t.type === "combat" ? "战斗" : t.type === "gather" ? "采集" : "事件"}
                | 地点: {t.world}
                | 奖励: <span className="text-[#c9a227]">{t.reward}</span>
              </span>
              <span className="text-[#4a9] ml-4 cursor-pointer hover:underline">[接受]</span>
            </div>
          ))}
        </TerminalSection>

        {/* 命令行输入 */}
        <div className="mt-4 border border-[#3d3529] p-2">
          <div className="flex items-center gap-2">
            <span className="text-[#c9a227]">&gt;</span>
            <input
              type="text"
              placeholder="输入命令 (help 查看帮助)..."
              className="flex-1 bg-transparent outline-none text-[#b8b0a0] placeholder-[#555]"
            />
          </div>
        </div>

        {/* 快捷命令 */}
        <div className="mt-2 text-xs text-[#666]">
          快捷键: [B]建造 [C]角色 [Q]任务 [E]探索 [I]背包 [M]地图 [H]帮助
        </div>
      </div>
    </div>
  );
}

function TerminalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[#c9a227] mb-1">
        ┌─ {title} ─{"─".repeat(Math.max(0, 50 - title.length))}┐
      </div>
      <div className="border-l border-r border-[#3d3529] px-2 py-1">
        {children}
      </div>
      <div className="text-[#3d3529]">
        └{"─".repeat(54)}┘
      </div>
    </div>
  );
}

function ResourceLine({ name, value, color, bar, max }: {
  name: string; value: number; color: string; bar?: boolean; max?: number
}) {
  const percent = bar && max ? Math.min((value / max) * 100, 100) : 0;
  const barLength = 10;
  const filled = Math.round((percent / 100) * barLength);

  return (
    <div className="text-xs">
      <span className="text-[#888]">{name}:</span>{" "}
      <span style={{ color }}>{value.toLocaleString()}</span>
      {bar && (
        <span className="text-[#3d3529] ml-1">
          [<span style={{ color }}>{"█".repeat(filled)}</span>{"░".repeat(barLength - filled)}]
        </span>
      )}
    </div>
  );
}
