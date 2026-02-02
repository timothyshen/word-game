export const STAT_OPTIONS = [
  { value: "attack", label: "攻击" },
  { value: "defense", label: "防御" },
  { value: "speed", label: "速度" },
  { value: "luck", label: "幸运" },
  { value: "hp", label: "生命" },
  { value: "maxHp", label: "最大生命" },
  { value: "mp", label: "魔力" },
  { value: "maxMp", label: "最大魔力" },
  { value: "intellect", label: "智力" },
  { value: "strength", label: "力量" },
  { value: "agility", label: "敏捷" },
  { value: "gold", label: "金币" },
  { value: "crystals", label: "水晶" },
  { value: "food", label: "粮食" },
  { value: "wood", label: "木材" },
  { value: "stone", label: "石材" },
  { value: "iron", label: "铁矿" },
  { value: "exp", label: "经验" },
  { value: "critRate", label: "暴击率" },
  { value: "critDamage", label: "暴击伤害" },
  { value: "lifesteal", label: "吸血" },
  { value: "damageReduction", label: "减伤" },
  { value: "productionSpeed", label: "生产速度" },
  { value: "craftingQuality", label: "制造品质" },
] as const;

export function statLabel(key: string): string {
  return STAT_OPTIONS.find(s => s.value === key)?.label ?? key;
}

export const inputCls = "w-full p-1.5 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none text-sm";
export const selectCls = "p-1.5 bg-[#1a1a20] border border-[#2a2a30] focus:border-[#c9a227] outline-none text-sm";
export const removeBtnCls = "px-2 py-1 text-xs bg-[#e74c3c]/20 hover:bg-[#e74c3c]/40 text-[#e74c3c] shrink-0";
export const addBtnCls = "px-3 py-1.5 text-sm bg-[#2a2a30] hover:bg-[#3a3a40] text-[#c9a227] border border-dashed border-[#2a2a30] w-full";
export const paramBtnCls = "px-2 py-1 text-xs bg-[#2a2a30] hover:bg-[#3a3a40] text-[#c9a227] border border-dashed border-[#2a2a30] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#2a2a30]";
