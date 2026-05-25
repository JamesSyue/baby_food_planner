import { NextResponse } from "next/server";

import { syncGoogleSheetsToDatabase } from "@/lib/google-sheet-sync";

export async function POST() {
  try {
    const result = await syncGoogleSheetsToDatabase();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync error";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}