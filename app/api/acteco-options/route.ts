import { NextResponse } from "next/server";

import actecoOptions from "@/data/acteco-options.json";

export async function GET() {
  return NextResponse.json({ ok: true, data: actecoOptions });
}
