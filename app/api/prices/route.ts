import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// GET — public, returns all prices
export async function GET() {
  if (!url || !anonKey) return NextResponse.json([]);
  try {
    const sb = createClient(url, anonKey, { db: { schema: "catalog" } });
    const { data, error } = await sb.from("prices").select("sku, brand, price, sale_price, on_sale, description");
    if (error) { console.error("Supabase prices error:", error.message, error.code); return NextResponse.json([]); }
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

  const SKU_RE = /^[a-zA-Z0-9\-_./\s]{1,80}$/;
  for (const r of rows) {
    const price = Number(r.price);
    const salePrice = r.sale_price != null ? Number(r.sale_price) : null;
    if (!SKU_RE.test(String(r.sku).trim())) return NextResponse.json({ error: "SKU inválido" }, { status: 400 });
    if (!price || price <= 0) return NextResponse.json({ error: "Precio debe ser mayor a 0" }, { status: 400 });
    if (salePrice !== null && salePrice <= 0) return NextResponse.json({ error: "Precio con descuento debe ser mayor a 0" }, { status: 400 });
  }

  const sb = createClient(url, serviceKey, { db: { schema: "catalog" } });
  const payload = rows.map((r: any) => ({
    sku:         String(r.sku).trim(),
    brand:       String(r.brand).trim(),
    price:       Number(r.price),
    sale_price:  r.sale_price != null ? Number(r.sale_price) : null,
    on_sale:     Boolean(r.on_sale),
    description: r.description ?? null,
    updated_at:  new Date().toISOString(),
  }));

  const { error } = await sb.from("prices").upsert(payload, { onConflict: "sku,brand" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, updated: payload.length });
}
