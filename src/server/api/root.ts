import { postRouter } from "~/server/api/routers/post";
import { playerRouter } from "~/server/api/routers/player";
import { settlementRouter } from "~/server/api/routers/settlement";
import { cardRouter } from "~/server/api/routers/card";
import { buildingRouter } from "~/server/api/routers/building";
import { explorationRouter } from "~/server/api/routers/exploration";
import { combatRouter } from "~/server/api/routers/combat";
import { altarRouter } from "~/server/api/routers/altar";
import { equipmentRouter } from "~/server/api/routers/equipment";
import { breakthroughRouter } from "~/server/api/routers/breakthrough";
import { professionRouter } from "~/server/api/routers/profession";
import { portalRouter } from "~/server/api/routers/portal";
import { storyRouter } from "~/server/api/routers/story";
import { bossRouter } from "~/server/api/routers/boss";
import { territoryRouter } from "~/server/api/routers/territory";
import { characterRouter } from "~/server/api/routers/character";
import { shopRouter } from "~/server/api/routers/shop";
import { achievementRouter } from "~/server/api/routers/achievement";
import { adminRouter } from "~/server/api/routers/admin";
import { authRouter } from "~/server/api/routers/auth";
import { innerCityRouter } from "~/server/api/routers/innerCity";
import { outerCityRouter } from "~/server/api/routers/outerCity";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
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
