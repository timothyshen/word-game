/**
 * Hook for checking which game systems are unlocked for the current player.
 * Uses the unlockedSystems array from player.getStatus.
 */

const ALWAYS_UNLOCKED = new Set([
  "exploration",
  "character_list",
  "log",
  "settings",
]);

const FLAG_TO_SYSTEMS: Record<string, string[]> = {
  combat_system: ["combat"],
  building_system: ["economy", "inner_city"],
  recruit_system: ["character_detail"],
  shop_system: ["shop"],
  altar_system: ["altar"],
  portal_system: ["portal"],
  equipment_system: ["equipment"],
  card_system: ["backpack"],
  progression_system: ["progression"],
  boss_system: ["boss"],
};

export function useUnlocks(unlockedSystems: string[] | undefined) {
  const flags = new Set(unlockedSystems ?? []);

  const unlocked = new Set(ALWAYS_UNLOCKED);
  for (const [flag, systems] of Object.entries(FLAG_TO_SYSTEMS)) {
    if (flags.has(flag)) {
      for (const sys of systems) unlocked.add(sys);
    }
  }

  return {
    has: (system: string) => unlocked.has(system),
    flags,
    all: unlocked,
  };
}
