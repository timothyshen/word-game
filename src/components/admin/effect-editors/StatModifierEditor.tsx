"use client";

import { useState } from "react";
import type { StatModifier, StatKey } from "~/shared/effects";
import { STAT_OPTIONS, inputCls, selectCls, removeBtnCls, addBtnCls } from "./shared";

interface Props {
  value: StatModifier[];
  onChange: (mods: StatModifier[]) => void;
}

export function StatModifierEditor({ value, onChange }: Props) {
  const items = value ?? [];
  const update = (idx: number, field: string, val: unknown) => {
    const next = [...items];
    next[idx] = { ...next[idx]!, [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((mod, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select value={mod.stat} onChange={e => update(i, "stat", e.target.value)} className={selectCls + " flex-1"}>
            {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <input type="number" value={mod.value} onChange={e => update(i, "value", Number(e.target.value))} className={inputCls + " w-20"} step="any" />
          <select value={mod.type} onChange={e => update(i, "type", e.target.value)} className={selectCls + " w-24"}>
            <option value="flat">固定</option>
            <option value="percent">百分比</option>
          </select>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { stat: "attack" as StatKey, value: 0, type: "flat" }])} className={addBtnCls}>+ 添加修改器</button>
    </div>
  );
}

/** Form-integrated wrapper: hidden input + visual editor */
export function StatModifierField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [items, setItems] = useState<StatModifier[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue);
      return Array.isArray(parsed) ? parsed as StatModifier[] : [];
    } catch { return []; }
  });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <StatModifierEditor value={items} onChange={setItems} />
    </div>
  );
}
