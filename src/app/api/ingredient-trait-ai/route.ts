import { NextResponse } from "next/server";

import { getLoggedInAccount } from "@/lib/auth";
import { getIngredientTraitSuggestion } from "@/lib/ai-menu";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "請改用 POST 並提供 ingredientName 以取得 AI 食材特性建議。",
  });
}

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
    const body = (await request.json()) as { ingredientName?: string };
    const trait = await getIngredientTraitSuggestion(body.ingredientName || "");

    return NextResponse.json({
      ok: true,
      trait,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 食材特性查詢失敗";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}