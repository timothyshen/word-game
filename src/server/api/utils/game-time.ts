/**
 * 游戏时间工具函数
 * 统一管理游戏日期和时间相关的计算
 */

// 游戏开始日期（2024-01-01作为第1天）
const GAME_START_DATE = new Date("2024-01-01T00:00:00Z");
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * 获取当前游戏天数
 * @returns 从游戏开始到现在的天数（从1开始）
 */
export function getCurrentGameDay(): number {
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - GAME_START_DATE.getTime()) / MS_PER_DAY);
  return daysPassed + 1;
}

/**
 * 获取今天的日期字符串（用于每日重置判断）
 * @returns YYYY-MM-DD 格式的日期字符串
 */
export function getTodayString(): string {
  return new Date().toISOString().split("T")[0]!;
}

/**
 * 获取本周开始日期（周一）
 * @returns 本周周一的日期对象
 */
export function getWeekStartDate(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日算上周
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/**
 * 获取本周的周数标识（用于周重置判断）
 * @returns YYYY-WW 格式的周标识
 */
export function getWeekString(): string {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / MS_PER_DAY);
  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${weekNumber.toString().padStart(2, "0")}`;
}
