import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_PRODUCTS } from "../../catalog-data";

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey    = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function mapRow(p: any) {
  return {
    id:          p.id,
    sku:         p.sku,
    name:        p.name,
    brand:       p.brand,
    category:    p.category ?? "",
    description: p.description ?? "",
    image:       p.image ?? "",
    imageColor:  p.image_color ?? "",
    imageIcon:   p.image_icon ?? "",
    tag:         p.tag ?? undefined,
    price:       Number(p.price) || 0,
    priceRetail: p.price_retail ? Number(p.price_retail) : undefined,
    salePrice:   p.sale_price   ? Number(p.sale_price)   : undefined,
    onSale:      Boolean(p.on_sale),
    minQty:      Number(p.min_qty)  || 1,
    stock:       Number(p.stock)    ?? 100,
    specs:       p.specs    ?? undefined,
    variants:    p.variants ?? undefined,
  };
}

// GET — público, retorna todos los productos con overrides de precios aplicados
export async function GET() {
  if (!url || !anonKey) return NextResponse.json([], { status: 200 });
  try {
    const sb = createClient(url, anonKey, { db: { schema: "catalog" } });

    const [{ data: products, error: prodErr }, { data: prices }] = await Promise.all([
      sb.from("products").select("*").eq("is_deleted", false).order("brand").order("name").limit(10000),
      sb.from("prices").select("sku, brand, price, sale_price, on_sale, description"),
    ]);

    if (prodErr) { console.error("products GET error:", prodErr.message); return NextResponse.json([], { status: 200 }); }

    // Auto-seed: si la tabla está vacía, subir DEFAULT_PRODUCTS automáticamente
    if (!products || products.length === 0) {
      const sbService = createClient(url, serviceKey, { db: { schema: "catalog" } });
      const now = new Date().toISOString();
      const payload = DEFAULT_PRODUCTS.map((p: any) => ({
        id: String(p.id), sku: String(p.sku ?? "").trim(), name: String(p.name ?? ""),
        brand: String(p.brand ?? ""), category: String(p.category ?? ""),
        description: String(p.description ?? ""), image: String(p.image ?? ""),
        image_color: String(p.imageColor ?? ""), image_icon: String(p.imageIcon ?? ""),
        tag: p.tag ?? null, price: Number(p.price) || 0,
        price_retail: p.priceRetail ? Number(p.priceRetail) : null,
        sale_price: p.salePrice ? Number(p.salePrice) : null,
        on_sale: Boolean(p.onSale), min_qty: Number(p.minQty) || 1,
        stock: p.stock != null ? Number(p.stock) : 100,
        specs: p.specs ?? null, variants: p.variants ?? null,
        is_deleted: false, updated_at: now,
      }));
      for (let i = 0; i < payload.length; i += 500) {
        await sbService.from("products").upsert(payload.slice(i, i + 500), { onConflict: "id" });
      }
      console.log(`Auto-seed: ${payload.length} productos subidos a Supabase`);
      return NextResponse.json(DEFAULT_PRODUCTS);
    }

    const priceMap = new Map<string, any>();
    for (const pr of prices ?? []) {
      priceMap.set(`${pr.sku}||${pr.brand}`, pr);
    }

    const merged = (products ?? []).map(p => {
      const ov = priceMap.get(`${p.sku}||${p.brand}`);
      if (!ov) return mapRow(p);
      return mapRow({
        ...p,
        price:       ov.price,
        sale_price:  ov.sale_price,
        on_sale:     ov.on_sale,
        description: ov.description ?? p.description,
      });
    });

    return NextResponse.json(merged);
  } catch (e: any) {
    console.error("products GET exception:", e.message);
    return NextResponse.json([], { status: 200 });
  }
}

// POST — admin, upsert un batch de productos
export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const caller = createClient(url, anonKey);
  const { data: { user } } = await caller.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const body = await req.json();
  const items: any[] = body.products ?? (Array.isArray(body) ? body : []);
  if (!items.length) return NextResponse.json({ error: "Sin datos" }, { status: 400 });

  const sb = createClient(url, serviceKey, { db: { schema: "catalog" } });
  const now = new Date().toISOString();

  const payload = items.map((p: any) => ({
    id:          String(p.id),
    sku:         String(p.sku  ?? "").trim(),
    name:        String(p.name ?? ""),
    brand:       String(p.brand ?? ""),
    category:    String(p.category ?? ""),
    description: String(p.description ?? ""),
    image:       String(p.image ?? ""),
    image_color: String(p.imageColor ?? ""),
    image_icon:  String(p.imageIcon ?? ""),
    tag:         p.tag ?? null,
    price:       Number(p.price) || 0,
    price_retail:p.priceRetail ? Number(p.priceRetail) : null,
    sale_price:  p.salePrice   ? Number(p.salePrice)   : null,
    on_sale:     Boolean(p.onSale),
    min_qty:     Number(p.minQty) || 1,
    stock:       p.stock != null ? Number(p.stock) : 100,
    specs:       p.specs    ?? null,
    variants:    p.variants ?? null,
    is_deleted:  false,
    updated_at:  now,
  }));

  // Upsert en lotes de 500
  for (let i = 0; i < payload.length; i += 500) {
    const { error } = await sb.from("products").upsert(payload.slice(i, i + 500), { onConflict: "id" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, upserted: payload.length });
}

// DELETE — admin, elimina un producto por id
export async function DELETE(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const caller = createClient(url, anonKey);
  const { data: { user } } = await caller.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Sin id" }, { status: 400 });

  const sb = createClient(url, serviceKey, { db: { schema: "catalog" } });
  const { error } = await sb.from("products").update({ is_deleted: true, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
