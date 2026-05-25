import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json({ ok: false, message: "缺少食材名稱參數" }, { status: 400 });
  }

  try {
    const trait = await prisma.ingredientTrait.findUnique({
      where: { ingredientName: name },
    });

    if (!trait) {
      return NextResponse.json({ ok: false, message: `找不到「${name}」的食材特性資料` }, { status: 404 });
    }

    return NextResponse.json({ ok: true, trait });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingredient trait error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}