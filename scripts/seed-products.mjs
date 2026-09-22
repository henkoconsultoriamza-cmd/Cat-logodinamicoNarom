/**
 * seed-products.mjs
 * Sube todos los DEFAULT_PRODUCTS de catalog-data.ts a Supabase catalog.products
 *
 * Uso: node scripts/seed-products.mjs
 *
 * Requiere: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local
 *           o como variables de entorno.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Cargar .env.local si existe
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env.local");
try {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.split("=");
    if (k && !k.startsWith("#")) process.env[k.trim()] = v.join("=").trim();
  }
} catch {}

const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Importar productos dinámicamente usando tsx/ts-node o el build
// Como no podemos importar TS directamente, usamos el JSON generado por Next o cargamos via require de un build
// Alternativa: usar la API del propio servidor local

const baseUrl = process.env.CATALOG_URL ?? "http://localhost:3000";

console.log(`🔗 Conectando a Supabase: ${url.replace(/https?:\/\//, "").split(".")[0]}...`);

const sb = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db:   { schema: "catalog" },
});

// Verificar que la tabla existe
const { error: checkErr } = await sb.from("products").select("id").limit(1);
if (checkErr) {
  console.error("❌ No se pudo acceder a catalog.products:", checkErr.message);
  console.error("   Asegurate de haber ejecutado create-products-table.sql en Supabase primero.");
  process.exit(1);
}

// Contar productos existentes
const { count: existing } = await sb.from("products").select("*", { count: "exact", head: true }).eq("is_deleted", false);
console.log(`📦 Productos ya en Supabase: ${existing ?? 0}`);

if ((existing ?? 0) > 0) {
  const args = process.argv.slice(2);
  if (!args.includes("--force")) {
    console.log("⚠️  Ya hay productos. Para re-importar usa: node scripts/seed-products.mjs --force");
    process.exit(0);
  }
  console.log("🔄 --force detectado: actualizando/sobreescribiendo productos existentes...");
}

// Leer productos del servidor local (que ya tiene el catalog-data.ts compilado)
console.log(`📡 Obteniendo productos desde ${baseUrl}/api/products...`);
let products;
try {
  const res = await fetch(`${baseUrl}/api/products`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  products = await res.json();
} catch (e) {
  console.error("❌ Error al leer productos:", e.message);
  console.error("   Asegurate de que el servidor esté corriendo: npm run dev");
  process.exit(1);
}

// Si la API no devuelve productos (porque Supabase está vacío), cargamos desde catalog-data
if (!products || products.length === 0) {
  console.log("⚠️  La API devolvió 0 productos (Supabase vacío). Cargando desde catalog-data-export.json...");
  try {
    const exportPath = join(__dirname, "catalog-data-export.json");
    products = JSON.parse(readFileSync(exportPath, "utf8"));
    console.log(`   Cargados ${products.length} productos del archivo de exportación.`);
  } catch {
    console.error("❌ No existe catalog-data-export.json. Generalo primero con: node scripts/export-catalog-data.mjs");
    process.exit(1);
  }
}

console.log(`📋 Total de productos a subir: ${products.length}`);

const now = new Date().toISOString();
const payload = products.map(p => ({
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

// Insertar en lotes de 500
const BATCH = 500;
let total = 0;
for (let i = 0; i < payload.length; i += BATCH) {
  const batch = payload.slice(i, i + BATCH);
  const { error } = await sb.from("products").upsert(batch, { onConflict: "id" });
  if (error) {
    console.error(`❌ Error en lote ${i / BATCH + 1}:`, error.message);
    process.exit(1);
  }
  total += batch.length;
  console.log(`   ✓ Lote ${Math.floor(i / BATCH) + 1}: ${total}/${payload.length} productos subidos`);
}

console.log(`\n✅ Seed completado: ${total} productos en Supabase catalog.products`);
console.log("   Todos los admins y clientes verán los mismos productos en tiempo real.\n");
