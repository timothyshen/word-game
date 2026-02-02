"use client";

import { useState } from "react";
import type { BuildingEffects, BuildingProduction, StatKey } from "~/shared/effects";
import { StatModifierEditor } from "./StatModifierEditor";
import { STAT_OPTIONS, inputCls, selectCls, removeBtnCls, addBtnCls } from "./shared";

export function BuildingEffectEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [effects, setEffects] = useState<BuildingEffects>(() => {
    try { return JSON.parse(defaultValue) as BuildingEffects; } catch { return {}; }
  });

  const update = (patch: Partial<BuildingEffects>) => setEffects(prev => ({ ...prev, ...patch }));

  const production = effects.production ?? [];
  const updateProd = (idx: number, field: string, val: unknown) => {
    const next = [...production];
    next[idx] = { ...next[idx]!, [field]: val };
    update({ production: next });
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(effects)} />

      {/* 产出 */}
      <div>
        <label className="block text-xs text-[#888] mb-1">每日产出</label>
        <div className="space-y-2">
          {production.map((p, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select value={p.stat} onChange={e => updateProd(i, "stat", e.target.value)} className={selectCls + " flex-1"}>
                {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="number" value={p.amountPerHour} onChange={e => updateProd(i, "amountPerHour", Number(e.target.value))} className={inputCls + " w-24"} placeholder="产量" />
              <button type="button" onClick={() => update({ production: production.filter((_, j) => j !== i) })} className={removeBtnCls}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => update({ production: [...production, { stat: "gold" as StatKey, amountPerHour: 10 }] })} className={addBtnCls}>+ 添加产出</button>
        </div>
      </div>

      {/* 属性加成 */}
      <div>
        <label className="block text-xs text-[#888] mb-1">属性加成</label>
        <StatModifierEditor value={effects.statBonuses ?? []} onChange={mods => update({ statBonuses: mods })} />
      </div>

      {/* 数值设置 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-[#888] mb-1">工人产出倍率</label>
          <input type="number" value={effects.workerMultiplier ?? 1.5} onChange={e => update({ workerMultiplier: Number(e.target.value) })} step="0.1" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">升级费用倍率</label>
          <input type="number" value={effects.upgradeCostMultiplier ?? 1} onChange={e => update({ upgradeCostMultiplier: Number(e.target.value) })} step="0.1" className={inputCls} />
        </div>
      </div>
    </div>
  );
}
