import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET — public, returns all prices
export async function GET() {
  try {
    const sb = createClient(url, anonKey, { db: { schema: "catalog" } });
    const { data, error } = await sb.from("prices").select("sku, brand, price, sale_price, on_sale, description");
    if (error) return NextResponse.json([]);
    return NextResponse.json(data ?? []);
  } catch {
    return NextResponse.json([]);
  }
}

// POST — admin only, upsert one or many rows
// Body: { rows: Array<{ sku, brand, price, sale_price?, on_sale?, description? }> }
export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const caller = createClient(url, anonKey);
  const { data: { user } } = await caller.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { rows } = await req.json();
  if (!Array.isArray(rows) || rows.length === 0)
    return NextResponse.json({ error: "Sin datos" }, { status: 400 });

  const sb = createClient(url, serviceKey, { db: { schema: "catalog" } });
  const payload = rows.map((r: any) => ({
    sku:         String(r.sku).trim(),
    brand:       String(r.brand).trim(),
    price:       Number(r.price) || 0,
    sale_price:  r.sale_price != null ? Number(r.sale_price) : null,
    on_sale:     Boolean(r.on_sale),
    description: r.description ?? null,
    updated_at:  new Date().toISOString(),
  }));

  const { error } = await sb.from("prices").upsert(payload, { onConflict: "sku,brand" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: payload.length });
}
