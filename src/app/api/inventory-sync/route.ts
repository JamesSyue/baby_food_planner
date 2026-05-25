import { NextRequest, NextResponse } from "next/server";

import { replaceInventoryInDatabaseAndSheet } from "@/lib/google-sheet-sync";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { items?: unknown };

    if (!Array.isArray(body.items)) {
      return NextResponse.json({ ok: false, message: "缺少可儲存的庫存資料。" }, { status: 400 });
    }

    const result = await replaceInventoryInDatabaseAndSheet(body.items as never[]);

    return NextResponse.json({
      ok: true,
      message: "食材庫存已同步到資料庫與 Google Sheet。",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown inventory sync error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}