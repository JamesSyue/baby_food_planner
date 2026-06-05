import { prisma } from "@/lib/prisma";

export type MenuRecommendationResult = {
  overview: string;
  menus: Array<{
    day: string;
    mealType: string;
    menuName: string;
    ingredients: Array<{
      name: string;
      category: string;
      grams: number;
      note: string;
    }>;
    totalGrams: number;
    reason: string;
    cautions: string[];
  }>;
  notes: string[];
};

export type IngredientTraitSuggestion = {
  ingredientName: string;
  primaryType: string;
  solubleFiber: string | null;
  insolubleFiber: string | null;
  fiberLevel: string | null;
  easyGas: string | null;
  forConstipation: string | null;
  forDiarrhea: string | null;
  forPhlegm: string | null;
  sensitivity: string | null;
  adverseNotes: string | null;
  nutritionNotes: string | null;
};

type GeminiCandidate = {
  content?: {
    parts?: Array<{
      text?: string;
    }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
};

const BLOCKED_STATUS_KEYWORDS = ["已用完", "暫停", "停用", "禁用"];
const SENSITIVITY_BLOCKED_KEYWORDS = ["過敏", "不適", "腹瀉", "脹氣", "嘔吐", "紅疹", "異常"];

function normalizeText(value: string | null | undefined) {
  return (value || "").trim();
}

function extractJsonObject(input: string) {
  const trimmed = input.trim();

  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function isBlockedStatus(status: string) {
  return BLOCKED_STATUS_KEYWORDS.some((keyword) => status.includes(keyword));
}

function isBlockedSensitivity(result: string) {
  return SENSITIVITY_BLOCKED_KEYWORDS.some((keyword) => result.includes(keyword));
}

function buildMenuPrompt(userPrompt: string, context: Awaited<ReturnType<typeof collectMenuContext>>) {
  const inventoryLines = context.availableInventory.map(
    (item) =>
      `- ${item.name}｜ID:${item.code}｜類型:${item.category}｜規格:${item.specGrams}g｜庫存:${item.stockUnits}份｜每次建議上限:${item.suggestionLimitGrams ?? "未填"}g｜保存:${item.storageMethod ?? "未填"}｜備註:${item.notes ?? "無"}`,
  );

  const traitLines = context.relevantTraits.map(
    (trait) =>
      `- ${trait.ingredientName}｜主類型:${trait.primaryType}｜纖維:${trait.fiberLevel ?? "未填"}｜水溶性:${trait.solubleFiber ?? "未填"}｜非水溶性:${trait.insolubleFiber ?? "未填"}｜易脹氣:${trait.easyGas ?? "未填"}｜便秘:${trait.forConstipation ?? "未填"}｜腹瀉:${trait.forDiarrhea ?? "未填"}｜敏感:${trait.sensitivity ?? "未填"}｜不良反應:${trait.adverseNotes ?? "無"}｜營養:${trait.nutritionNotes ?? "無"}`,
  );

  const ruleLines = context.rules.map(
    (rule) => `- ${rule.mealType}｜${rule.category}｜${rule.item}｜限制:${rule.limitGrams}g｜檢查:${rule.checkType}｜備註:${rule.notes ?? "無"}`,
  );

  const sensitivityLines = context.blockedSensitivityRecords.map(
    (record) =>
      `- ${record.ingredientName}｜日期:${record.recordedOn.toISOString().slice(0, 10)}｜結果:${record.result ?? "未填"}｜症狀:${record.symptomNotes ?? "無"}`,
  );

  return [
    "你是副食品菜單規劃助手。",
    "請以使用者規則為主，再綜合目前可用庫存、食材特性、餵食規則、試敏/不適紀錄，輸出可執行的副食品菜單建議。",
    "只可使用可用庫存中的食材，不可使用禁用或試敏結果不佳的食材。若資料不足，要在 notes 與 cautions 說明。",
    "請嚴格輸出 JSON，不要加入 markdown、說明文字或程式碼區塊。",
    "JSON 結構：{\"overview\":string,\"menus\":[{\"day\":string,\"mealType\":string,\"menuName\":string,\"ingredients\":[{\"name\":string,\"category\":string,\"grams\":number,\"note\":string}],\"totalGrams\":number,\"reason\":string,\"cautions\":[string]}],\"notes\":[string]}",
    "每個 menuName 請具體，ingredients 的 grams 必須是數字，totalGrams 要是該餐總克數。",
    "使用者輸入規則：",
    userPrompt.trim(),
    "可用庫存：",
    inventoryLines.length ? inventoryLines.join("\n") : "- 無可用庫存",
    "食材特性：",
    traitLines.length ? traitLines.join("\n") : "- 無對應食材特性",
    "餵食規則：",
    ruleLines.length ? ruleLines.join("\n") : "- 無餵食規則",
    "不可使用的試敏/不適紀錄：",
    sensitivityLines.length ? sensitivityLines.join("\n") : "- 無",
    `不可使用食材：${context.blockedIngredientNames.length ? context.blockedIngredientNames.join("、") : "無"}`,
  ].join("\n\n");
}

function sanitizeMenuRecommendationResult(input: unknown): MenuRecommendationResult {
  const fallback: MenuRecommendationResult = {
    overview: "AI 未回傳完整結構化資料。",
    menus: [],
    notes: ["請調整提示詞後再試一次。"],
  };

  if (!input || typeof input !== "object") {
    return fallback;
  }

  const source = input as {
    overview?: unknown;
    menus?: unknown;
    notes?: unknown;
  };

  return {
    overview: typeof source.overview === "string" && source.overview.trim() ? source.overview.trim() : fallback.overview,
    menus: Array.isArray(source.menus)
      ? source.menus
          .map((menu) => {
            if (!menu || typeof menu !== "object") {
              return null;
            }

            const menuSource = menu as {
              day?: unknown;
              mealType?: unknown;
              menuName?: unknown;
              ingredients?: unknown;
              totalGrams?: unknown;
              reason?: unknown;
              cautions?: unknown;
            };

            return {
              day: typeof menuSource.day === "string" && menuSource.day.trim() ? menuSource.day.trim() : "未指定日別",
              mealType: typeof menuSource.mealType === "string" && menuSource.mealType.trim() ? menuSource.mealType.trim() : "未指定餐別",
              menuName: typeof menuSource.menuName === "string" && menuSource.menuName.trim() ? menuSource.menuName.trim() : "未命名菜單",
              ingredients: Array.isArray(menuSource.ingredients)
                ? menuSource.ingredients
                    .map((ingredient) => {
                      if (!ingredient || typeof ingredient !== "object") {
                        return null;
                      }

                      const ingredientSource = ingredient as {
                        name?: unknown;
                        category?: unknown;
                        grams?: unknown;
                        note?: unknown;
                      };

                      return {
                        name:
                          typeof ingredientSource.name === "string" && ingredientSource.name.trim()
                            ? ingredientSource.name.trim()
                            : "未命名食材",
                        category:
                          typeof ingredientSource.category === "string" && ingredientSource.category.trim()
                            ? ingredientSource.category.trim()
                            : "未分類",
                        grams:
                          typeof ingredientSource.grams === "number"
                            ? ingredientSource.grams
                            : Number(ingredientSource.grams) || 0,
                        note:
                          typeof ingredientSource.note === "string" && ingredientSource.note.trim()
                            ? ingredientSource.note.trim()
                            : "",
                      };
                    })
                    .filter((ingredient): ingredient is NonNullable<typeof ingredient> => Boolean(ingredient))
                : [],
              totalGrams: typeof menuSource.totalGrams === "number" ? menuSource.totalGrams : Number(menuSource.totalGrams) || 0,
              reason: typeof menuSource.reason === "string" && menuSource.reason.trim() ? menuSource.reason.trim() : "未提供搭配理由",
              cautions: Array.isArray(menuSource.cautions)
                ? menuSource.cautions.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
                : [],
            };
          })
          .filter((menu): menu is NonNullable<typeof menu> => Boolean(menu))
      : fallback.menus,
    notes: Array.isArray(source.notes)
      ? source.notes.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim())
      : fallback.notes,
  };
}

function normalizeOptionalTraitText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sanitizeIngredientTraitSuggestion(input: unknown, ingredientName: string): IngredientTraitSuggestion {
  if (!input || typeof input !== "object") {
    throw new Error("AI 沒有回傳有效的食材特性資料");
  }

  const source = input as Partial<Record<keyof IngredientTraitSuggestion, unknown>>;
  const normalizedIngredientName = (typeof source.ingredientName === "string" && source.ingredientName.trim() ? source.ingredientName.trim() : ingredientName).trim();
  const primaryType = typeof source.primaryType === "string" && source.primaryType.trim() ? source.primaryType.trim() : "";

  if (!normalizedIngredientName) {
    throw new Error("AI 回傳的食材名稱為空白");
  }

  if (!primaryType) {
    throw new Error("AI 回傳的主要類型為空白");
  }

  return {
    ingredientName: normalizedIngredientName,
    primaryType,
    solubleFiber: normalizeOptionalTraitText(source.solubleFiber),
    insolubleFiber: normalizeOptionalTraitText(source.insolubleFiber),
    fiberLevel: normalizeOptionalTraitText(source.fiberLevel),
    easyGas: normalizeOptionalTraitText(source.easyGas),
    forConstipation: normalizeOptionalTraitText(source.forConstipation),
    forDiarrhea: normalizeOptionalTraitText(source.forDiarrhea),
    forPhlegm: normalizeOptionalTraitText(source.forPhlegm),
    sensitivity: normalizeOptionalTraitText(source.sensitivity),
    adverseNotes: normalizeOptionalTraitText(source.adverseNotes),
    nutritionNotes: normalizeOptionalTraitText(source.nutritionNotes),
  };
}

function buildIngredientTraitPrompt(ingredientName: string) {
  return [
    "你是副食品食材特性整理助手。",
    `請查詢「${ingredientName}」的食材特性。`,
    "請依照以下欄位輸出 JSON，不要加入 markdown、說明文字或程式碼區塊。",
    "欄位順序與 key：ingredientName, primaryType, solubleFiber, insolubleFiber, fiberLevel, easyGas, forConstipation, forDiarrhea, forPhlegm, sensitivity, adverseNotes, nutritionNotes。",
    "欄位對應中文：食材名稱、主要類型、水溶性纖維、非水溶性纖維、纖維、容易脹氣、適合山羊便/硬便、腹瀉時建議、適合感冒有痰、試敏狀態、過敏/不適紀錄、營養備註。",
    "若資料不明確，請填 null，不要自行捏造過度確定的內容。",
    "JSON 範例：",
    '{"ingredientName":"南瓜","primaryType":"蔬菜","solubleFiber":"中","insolubleFiber":"低","fiberLevel":"中","easyGas":"低","forConstipation":"適合","forDiarrhea":"可少量","forPhlegm":"普通","sensitivity":"可先少量試敏","adverseNotes":null,"nutritionNotes":"含beta-胡蘿蔔素"}',
  ].join("\n\n");
}

async function generateGeminiJson(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("尚未設定 GEMINI_API_KEY");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
    cache: "no-store",
  });

  const responseJson = (await response.json()) as GeminiResponse & { error?: { message?: string } };

  if (!response.ok) {
    throw new Error(responseJson.error?.message || "Gemini API 呼叫失敗");
  }

  const text = responseJson.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("") || "";

  if (!text.trim()) {
    throw new Error("Gemini 沒有回傳內容");
  }

  return JSON.parse(extractJsonObject(text)) as unknown;
}

