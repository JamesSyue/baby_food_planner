import type {
  DailyCondition,
  FeedingRule,
  IngredientTrait,
  InventoryItem,
  MenuPlan,
  MenuPlanItem,
  SensitivityRecord,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

type RecommendationItem = {
  name: string;
  type: string;
  grams: number;
  specGrams: number;
  stockUnits: number;
};

type Recommendation = {
  title: string;
  condition: string;
  targetGrams: number;
  totalGrams: number;
  items: RecommendationItem[];
  warnings: string[];
};

type MenuPlanWithItems = MenuPlan & {
  items: MenuPlanItem[];
};

const emptyRecommendation: Recommendation = {
  title: "下一餐建議",
  condition: "尚未記錄",
  targetGrams: 185,
  totalGrams: 0,
  items: [],
  warnings: ["目前資料庫沒有種子資料。"],
};

function numericRule(rules: FeedingRule[], mealType: string, category: string, fallback: number) {
  const rule = rules.find((item) => item.mealType === mealType && item.category === category);
  return rule?.limitGrams ?? fallback;
}

function dailyConditionText(record?: DailyCondition | null) {
  if (!record) return "正常";
  return record.stoolCondition || record.coughPhlegm || record.appetite || "正常";
}

function isSuitableForCondition(trait: IngredientTrait | undefined, condition: string) {
  if (!trait || condition === "正常") return true;
  if (condition.includes("硬便") || condition.includes("山羊便")) {
    return ["是", "可少量"].includes(trait.forConstipation || "");
  }
  if (condition.includes("瀉") || condition.includes("軟便")) {
    return ["是", "可少量"].includes(trait.forDiarrhea || "");
  }
  if (condition.includes("痰") || condition.includes("咳嗽")) {
    return ["是", "可少量"].includes(trait.forPhlegm || "");
  }
  return true;
}

function buildRecommendation(
  inventory: InventoryItem[],
  traits: IngredientTrait[],
  rules: FeedingRule[],
  latestCondition?: DailyCondition | null,
): Recommendation {
  if (!inventory.length) return emptyRecommendation;

  const condition = dailyConditionText(latestCondition);
  const targetGrams = numericRule(rules, "早餐", "全部", 185);
  const starchLimit = numericRule(rules, "早餐", "澱粉", 60);
  const fruitLimit = numericRule(rules, "全日", "水果", 20);
  const proteinLimit = numericRule(rules, "全日", "蛋白質", 30);
  const traitMap = new Map(traits.map((item) => [item.ingredientName, item]));
  const warnings: string[] = [];

  const available = inventory
    .filter((item) => item.stockUnits > 0 && !["已用完", "暫停使用"].includes(item.status))
    .filter((item) => {
      const trait = traitMap.get(item.name);
      const allowed = isSuitableForCondition(trait, condition);
      if (!allowed) {
        warnings.push(`${item.name} 不符合目前狀況，已先排除。`);
      }
      return allowed;
    });

  const preferredOrder = ["澱粉", "蛋白質", "水果", "蔬菜", "蔬菜", "其他"];
  const picked: RecommendationItem[] = [];
  const totals = { 澱粉: 0, 水果: 0, 蛋白質: 0 };

  for (const category of preferredOrder) {
    const candidate = available.find(
      (item) => item.category === category && !picked.some((pickedItem) => pickedItem.name === item.name),
    );
    if (!candidate) continue;

    let grams = Math.min(candidate.specGrams, candidate.suggestionLimitGrams ?? candidate.specGrams);
    if (category === "澱粉") grams = Math.min(grams, starchLimit - totals.澱粉);
    if (category === "水果") grams = Math.min(grams, fruitLimit - totals.水果);
    if (category === "蛋白質") grams = Math.min(grams, Math.floor(proteinLimit / 2));
    if (grams <= 0) continue;

    picked.push({
      name: candidate.name,
      type: candidate.category,
      grams,
      specGrams: candidate.specGrams,
      stockUnits: candidate.stockUnits,
    });

    if (category === "澱粉") totals.澱粉 += grams;
    if (category === "水果") totals.水果 += grams;
    if (category === "蛋白質") totals.蛋白質 += grams;
  }

  const totalGrams = picked.reduce((sum, item) => sum + item.grams, 0);
  if (totalGrams < targetGrams) {
    warnings.push(`目前可排出的份量是 ${totalGrams}g，低於目標 ${targetGrams}g。`);
  }

  return {
    title: "下一餐建議",
    condition,
    targetGrams,
    totalGrams,
    items: picked,
    warnings,
  };
}

export async function getDashboardSnapshot() {
  try {
    const [inventory, traits, rules, sensitivityRecords, dailyConditions, menuPlans, movementCount] =
      await prisma.$transaction([
        prisma.inventoryItem.findMany({ orderBy: [{ updatedAt: "desc" }], take: 5 }),
        prisma.ingredientTrait.findMany({ orderBy: [{ ingredientName: "asc" }], take: 20 }),
        prisma.feedingRule.findMany({ orderBy: [{ code: "asc" }] }),
        prisma.sensitivityRecord.findMany({ orderBy: [{ recordedOn: "desc" }], take: 5 }),
        prisma.dailyCondition.findMany({ orderBy: [{ recordedOn: "desc" }], take: 5 }),
        prisma.menuPlan.findMany({
          orderBy: [{ planDate: "desc" }],
          take: 5,
          include: { items: { orderBy: [{ sortOrder: "asc" }] } },
        }),
        prisma.inventoryMovement.count(),
      ]);

    const recommendation = buildRecommendation(inventory, traits, rules, dailyConditions[0]);

    return {
      connected: true,
      message: "已讀取 MySQL 資料，可直接用作 Zeabur 版基礎骨架。",
      stats: [
        { label: "庫存食材", value: inventory.length, caption: "首頁顯示最新 5 筆庫存" },
        { label: "規則筆數", value: rules.length, caption: "含早餐/晚餐/全日限制" },
        { label: "菜單規劃", value: menuPlans.length, caption: "首頁顯示最近 5 筆計畫" },
        { label: "庫存異動", value: movementCount, caption: "資料表已準備好可接 CRUD" },
      ],
      inventory,
      sensitivityRecords,
      dailyConditions,
      menuPlans: menuPlans as MenuPlanWithItems[],
      recommendation,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown database error";

    return {
      connected: false,
      message: `資料庫尚未初始化：${message}`,
      stats: [
        { label: "庫存食材", value: 0, caption: "等待資料庫推 schema" },
        { label: "規則筆數", value: 0, caption: "等待 seed" },
        { label: "菜單規劃", value: 0, caption: "等待 seed" },
        { label: "庫存異動", value: 0, caption: "等待 seed" },
      ],
      inventory: [] as InventoryItem[],
      sensitivityRecords: [] as SensitivityRecord[],
      dailyConditions: [] as DailyCondition[],
      menuPlans: [] as MenuPlanWithItems[],
      recommendation: emptyRecommendation,
    };
  }
}

export async function getRecommendationSnapshot() {
  const snapshot = await getDashboardSnapshot();
  return snapshot.recommendation;
}