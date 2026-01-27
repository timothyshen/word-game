// 外城系统共享工具函数

import type { PrismaClient } from "../../../../../generated/prisma";

// ===== 内外城联动：获取内城建筑加成 =====
export interface CityBonuses {
  attackBonus: number;   // 攻击力加成百分比 (兵营)
  defenseBonus: number;  // 防御力加成百分比 (铁匠铺)
  tradeBonus: number;    // 交易加成百分比 (市场)
  staminaBonus: number;  // 体力恢复加成 (农田)
}

export async function getInnerCityBonuses(db: PrismaClient, playerId: string): Promise<CityBonuses> {
  const buildings = await db.innerCityBuilding.findMany({
    where: { playerId },
    include: { template: true },
  });

  let attackBonus = 0;
  let defenseBonus = 0;
  let tradeBonus = 0;
  let staminaBonus = 0;

  for (const building of buildings) {
    const templateName = building.template.name;
    const level = building.level;

    switch (templateName) {
      case "兵营":
        // 每级增加10%攻击力
        attackBonus += level * 0.1;
        break;
      case "铁匠铺":
        // 每级增加5%防御力
        defenseBonus += level * 0.05;
        break;
      case "市场":
        // 每级增加15%交易收益
        tradeBonus += level * 0.15;
        break;
      case "农田":
        // 每级增加10体力恢复
        staminaBonus += level * 10;
        break;
    }
  }

  return { attackBonus, defenseBonus, tradeBonus, staminaBonus };
}
