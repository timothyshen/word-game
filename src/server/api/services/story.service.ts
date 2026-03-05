/**
 * Story Service — story/chapter progression business logic
 */
import { TRPCError } from "@trpc/server";
import type { FullDbClient } from "../repositories/types";
import { findPlayerByUserId } from "../repositories/player.repo";
import {
  parseStoryChoices,
  parseRewards,
  resolveRewards,
  buildResourceUpdate,
} from "~/shared/effects";
import type { RewardEntry } from "~/shared/effects";

// ── Private types ──

interface StoryNodeData {
  id: string;
  nodeId: string;
  title: string;
  content: string;
  speaker: string | null;
  speakerIcon: string | null;
  nextNodeId: string | null;
  choicesJson: string | null;
  rewardsJson: string | null;
}

/** Legacy choice format from existing seed data */
interface LegacyChoice {
  text: string;
  nextNode: string;
  requirements?: Record<string, number>;
  rewards?: Record<string, number>;
}

/** Unified choice shape returned by parseNode */
interface ParsedChoice {
  text: string;
  nextNode: string;
  requirements?: Record<string, number>;
  rewards?: Record<string, number>;
  typedRewards?: RewardEntry[];
}

// ── Private helpers ──

async function getPlayerOrThrow(db: FullDbClient, userId: string) {
  const player = await findPlayerByUserId(db, userId);
  if (!player) throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  return player;
}

/**
 * Parse choices — try typed StoryChoice[] first, fallback to legacy format.
 * Returns a unified ParsedChoice[] for API compatibility.
 */
function parseChoices(json: string): ParsedChoice[] {
  const typed = parseStoryChoices(json);
  if (typed.length > 0) {
    return typed.map(c => ({
      text: c.text,
      nextNode: c.nextNodeId,
      typedRewards: c.rewards,
    }));
  }
  // Legacy format: [{ text, nextNode, requirements?, rewards? }]
  try {
    return JSON.parse(json) as LegacyChoice[];
  } catch {
    return [];
  }
}

/**
 * Parse rewards JSON — try typed RewardEntry[] first, fallback to legacy Record<string,number>.
 * Returns both shapes for API compat + internal typed processing.
 */
function parseRewardsCompat(json: string): { legacy: Record<string, number>; typed: RewardEntry[] } {
  const typed = parseRewards(json);
  if (typed.length > 0) {
    const grant = resolveRewards(typed);
    return { legacy: grant.resourcesGranted, typed };
  }
  // Legacy format: { gold: 100, exp: 50, ... }
  try {
    const legacy = JSON.parse(json) as Record<string, number>;
    return { legacy, typed: [] };
  } catch {
    return { legacy: {}, typed: [] };
  }
}

function parseNode(node: StoryNodeData) {
  const choices = node.choicesJson ? parseChoices(node.choicesJson) : undefined;
  const rewardsData = node.rewardsJson ? parseRewardsCompat(node.rewardsJson) : undefined;
  return {
    id: node.nodeId,
    title: node.title,
    content: node.content,
    speaker: node.speaker ?? undefined,
    speakerIcon: node.speakerIcon ?? undefined,
    nextNode: node.nextNodeId ?? undefined,
    choices,
    rewards: rewardsData?.legacy,
  };
}

// ── Exported service functions ──

export async function getChapters(db: FullDbClient, userId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { storyProgress: true },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const completedStories = new Set(
    player.storyProgress.filter(p => p.completed).map(p => p.storyId)
  );

  const chapters = await db.storyChapter.findMany({
    where: { isActive: true },
    include: { nodes: true },
    orderBy: { order: "asc" },
  });

  return chapters.map(chapter => ({
    id: chapter.id,
    title: chapter.title,
    description: chapter.description,
    isCompleted: completedStories.has(chapter.id),
    nodeCount: chapter.nodes.length,
    rewards: parseRewardsCompat(chapter.rewardsJson).legacy,
  }));
}

