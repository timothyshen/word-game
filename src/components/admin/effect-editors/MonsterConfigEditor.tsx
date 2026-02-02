"use client";

import { useState } from "react";
import type { MonsterConfig, MonsterSkill, StatKey } from "~/shared/effects";
import { SkillEffectEditor } from "./SkillEffectEditor";
import { RewardEditor } from "./RewardEditor";
import { inputCls, removeBtnCls, addBtnCls } from "./shared";

const defaultMonster: MonsterConfig = {
  name: "", icon: "👹", level: 1, hp: 100, attack: 10, defense: 5, speed: 8,
  skills: [], rewards: [{ type: "resource", stat: "gold" as StatKey, amount: 50 }],
};

export function MonsterConfigEditor({ name, defaultValue }: { name: string; defaultValue: string }) {
  const [monster, setMonster] = useState<MonsterConfig>(() => {
    try {
      const p = JSON.parse(defaultValue) as MonsterConfig;
      return p?.name ? p : defaultMonster;
    } catch { return defaultMonster; }
  });

  const update = (patch: Partial<MonsterConfig>) => setMonster(prev => ({ ...prev, ...patch }));

  const updateSkill = (idx: number, skill: MonsterSkill) => {
    const next = [...monster.skills];
    next[idx] = skill;
    update({ skills: next });
  };

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(monster)} />

      <div className="grid grid-cols-4 gap-2">
        <div className="col-span-2">
          <label className="block text-xs text-[#888] mb-1">名称</label>
          <input value={monster.name} onChange={e => update({ name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">图标</label>
          <input value={monster.icon} onChange={e => update({ icon: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-[#888] mb-1">等级</label>
          <input type="number" value={monster.level} onChange={e => update({ level: Number(e.target.value) })} className={inputCls} min={1} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {(["hp", "attack", "defense", "speed"] as const).map(stat => (
          <div key={stat}>
            <label className="block text-xs text-[#888] mb-1">{{ hp: "生命", attack: "攻击", defense: "防御", speed: "速度" }[stat]}</label>
            <input type="number" value={monster[stat]} onChange={e => update({ [stat]: Number(e.target.value) })} className={inputCls} />
          </div>
        ))}
      </div>

      <div>
        <label className="block text-xs text-[#888] mb-2">技能</label>
        {monster.skills.map((skill, i) => (
          <div key={i} className="border border-[#2a2a30] p-3 mb-2 space-y-2">
            <div className="flex gap-2 items-center">
              <input value={skill.name} onChange={e => updateSkill(i, { ...skill, name: e.target.value })} placeholder="技能名" className={inputCls + " flex-1"} />
              <span className="text-xs text-[#888]">冷却</span>
              <input type="number" value={skill.cooldown} onChange={e => updateSkill(i, { ...skill, cooldown: Number(e.target.value) })} className={inputCls + " w-16"} min={0} />
              <button type="button" onClick={() => update({ skills: monster.skills.filter((_, j) => j !== i) })} className={removeBtnCls}>×</button>
            </div>
            <SkillEffectEditor value={skill.effects} onChange={effs => updateSkill(i, { ...skill, effects: effs })} />
          </div>
        ))}
        <button type="button" onClick={() => update({ skills: [...monster.skills, { name: "", effects: [], cooldown: 0 }] })} className={addBtnCls}>+ 添加技能</button>
      </div>

      <div>
        <label className="block text-xs text-[#888] mb-2">奖励</label>
        <RewardEditor value={monster.rewards} onChange={rewards => update({ rewards })} />
      </div>
    </div>
  );
}
