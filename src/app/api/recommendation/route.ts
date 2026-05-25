import { NextResponse } from "next/server";

import { getLoggedInAccount } from "@/lib/auth";
import { getMenuRecommendation } from "@/lib/ai-menu";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "請改用 POST 並提供 prompt 以取得 AI 菜單建議。",
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
    const body = (await request.json()) as { prompt?: string };
    const result = await getMenuRecommendation(body.prompt || "");

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 菜單建議產生失敗";

    return NextResponse.json(
      {
        ok: false,
        message,
      },
      { status: 500 },
    );
  }
}