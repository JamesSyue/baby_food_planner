import { NextRequest, NextResponse } from "next/server";

import { clearAuthSession, setAuthSession, validateLogin } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { account?: string; password?: string };
    const account = body.account || "";
    const password = body.password || "";

    const isValid = await validateLogin(account, password);

    if (!isValid) {
      await clearAuthSession();
      return NextResponse.json({ ok: false, message: "帳號或密碼錯誤。" }, { status: 401 });
    }

    await setAuthSession(account.trim());
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown login error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function DELETE() {
  await clearAuthSession();
  return NextResponse.json({ ok: true });
}