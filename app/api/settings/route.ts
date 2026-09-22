import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET — público, devuelve todos los settings como objeto { key: value }
export async function GET() {
  if (!url || !anonKey) return NextResponse.json({});
  try {
    const sb = createClient(url, anonKey, { db: { schema: "catalog" } });
    const { data, error } = await sb.from("settings").select("key, value");
    if (error || !data) return NextResponse.json({});
    const result: Record<string, string> = {};
    for (const row of data) result[row.key] = row.value;
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({});
  }
}

// POST — admin, upsert settings
// Body: { settings: { key: value, ... } }
export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const caller = createClient(url, anonKey);
  const { data: { user } } = await caller.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { settings } = await req.json();
  if (!settings || typeof settings !== "object") return NextResponse.json({ error: "Sin datos" }, { status: 400 });

  const sb = createClient(url, serviceKey, { db: { schema: "catalog" } });
  const now = new Date().toISOString();
  const payload = Object.entries(settings).map(([key, value]) => ({ key, value: String(value), updated_at: now }));

  const { error } = await sb.from("settings").upsert(payload, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