export async function getCurrentNode(db: FullDbClient, userId: string, chapterId: string) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { storyProgress: true },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const chapter = await db.storyChapter.findUnique({
    where: { id: chapterId },
    include: { nodes: { orderBy: { order: "asc" } } },
  });

  if (!chapter) {
    throw new TRPCError({ code: "NOT_FOUND", message: "章节不存在" });
  }

  const progress = player.storyProgress.find(p => p.storyId === chapterId);

  if (progress?.completed) {
    return { completed: true, node: null };
  }

  const choices = progress?.choices ? JSON.parse(progress.choices) as string[] : [];
  const currentNodeId = choices.length > 0
    ? choices[choices.length - 1]
    : chapter.nodes[0]?.nodeId;

  const nodeData = chapter.nodes.find(n => n.nodeId === currentNodeId);
  const firstNode = chapter.nodes[0];

  return {
    completed: false,
    node: nodeData ? parseNode(nodeData) : (firstNode ? parseNode(firstNode) : null),
    progress: choices.length,
    totalNodes: chapter.nodes.length,
  };
}

export async function advanceStory(
  db: FullDbClient,
  userId: string,
  chapterId: string,
  choiceIndex?: number,
) {
  const player = await db.player.findUnique({
    where: { userId },
    include: { storyProgress: true },
  });

  if (!player) {
    throw new TRPCError({ code: "NOT_FOUND", message: "玩家不存在" });
  }

  const chapter = await db.storyChapter.findUnique({
    where: { id: chapterId },
    include: { nodes: { orderBy: { order: "asc" } } },
  });

  if (!chapter) {
    throw new TRPCError({ code: "NOT_FOUND", message: "章节不存在" });
  }

  const progress = player.storyProgress.find(p => p.storyId === chapterId);
  const choices = progress?.choices ? JSON.parse(progress.choices) as string[] : [];

  // 获取当前节点
  const currentNodeId = choices.length > 0
    ? choices[choices.length - 1]
    : chapter.nodes[0]?.nodeId;

  const currentNodeData = chapter.nodes.find(n => n.nodeId === currentNodeId);
  if (!currentNodeData) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "节点不存在" });
  }

  const currentNode = parseNode(currentNodeData);

  // 确定下一个节点
  let nextNodeId: string | undefined;
  let rewards: Record<string, number> = {};

  if (currentNode.choices && choiceIndex !== undefined) {
    const choice = currentNode.choices[choiceIndex];
    if (!choice) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "无效的选择" });
    }
    nextNodeId = choice.nextNode;
    if (choice.rewards) {
      rewards = choice.rewards;
    }
  } else {
    nextNodeId = currentNode.nextNode;
  }

  // 更新进度
  if (nextNodeId) {
    choices.push(nextNodeId);
  }

  // 检查是否完成章节
  const nextNodeData = chapter.nodes.find(n => n.nodeId === nextNodeId);
  const nextNode = nextNodeData ? parseNode(nextNodeData) : undefined;
  const isCompleted = !nextNode || (!nextNode.nextNode && !nextNode.choices);

  if (progress) {
    await db.storyProgress.update({
      where: { id: progress.id },
      data: {
        choices: JSON.stringify(choices),
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  } else {
    await db.storyProgress.create({
      data: {
        playerId: player.id,
        storyId: chapterId,
        choices: JSON.stringify(choices),
        completed: isCompleted,
        completedAt: isCompleted ? new Date() : null,
      },
    });
  }

  // 发放奖励
  const chapterRewardsData = parseRewardsCompat(chapter.rewardsJson);
  if (Object.keys(rewards).length > 0 || isCompleted) {
    const finalRewards = isCompleted
      ? { ...rewards, ...chapterRewardsData.legacy }
      : rewards;

    const resourceUpdate = buildResourceUpdate(finalRewards, player as unknown as Record<string, number>);
    if (Object.keys(resourceUpdate).length > 0) {
      await db.player.update({
        where: { id: player.id },
        data: resourceUpdate,
      });
    }
  }

  return {
    advanced: true,
    nextNode,
    isCompleted,
    rewards: isCompleted ? chapterRewardsData.legacy : rewards,
  };
}