export async function collectMenuContext() {
  const [inventory, rules, traits, sensitivityRecords] = await prisma.$transaction([
    prisma.inventoryItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.feedingRule.findMany({ orderBy: [{ mealType: "asc" }, { code: "asc" }] }),
    prisma.ingredientTrait.findMany({ orderBy: [{ ingredientName: "asc" }] }),
    prisma.sensitivityRecord.findMany({ orderBy: [{ recordedOn: "desc" }, { id: "desc" }] }),
  ]);

  const blockedIngredientNames = Array.from(
    new Set(
      sensitivityRecords
        .filter((record) => isBlockedSensitivity(normalizeText(record.result)) || isBlockedSensitivity(normalizeText(record.symptomNotes)))
        .map((record) => normalizeText(record.ingredientName))
        .filter(Boolean),
    ),
  );

  const blockedIngredientNameSet = new Set(blockedIngredientNames);

  const availableInventory = inventory.filter((item) => item.stockUnits > 0 && !isBlockedStatus(normalizeText(item.status)) && !blockedIngredientNameSet.has(normalizeText(item.name)));
  const availableInventoryNames = new Set(availableInventory.map((item) => item.name));
  const relevantTraits = traits.filter((trait) => availableInventoryNames.has(trait.ingredientName));
  const blockedSensitivityRecords = sensitivityRecords.filter((record) => blockedIngredientNameSet.has(normalizeText(record.ingredientName)));

  return {
    availableInventory,
    relevantTraits,
    rules,
    blockedSensitivityRecords,
    blockedIngredientNames,
  };
}

export async function getMenuRecommendation(userPrompt: string) {
  const trimmedPrompt = userPrompt.trim();

  if (!trimmedPrompt) {
    throw new Error("請先輸入菜單需求");
  }

  const context = await collectMenuContext();
  const prompt = buildMenuPrompt(trimmedPrompt, context);
  const parsed = await generateGeminiJson(prompt);

  return sanitizeMenuRecommendationResult(parsed);
}

export async function getIngredientTraitSuggestion(ingredientName: string) {
  const trimmedName = ingredientName.trim();

  if (!trimmedName) {
    throw new Error("請先輸入食材名稱");
  }

  const parsed = await generateGeminiJson(buildIngredientTraitPrompt(trimmedName));

  return sanitizeIngredientTraitSuggestion(parsed, trimmedName);
}