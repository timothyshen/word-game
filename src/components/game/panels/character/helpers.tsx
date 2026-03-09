// 角色Hub辅助组件

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[#c9a227] text-sm font-bold flex items-center gap-2">
      <span className="text-[#2a3a4a]" aria-hidden="true">▸</span>
      {children}
    </h3>
  );
}

export function StatBar({ label, current, max, color }: { label: string; current: number; max: number; color: string }) {
  const percent = (current / max) * 100;
  const barLength = 8;
  const filled = Math.round((percent / 100) * barLength);

  return (
    <div className="bg-[#0a0a15] p-2">
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[#888]">{label}</span>
        <span style={{ color }}>{current}/{max}</span>
      </div>
      <div className="font-mono text-xs">
        <span className="text-[#2a3a4a]">[</span>
        <span style={{ color }}>{"█".repeat(filled)}</span>
        <span className="text-[#2a3a4a]">{"░".repeat(barLength - filled)}</span>
        <span className="text-[#2a3a4a]">]</span>
      </div>
    </div>
  );
}

export function StatBlock({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="bg-[#0a0a15] p-2 text-center">
      <div className="text-lg">{icon}</div>
      <div className="text-xs text-[#888]">{label}</div>
      <div className="text-[#c9a227] font-bold">{value}</div>
    </div>
  );
}
