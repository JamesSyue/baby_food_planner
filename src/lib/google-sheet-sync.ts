import { createSign } from "node:crypto";

import { prisma } from "@/lib/prisma";

type SheetSyncSummary = {
  key: "inventory" | "traits" | "rules" | "sensitivity";
  label: string;
  count: number;
  items: string[];
};

type SheetRows = string[][];

const GOOGLE_TOKEN_AUDIENCE = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizePrivateKey(privateKey: string) {
  return privateKey.replace(/\\n/g, "\n");
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function fetchGoogleAccessToken() {
  const clientEmail = getRequiredEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = normalizePrivateKey(getRequiredEnv("GOOGLE_PRIVATE_KEY"));
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;

  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_AUDIENCE,
    exp: expiresAt,
    iat: issuedAt,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(privateKey);
  const assertion = `${unsignedToken}.${toBase64Url(signature)}`;

  const response = await fetch(GOOGLE_TOKEN_AUDIENCE, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Google access token: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) {
    throw new Error("Google access token response did not include access_token.");
  }

  return json.access_token;
}

function extractSpreadsheetId(value: string) {
  const match = value.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : value;
}

async function fetchSheetRows(spreadsheetIdOrUrl: string, range: string, accessToken: string) {
  const spreadsheetId = extractSpreadsheetId(spreadsheetIdOrUrl);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to read spreadsheet ${spreadsheetId}: ${response.status} ${await response.text()}`);
  }

  const json = (await response.json()) as { values?: string[][] };
  return json.values ?? [];
}

function rowsToObjects(rows: SheetRows) {
  if (!rows.length) return [] as Record<string, string>[];
  const headers = rows[0].map((header) => String(header || "").replace(/\s+/g, ""));
  return rows
    .slice(1)
    .map((row) =>
      headers.reduce<Record<string, string>>((result, header, index) => {
        result[header] = row[index] || "";
        return result;
      }, {}),
    )
    .filter((row) => headers.some((header) => row[header]));
}

function parseNumber(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseDate(value: string) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dedupeByKey<T>(items: T[], keyFactory: (item: T) => string) {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(keyFactory(item), item);
  }
  return [...map.values()];
}

function mapInventoryRows(rows: Record<string, string>[]) {
  return dedupeByKey(
    rows
      .map((row) => {
        const code = row["食材ID"]?.trim();
        const name = row["食材名稱"]?.trim();
        const category = row["類型"]?.trim();
        const specGrams = parseNumber(row["規格(g)"]);
        const stockUnits = parseNumber(row["庫存份數"]);
        if (!code || !name || !category || specGrams === null || stockUnits === null) {
          return null;
        }

        return {
          code,
          name,
          category,
          specGrams,
          stockUnits,
          suggestionLimitGrams: parseNumber(row["每次建議上限(g)"]),
          status: row["狀態"]?.trim() || "可用",
          updatedAt: parseDate(row["最後更新日"]) ?? new Date(),
          storageMethod: row["保存方式"]?.trim() || null,
          expiresAt: parseDate(row["使用期限"]),
          notes: row["備註"]?.trim() || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    (row) => row.code,
  );
}

function mapTraitRows(rows: Record<string, string>[]) {
  return dedupeByKey(
    rows
      .map((row) => {
        const ingredientName = row["食材名稱"]?.trim();
        const primaryType = row["主要類型"]?.trim();
        if (!ingredientName || !primaryType) return null;

        return {
          ingredientName,
          primaryType,
          solubleFiber: row["水溶性纖維"]?.trim() || null,
          insolubleFiber: row["非水溶性纖維"]?.trim() || null,
          fiberLevel: row["纖維"]?.trim() || null,
          easyGas: row["容易脹氣"]?.trim() || null,
          forConstipation: row["適合山羊便/硬便"]?.trim() || null,
          forDiarrhea: row["腹瀉時建議"]?.trim() || null,
          forPhlegm: row["適合感冒有痰"]?.trim() || null,
          sensitivity: row["試敏狀態"]?.trim() || null,
          adverseNotes: row["過敏/不適紀錄"]?.trim() || null,
          nutritionNotes: row["營養備註"]?.trim() || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    (row) => row.ingredientName,
  );
}

function mapRuleRows(rows: Record<string, string>[]) {
  return dedupeByKey(
    rows
      .map((row) => {
        const code = row["規則ID"]?.trim();
        const item = row["項目"]?.trim();
        const mealType = row["適用餐別"]?.trim();
        const category = row["類型"]?.trim();
        const limitGrams = parseNumber(row["限制值(g)"]);
        const checkType = row["檢查方式"]?.trim();

        if (!code || !item || !mealType || !category || limitGrams === null || !checkType) {
          return null;
        }

        return {
          code,
          item,
          mealType,
          category,
          limitGrams,
          checkType,
          notes: row["備註"]?.trim() || null,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    (row) => row.code,
  );
}

function parseBoolean(value: string) {
  const normalized = String(value || "").trim();
  return ["是", "true", "TRUE", "1", "已完成"].includes(normalized);
}

function mapSensitivityRows(rows: Record<string, string>[]) {
  return rows
    .map((row) => {
      const recordedOn = parseDate(row["日期"]);
      const ingredientName = row["食材名稱"]?.trim();
      const grams = parseNumber(row["克數(g)"]);
      const daySequence = parseNumber(row["第幾天"]);

      if (!recordedOn || !ingredientName || grams === null || daySequence === null) {
        return null;
      }

      return {
        recordedOn,
        ingredientName,
        grams,
        daySequence,
        result: row["結果"]?.trim() || null,
        symptomNotes: row["症狀/備註"]?.trim() || null,
        isCompleted: parseBoolean(row["是否已完成試敏"]),
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

function mapDailyRows(rows: Record<string, string>[]) {
  return rows
    .map((row) => {
      const recordedOn = parseDate(row["日期"]);
      if (!recordedOn) return null;

      return {
        recordedOn,
        stoolCondition: row["便便狀況"]?.trim() || null,
        fever: row["發燒"]?.trim() || null,
        coughPhlegm: row["咳嗽/痰"]?.trim() || null,
        appetite: row["食慾"]?.trim() || null,
        waterMilkStatus: row["喝水/奶量狀況"]?.trim() || null,
        notes: row["特殊備註"]?.trim() || null,
        pairingDirection: row["今日搭配方向"]?.trim() || null,
      };
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function syncGoogleSheetsToDatabase() {
  const accessToken = await fetchGoogleAccessToken();
  const spreadsheetId = getRequiredEnv("GOOGLE_SHEETS_SPREADSHEET_ID");
  const inventorySheetName = getRequiredEnv("GOOGLE_SHEET_TAB_INVENTORY");
  const traitsSheetName = getRequiredEnv("GOOGLE_SHEET_TAB_TRAITS");
  const rulesSheetName = getRequiredEnv("GOOGLE_SHEET_TAB_RULES");
  const sensitivitySheetName = getRequiredEnv("GOOGLE_SHEET_TAB_SENSITIVITY");

  const [inventoryRows, traitRows, ruleRows, sensitivityRows] = await Promise.all([
    fetchSheetRows(spreadsheetId, `${inventorySheetName}!A:ZZ`, accessToken),
    fetchSheetRows(spreadsheetId, `${traitsSheetName}!A:ZZ`, accessToken),
    fetchSheetRows(spreadsheetId, `${rulesSheetName}!A:ZZ`, accessToken),
    fetchSheetRows(spreadsheetId, `${sensitivitySheetName}!A:ZZ`, accessToken),
  ]);

  const inventory = mapInventoryRows(rowsToObjects(inventoryRows));
  const traits = mapTraitRows(rowsToObjects(traitRows));
  const rules = mapRuleRows(rowsToObjects(ruleRows));
  const sensitivity = mapSensitivityRows(rowsToObjects(sensitivityRows));

  await prisma.$transaction(async (transaction) => {
    await transaction.menuPlanItem.deleteMany();
    await transaction.menuPlan.deleteMany();
    await transaction.inventoryMovement.deleteMany();
    await transaction.dailyCondition.deleteMany();
    await transaction.sensitivityRecord.deleteMany();
    await transaction.inventoryItem.deleteMany();
    await transaction.ingredientTrait.deleteMany();
    await transaction.feedingRule.deleteMany();

    if (inventory.length) {
      await transaction.inventoryItem.createMany({ data: inventory });
    }
    if (traits.length) {
      await transaction.ingredientTrait.createMany({ data: traits });
    }
    if (rules.length) {
      await transaction.feedingRule.createMany({ data: rules });
    }
    if (sensitivity.length) {
      await transaction.sensitivityRecord.createMany({ data: sensitivity });
    }
  });

  const summaries: SheetSyncSummary[] = [
    {
      key: "inventory",
      label: "食材庫存",
      count: inventory.length,
      items: inventory.slice(0, 8).map((item) => `${item.code} ${item.name}`),
    },
    {
      key: "traits",
      label: "食材特性",
      count: traits.length,
      items: traits.slice(0, 8).map((item) => item.ingredientName),
    },
    {
      key: "rules",
      label: "副食品規則",
      count: rules.length,
      items: rules.slice(0, 8).map((item) => `${item.code} ${item.item}`),
    },
    {
      key: "sensitivity",
      label: "試敏紀錄",
      count: sensitivity.length,
      items: sensitivity.slice(0, 8).map((item) => `${item.ingredientName} 第${item.daySequence}天`),
    },
  ];

  return {
    updatedAt: new Date().toISOString(),
    summaries,
  };
}

export type { SheetSyncSummary };