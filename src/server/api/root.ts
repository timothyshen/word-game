import { playerRouter, authRouter, settlementRouter } from "~/server/api/routers/core";
import { combatRouter, bossRouter } from "~/server/api/routers/combat";
import { buildingRouter, shopRouter, equipmentRouter, altarRouter } from "~/server/api/routers/economy";
import { cardRouter, breakthroughRouter, professionRouter, achievementRouter } from "~/server/api/routers/progression";
import { explorationRouter } from "~/server/api/routers/exploration";
import { innerCityRouter, territoryRouter, portalRouter } from "~/server/api/routers/territory";
import { storyRouter, characterRouter } from "~/server/api/routers/content";
import { adminRouter } from "~/server/api/routers/admin";
import { outerCityRouter } from "~/server/api/routers/outerCity";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  player: playerRouter,
  settlement: settlementRouter,
  card: cardRouter,
  building: buildingRouter,
  exploration: explorationRouter,
  combat: combatRouter,
  altar: altarRouter,
  equipment: equipmentRouter,
  breakthrough: breakthroughRouter,
  profession: professionRouter,
  portal: portalRouter,
  story: storyRouter,
  boss: bossRouter,
  territory: territoryRouter,
  character: characterRouter,
  shop: shopRouter,
  achievement: achievementRouter,
  admin: adminRouter,
  auth: authRouter,
  innerCity: innerCityRouter,
  outerCity: outerCityRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
