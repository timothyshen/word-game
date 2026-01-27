// 外城系统 - 合并路由

import { createTRPCRouter } from "~/server/api/trpc";
import { heroesRouter } from "./heroes";
import { mapRouter } from "./map";
import { poiRouter } from "./poi";
import { combatRouter } from "./combat";

// 导出子路由供直接使用
export { heroesRouter, mapRouter, poiRouter, combatRouter };
export * from "./helpers";

// 合并为outerCityRouter，保持向后兼容
export const outerCityRouter = createTRPCRouter({
  // 地图相关
  getStatus: mapRouter.getStatus,
  moveHero: mapRouter.moveHero,
  getVisibleMap: mapRouter.getVisibleMap,

  // 英雄管理
  deployHero: heroesRouter.deploy,
  recallHero: heroesRouter.recall,
  restHero: heroesRouter.rest,

  // POI互动
  interactPOI: poiRouter.interact,
  harvestResource: poiRouter.harvest,
  refreshResources: poiRouter.refreshResources,

  // 战斗系统
  startCombat: combatRouter.start,
  combatAction: combatRouter.action,
});
