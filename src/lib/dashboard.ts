import type { FeedingRule, InventoryItem, SensitivityRecord } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function getDashboardSnapshot() {
  try {
    const [inventory, inventoryCount, rules, sensitivityRecords] =
      await prisma.$transaction([
        prisma.inventoryItem.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "desc" }] }),
        prisma.inventoryItem.count(),
        prisma.feedingRule.findMany({ orderBy: [{ code: "asc" }] }),
        prisma.sensitivityRecord.findMany({ orderBy: [{ recordedOn: "desc" }, { id: "desc" }] }),
      ]);

    return {
      connected: true,
      message: "已讀取 MySQL 資料，可直接用作 Zeabur 版基礎骨架。",
      stats: [
        { label: "庫存食材", value: inventoryCount, caption: "顯示全部庫存筆數" },
        { label: "規則筆數", value: rules.length, caption: "含早餐/晚餐/全日限制" },
        { label: "試敏紀錄", value: sensitivityRecords.length, caption: "首頁顯示全部試敏紀錄" },
      ],
      inventory,
      rules,
      sensitivityRecords,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return {
      connected: false,
      message: `資料庫尚未初始化：${message}`,
      stats: [
        { label: "庫存食材", value: 0, caption: "等待資料庫推 schema" },
        { label: "規則筆數", value: 0, caption: "等待 seed" },
        { label: "試敏紀錄", value: 0, caption: "等待 seed" },
      ],
      inventory: [] as InventoryItem[],
      rules: [] as FeedingRule[],
      sensitivityRecords: [] as SensitivityRecord[],
    };
  }
}

export async function getRecommendationSnapshot() {
  return {
    title: "下一餐建議",
    condition: "首頁已移除",
    targetGrams: 0,
    totalGrams: 0,
    items: [],
    warnings: ["首頁已移除下一餐建議區塊，如需恢復可再接回推薦邏輯。"],
  };
}