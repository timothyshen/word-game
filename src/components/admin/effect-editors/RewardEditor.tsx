"use client";

import { useState } from "react";
import type { RewardEntry, StatKey } from "~/shared/effects";
import { STAT_OPTIONS, inputCls, selectCls, removeBtnCls, addBtnCls } from "./shared";

interface Props {
  value: RewardEntry[];
  onChange: (rewards: RewardEntry[]) => void;
}

export function RewardEditor({ value, onChange }: Props) {
  const items = value ?? [];
  const update = (idx: number, entry: RewardEntry) => {
    const next = [...items];
    next[idx] = entry;
    onChange(next);
  };

  const add = () => onChange([...items, { type: "resource", stat: "gold" as StatKey, amount: 0 }]);
  const remove = (idx: number) => onChange(items.filter((_, i) => i !== idx));

  const changeType = (idx: number, newType: string) => {
    if (newType === "resource") update(idx, { type: "resource", stat: "gold" as StatKey, amount: 0 });
    else if (newType === "card") update(idx, { type: "card", rarity: "普通", count: 1 });
    else update(idx, { type: "item", itemId: "", count: 1 });
  };

  return (
    <div className="space-y-2">
      {items.map((r, i) => (
        <div key={i} className="flex gap-2 items-center flex-wrap">
          <select value={r.type} onChange={e => changeType(i, e.target.value)} className={selectCls + " w-24"}>
            <option value="resource">资源</option>
            <option value="card">卡牌</option>
            <option value="item">物品</option>
          </select>
          {r.type === "resource" && (
            <>
              <select value={r.stat} onChange={e => update(i, { ...r, stat: e.target.value as StatKey })} className={selectCls + " flex-1"}>
                {STAT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input type="number" value={r.amount} onChange={e => update(i, { ...r, amount: Number(e.target.value) })} className={inputCls + " w-20"} />
            </>
          )}
          {r.type === "card" && (
            <>
              <select value={r.rarity} onChange={e => update(i, { ...r, rarity: e.target.value })} className={selectCls + " flex-1"}>
                {["普通", "精良", "稀有", "史诗", "传说"].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <input type="number" value={r.count} onChange={e => update(i, { ...r, count: Number(e.target.value) })} className={inputCls + " w-16"} min={1} />
            </>
          )}
          {r.type === "item" && (
            <>
              <input value={r.itemId} onChange={e => update(i, { ...r, itemId: e.target.value })} placeholder="物品ID" className={inputCls + " flex-1"} />
              <input type="number" value={r.count} onChange={e => update(i, { ...r, count: Number(e.target.value) })} className={inputCls + " w-16"} min={1} />
            </>
          )}
          <button type="button" onClick={() => remove(i)} className={removeBtnCls}>×</button>
        </div>
      ))}
      <button type="button" onClick={add} className={addBtnCls}>+ 添加奖励</button>
    </div>
  );
}

export function RewardField({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [items, setItems] = useState<RewardEntry[]>(() => {
    try {
      const parsed = JSON.parse(defaultValue);
      return Array.isArray(parsed) ? parsed as RewardEntry[] : [];
    } catch { return []; }
  });
  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(items)} />
      <RewardEditor value={items} onChange={setItems} />
    </div>
  );
}
