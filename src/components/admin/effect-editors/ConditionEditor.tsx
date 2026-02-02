"use client";

import { useState } from "react";
import type { Condition, StatKey } from "~/shared/effects";
import { STAT_OPTIONS, inputCls, selectCls, removeBtnCls, addBtnCls } from "./shared";

interface Props {
  value: Condition[];
  onChange: (conds: Condition[]) => void;
}

const CONDITION_TYPES = [
  { value: "level", label: "等级" },
  { value: "tier", label: "阶级" },
  { value: "stat", label: "属性" },
  { value: "skill", label: "技能" },
  { value: "skillCount", label: "技能数量" },
  { value: "item", label: "物品" },
  { value: "flag", label: "标记" },
];

function defaultCondition(type: string): Condition {
  switch (type) {
    case "level": return { type: "level", min: 1 };
    case "tier": return { type: "tier", min: 1 };
    case "stat": return { type: "stat", stat: "attack" as StatKey, min: 0 };
    case "skill": return { type: "skill", category: "", minLevel: 1 };
    case "skillCount": return { type: "skillCount", skillType: "", count: 1 };
    case "item": return { type: "item", itemId: "", count: 1 };
    case "flag": return { type: "flag", flagName: "" };
    default: return { type: "level", min: 1 };
  }
}

export function ConditionEditor({ value, onChange }: Props) {
  const update = (idx: number, cond: Condition) => {
    const next = [...value];
    next[idx] = cond;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {value.map((c, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <select value={c.type} onChange={e => update(i, defaultCondition(e.target.value))} className={selectCls + " w-28"}>
            {CONDITION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          {c.type === "level" && (
            <input type="number" value={c.min} onChange={e => update(i, { ...c, min: Number(e.target.value) })} placeholder="最低等级" className={inputCls + " w-24"} />
          )}
          {c.type === "tier" && (
            <input type="number" value={c.min} onChange={e => update(i, { ...c, min: Number(e.target.value) })} placeholder="最低阶级" className={inputCls + " w-24"} />
          )}
          {c.type === "stat" && (
            <>
              <select value={c.stat} onChange={e => update(i, { ...c, stat: e.target.value as StatKey })} className={selectCls + " flex-1"}>
                {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="number" value={c.min} onChange={e => update(i, { ...c, min: Number(e.target.value) })} className={inputCls + " w-20"} />
            </>
          )}
          {c.type === "skill" && (
            <>
              <input value={c.category} onChange={e => update(i, { ...c, category: e.target.value })} placeholder="技能类别" className={inputCls + " flex-1"} />
              <input type="number" value={c.minLevel} onChange={e => update(i, { ...c, minLevel: Number(e.target.value) })} placeholder="最低等级" className={inputCls + " w-20"} />
            </>
          )}
          {c.type === "skillCount" && (
            <>
              <input value={c.skillType} onChange={e => update(i, { ...c, skillType: e.target.value })} placeholder="技能类型" className={inputCls + " flex-1"} />
              <input type="number" value={c.count} onChange={e => update(i, { ...c, count: Number(e.target.value) })} placeholder="需要数量" className={inputCls + " w-20"} />
            </>
          )}
          {c.type === "item" && (
            <>
              <input value={c.itemId} onChange={e => update(i, { ...c, itemId: e.target.value })} placeholder="物品ID" className={inputCls + " flex-1"} />
              <input type="number" value={c.count ?? 1} onChange={e => update(i, { ...c, count: Number(e.target.value) })} className={inputCls + " w-20"} />
            </>
          )}
          {c.type === "flag" && (
            <input value={c.flagName} onChange={e => update(i, { ...c, flagName: e.target.value })} placeholder="标记名称" className={inputCls + " flex-1"} />
          )}
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className={removeBtnCls}>×</button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { type: "level", min: 1 }])} className={addBtnCls}>+ 添加条件</button>
    </div>
  );
}

export function ConditionField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [items, setItems] = useState<Condition[]>(() => {
    try { return JSON.parse(defaultValue) as Condition[]; } catch { return []; }
  });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <ConditionEditor value={items} onChange={setItems} />
    </div>
  );
}
