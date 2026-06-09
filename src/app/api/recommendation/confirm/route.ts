import { NextResponse } from "next/server";

import { getLoggedInAccount } from "@/lib/auth";
import { getMenuInventoryDeductionSummary, type MenuRecommendationMenuInput } from "@/lib/ai-menu";
import { replaceInventoryInDatabaseAndSheet } from "@/lib/google-sheet-sync";
import { prisma } from "@/lib/prisma";

type ConfirmRequestBody = {
  menus?: MenuRecommendationMenuInput[];
};

export async function POST(request: Request) {
  const account = await getLoggedInAccount();

  if (!account) {
    return NextResponse.json(
      {
        ok: false,
        message: "請先登入",
      },
      { status: 401 },
    );
  }

  try {
    const body = (await request.json()) as ConfirmRequestBody;

    if (!Array.isArray(body.menus) || !body.menus.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "缺少可確認的菜單內容。",
        },
        { status: 400 },
      );
    }

    const deductionSummary = await getMenuInventoryDeductionSummary(body.menus);

    if (!deductionSummary.items.length) {
      return NextResponse.json(
        {
          ok: false,
          message: "菜單中沒有可扣除的庫存項目。",
        },
        { status: 400 },
      );
    }

    if (deductionSummary.hasShortage) {
      return NextResponse.json(
        {
          ok: false,
          message: "目前庫存不足，請重新產生或調整菜單後再試。",
        },
        { status: 400 },
      );
    }

    const currentInventory = await prisma.inventoryItem.findMany({
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });
    const deductionByCode = new Map(deductionSummary.items.map((item) => [item.code, item] as const));

    const updatedInventory = currentInventory.map((item) => {
      const deduction = deductionByCode.get(item.code);

      if (!deduction) {
        return item;
      }

      const nextStockUnits = item.stockUnits - deduction.deductStockUnits;

      if (nextStockUnits < 0) {
        throw new Error(`食材「${item.name}」庫存不足，請重新產生菜單後再試。`);
      }

      return {
        ...item,
        stockUnits: nextStockUnits,
      };
    });

    const syncResult = await replaceInventoryInDatabaseAndSheet(updatedInventory);

    return NextResponse.json({
      ok: true,
      message: "已依照本次菜單扣除庫存並同步。",
      updatedAt: syncResult.updatedAt,
      items: deductionSummary.items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "扣除庫存失敗";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}