"use client";

import { useState } from "react";
import type { SkillLevelEntry } from "~/shared/effects";
import { SkillEffectEditor } from "./SkillEffectEditor";
import { inputCls, removeBtnCls, addBtnCls } from "./shared";

export function SkillLevelEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [levels, setLevels] = useState<SkillLevelEntry[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((e: Record<string, unknown>) => ({
        level: (e.level as number) ?? 1,
        effects: Array.isArray(e.effects) ? e.effects : [],
        mpCost: (e.mpCost as number) ?? 0,
        cooldown: (e.cooldown as number) ?? 0,
      })) as SkillLevelEntry[];
    } catch { return []; }
  });

  const update = (idx: number, entry: SkillLevelEntry) => {
    const next = [...levels];
    next[idx] = entry;
    setLevels(next);
  };

  const add = () => {
    const nextLevel = levels.length > 0 ? Math.max(...levels.map(l => l.level)) + 1 : 1;
    setLevels([...levels, { level: nextLevel, effects: [], mpCost: 0, cooldown: 0 }]);
  };

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(levels)} />
      {levels.map((entry, i) => (
        <div key={i} className="border border-[#2a2a30] p-3 space-y-2">
          <div className="flex gap-2 items-center">
            <span className="text-xs text-[#888]">等级</span>
            <input type="number" value={entry.level} onChange={e => update(i, { ...entry, level: Number(e.target.value) })} className={inputCls + " w-16"} min={1} />
            <span className="text-xs text-[#888]">MP消耗</span>
            <input type="number" value={entry.mpCost} onChange={e => update(i, { ...entry, mpCost: Number(e.target.value) })} className={inputCls + " w-16"} min={0} />
            <span className="text-xs text-[#888]">冷却</span>
            <input type="number" value={entry.cooldown} onChange={e => update(i, { ...entry, cooldown: Number(e.target.value) })} className={inputCls + " w-16"} min={0} />
            <button type="button" onClick={() => setLevels(levels.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
          </div>
          <SkillEffectEditor value={entry.effects} onChange={effs => update(i, { ...entry, effects: effs })} />
        </div>
      ))}
      <button type="button" onClick={add} className={addBtnCls}>+ 添加等级</button>
    </div>
  );
}
