// Planilla única de productos. La usan Productos (Exportar / Importar Excel) y Precios
// (Descargar planilla / Subir Excel): lo que se descarga en una pestaña se sube en la otra.
import * as XLSX from "xlsx";
import type { Product } from "../catalog-data";

export const SHEET_COLUMNS = [
  { key: "sku",         header: "SKU",                  width: 16 },
  { key: "name",        header: "Nombre",               width: 40 },
  { key: "brand",       header: "Marca",                width: 14 },
  { key: "category",    header: "Categoria",            width: 26 },
  { key: "price",       header: "Precio Lista",         width: 14 },
  { key: "salePrice",   header: "Precio Con Descuento", width: 22 },
  { key: "minQty",      header: "MinQty",               width: 10 },
  { key: "description", header: "Descripcion",          width: 50 },
  { key: "id",          header: "ID interno",           width: 26 },
] as const;

type ColumnKey = (typeof SHEET_COLUMNS)[number]["key"] | "stock";

// Encabezados aceptados, normalizados (minúsculas, sin tildes, espacios ni símbolos).
// Incluye los de las planillas anteriores para que los archivos viejos sigan entrando.
const ALIASES: Record<ColumnKey, string[]> = {
  sku:         ["sku", "codigo", "cod", "articulo"],
  name:        ["nombre", "name"],
  brand:       ["marca", "brand"],
  category:    ["categoria", "category", "rubro"],
  price:       ["preciolista", "precio", "price"],
  salePrice:   ["preciocondescuento", "preciocd", "preciooferta", "descuento", "oferta"],
  minQty:      ["minqty", "cantidadminima", "minimo"],
  description: ["descripcion", "detalle", "description"],
  id:          ["idinterno", "id"],
  stock:       ["stock"],
};

export type SheetRow = {
  line: number;               // número de fila en Excel, para los mensajes
  id?: string;
  sku?: string;
  name?: string;
  brand?: string;
  category?: string;
  description?: string;
  price?: number;             // undefined = no cambiar precios
  salePrice?: number | null;  // null = sin precio con descuento (solo si vino Precio Lista)
  minQty?: number;
  stock?: number;
};

export type ProductSheet = { sheetName: string; rows: SheetRow[]; skipped: number };

export type PriceRow = { sku: string; brand: string; price: number; sale_price: number | null; on_sale: boolean; description: string | null };

function norm(v: unknown) {
  return String(v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function round2(n: number) { return Math.round(n * 100) / 100; }

function toNumber(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  let s = String(v).replace(/[^\d,.-]/g, "");
  // "1.234,56" (formato argentino) o "1,234.56": el último separador es el decimal
  if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
  else s = s.replace(/,/g, "");
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : undefined;
}

function toPrice(v: unknown) { const n = toNumber(v); return n != null && n > 0 ? round2(n) : undefined; }
function toCount(v: unknown) { const n = toNumber(v); return n != null && n >= 0 ? Math.round(n) : undefined; }

function headerColumns(cells: unknown[]): Partial<Record<ColumnKey, number>> {
  const cols: Partial<Record<ColumnKey, number>> = {};
  cells.forEach((c, i) => {
    const h = norm(c);
    if (!h) return;
    const key = (Object.keys(ALIASES) as ColumnKey[]).find(k => ALIASES[k].includes(h));
    if (key && cols[key] == null) cols[key] = i;
  });
  // Encabezados con texto extra: "Precio Lista Mayorista", "Precio con descuento 10%"
  cells.forEach((c, i) => {
    const h = norm(c);
    if (Object.values(cols).includes(i)) return;
    if (cols.salePrice == null && (h.includes("descuento") || (h.includes("oferta") && !h.startsWith("en")))) cols.salePrice = i;
    else if (cols.price == null && h.startsWith("precio")) cols.price = i;
  });
  return cols;
}

// Busca la hoja que tiene la columna SKU (primero las visibles). Así no importa el orden de las hojas
// ni que haya hojas auxiliares, como la "__Categorias" oculta que traían las exportaciones viejas.
export function parseProductWorkbook(data: ArrayBuffer | Uint8Array): ProductSheet {
  const wb = XLSX.read(data, { type: "array" });
  const hidden = (i: number) => Boolean(wb.Workbook?.Sheets?.[i]?.Hidden);
  const order = wb.SheetNames.map((_, i) => i).sort((a, b) => Number(hidden(a)) - Number(hidden(b)));

  for (const i of order) {
    const ws = wb.Sheets[wb.SheetNames[i]];
    if (!ws?.["!ref"]) continue;
    const firstRow = XLSX.utils.decode_range(ws["!ref"]).s.r;
    const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true });
    const h = aoa.slice(0, 10).findIndex(r => headerColumns(r).sku != null);
    if (h === -1) continue;

    const cols = headerColumns(aoa[h]);
    const rows: SheetRow[] = [];
    let skipped = 0;
    for (let r = h + 1; r < aoa.length; r++) {
      const cells = aoa[r] ?? [];
      const get = (k: ColumnKey) => (cols[k] != null ? cells[cols[k]!] : undefined);
      const text = (k: ColumnKey) => { const s = String(get(k) ?? "").trim(); return s || undefined; };
      const sku = text("sku"), id = text("id");
      if (!sku && !id) {
        if (cells.some(c => String(c ?? "").trim() !== "")) skipped++;
        continue;
      }
      const price = toPrice(get("price"));
      const sale = toPrice(get("salePrice"));
      rows.push({
        line: firstRow + r + 1,
        id, sku,
        name: text("name"), brand: text("brand"), category: text("category"), description: text("description"),
        price,
        // Precio Lista manda: si viene, la fila define el par de precios; si no, no se tocan.
        salePrice: price == null ? undefined : (sale ?? (cols.salePrice != null ? null : undefined)),
        minQty: toCount(get("minQty")) || undefined,
        stock: toCount(get("stock")),
      });
    }
    return { sheetName: wb.SheetNames[i], rows, skipped };
  }

  throw new Error(`No se encontró la columna SKU en ninguna hoja (${wb.SheetNames.join(", ")}). Descargá la planilla desde el panel y completala sin cambiar los encabezados.`);
}

export async function readProductSheet(file: File) {
  return parseProductWorkbook(new Uint8Array(await file.arrayBuffer()));
}

type SheetItem = Partial<Pick<Product, "id" | "sku" | "name" | "brand" | "category" | "description" | "minQty">> & { price?: number; salePrice?: number | null };

export async function buildProductSheet(items: SheetItem[]) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Productos");
  ws.columns = SHEET_COLUMNS.map(c => ({ header: c.header, key: c.key, width: c.width }));
  for (const p of items) {
    ws.addRow({
      sku: p.sku ?? "", name: p.name ?? "", brand: p.brand ?? "", category: p.category ?? "",
      price: p.price ? round2(p.price) : "", salePrice: p.salePrice ? round2(p.salePrice) : "",
      minQty: p.minQty ?? 1, description: p.description ?? "", id: p.id ?? "",
    });
  }
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.getColumn("price").numFmt = "#,##0.00";
  ws.getColumn("salePrice").numFmt = "#,##0.00";
  return wb.xlsx.writeBuffer();
}

export async function downloadProductSheet(items: SheetItem[], fileName: string) {
  const buf = await buildProductSheet(items);
  const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fileName; a.click();
  URL.revokeObjectURL(url);
}

// Devuelve la escritura canónica de un valor conocido sin importar mayúsculas: "mota" → "MOTA".
function canonicalizer(known: unknown[]) {
  const map = new Map<string, string>();
  for (const k of known) {
    const t = String(k ?? "").trim();
    if (t && !map.has(t.toUpperCase())) map.set(t.toUpperCase(), t);
  }
  return (v: string) => map.get(v.trim().toUpperCase()) ?? v.trim();
}

function groupBySku(products: Product[]) {
  const bySku = new Map<string, Product[]>();
  for (const p of products) {
    const sku = String(p.sku ?? "").trim();
    if (!sku) continue;
    bySku.set(sku, [...(bySku.get(sku) ?? []), p]);
  }
  return bySku;
}

const COMPARED: (keyof Product)[] = ["sku", "name", "brand", "category", "description", "price", "salePrice", "minQty", "stock"];
function differs(a: Product, b: Product) {
  return COMPARED.some(k => {
    const x = a[k], y = b[k];
    if (typeof x === "number" || typeof y === "number") return round2(Number(x) || 0) !== round2(Number(y) || 0);
    return String(x ?? "").trim() !== String(y ?? "").trim();
  });
}

// En el catálogo el precio que se ve sale de la tabla prices (por SKU + marca), no de products.
// Por eso cada cambio de precio o descripción también se escribe ahí; si no, queda tapado.
function priceRowsFor(products: Product[], conflicts: string[]): PriceRow[] {
  const groups = new Map<string, Product[]>();
  for (const p of products) {
    const sku = String(p.sku ?? "").trim();
    if (!sku || !(p.price > 0)) continue;
    const key = `${sku}||${p.brand}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const rows: PriceRow[] = [];
  for (const group of groups.values()) {
    const p = group[0];
    const pair = (x: Product) => `${round2(x.price)}|${x.salePrice ? round2(x.salePrice) : ""}`;
    if (group.some(x => pair(x) !== pair(p))) { conflicts.push(String(p.sku).trim()); continue; }
    rows.push({
      sku: String(p.sku).trim(), brand: p.brand, price: round2(p.price),
      sale_price: p.salePrice ? round2(p.salePrice) : null,
      on_sale: Boolean(p.onSale),   // la oferta solo se cambia a mano, nunca por planilla
      description: p.description || null,
    });
  }
  return rows;
}

export type ProductImportPlan = {
  changed: Product[];        // existentes con cambios + nuevos, para /api/products
  updated: number;
  added: number;
  priceRows: PriceRow[];     // para /api/prices
  withoutPrice: string[];    // SKUs nuevos sin Precio Lista
  priceConflicts: string[];  // SKUs repetidos con precios distintos: el precio no se toca
};

// Productos → Importar Excel: actualiza los existentes y crea los SKU que no están.
// Se busca por ID interno; si no viene, por SKU. Si el SKU está repetido en el catálogo (variantes),
// sin ID solo se actualizan precio y descripción, que de todos modos comparten.
export function planProductImport(rows: SheetRow[], products: Product[], known: { brands: string[]; categories: string[] }): ProductImportPlan {
  const brandOf = canonicalizer([...known.brands, ...products.map(p => p.brand)]);
  const categoryOf = canonicalizer([...known.categories, ...products.map(p => p.category)]);
  const byId = new Map(products.map(p => [String(p.id), p]));
  const bySku = groupBySku(products);

  const edited = new Map<string, Product>();
  const pricedIds = new Set<string>();
  const created: Product[] = [];
  const createdKeys = new Set<string>();
  const stamp = Date.now();

  for (const r of rows) {
    const brand = r.brand ? brandOf(r.brand) : undefined;
    const category = r.category ? categoryOf(r.category) : undefined;
    const byIdHit = r.id ? byId.get(r.id) : undefined;
    const targets = byIdHit ? [byIdHit] : (r.sku ? bySku.get(r.sku) ?? [] : []);
    const full = targets.length === 1;

    for (const t of targets) {
      const p = { ...(edited.get(t.id) ?? t) };
      if (r.price != null) p.price = r.price;
      if (r.salePrice !== undefined) p.salePrice = r.salePrice ?? undefined;
      if (r.description != null) p.description = r.description;
      if (full) {
        if (r.sku) p.sku = r.sku;
        if (r.name) p.name = r.name;
        if (brand) p.brand = brand;
        if (category) p.category = category;
        if (r.minQty) p.minQty = r.minQty;
        if (r.stock != null) p.stock = r.stock;
      }
      edited.set(t.id, p);
      if (r.price != null || r.description != null) pricedIds.add(t.id);
    }
    if (targets.length || !r.sku) continue;

    const key = `${r.sku}||${norm(r.name)}`;
    if (createdKeys.has(key)) continue;
    createdKeys.add(key);
    created.push({
      id: `imp-${stamp}-${created.length + 1}`,
      sku: r.sku, name: r.name ?? r.sku, brand: brand ?? "", category: category ?? "",
      description: r.description ?? "", image: "", imageColor: "#64748b", imageIcon: "📦",
      price: r.price ?? 0, salePrice: r.salePrice ?? undefined, onSale: false,
      minQty: r.minQty || 1, stock: r.stock ?? 100,
    });
  }

  const updated = [...edited.values()].filter(p => differs(p, byId.get(String(p.id))!));
  const priceConflicts: string[] = [];
  const priceRows = priceRowsFor([...updated.filter(p => pricedIds.has(p.id)), ...created], priceConflicts);
  return {
    changed: [...updated, ...created],
    updated: updated.length,
    added: created.length,
    priceRows,
    withoutPrice: created.filter(p => !(p.price > 0)).map(p => p.sku),
    priceConflicts,
  };
}

export type PricePreviewRow = {
  sku: string; brand: string; name: string; description: string;
  price: number; sale_price: number | null; onSale: boolean;
  exists: boolean;   // true = se puede importar
  row: SheetRow;
};

// Precios → Subir Excel: solo cambia precio y descripción de productos que ya existen.
// Se busca por ID interno; si no viene, por SKU + marca (sin importar mayúsculas).
export function planPriceImport(rows: SheetRow[], products: Product[], known: { brands: string[] }): PricePreviewRow[] {
  const brandOf = canonicalizer([...known.brands, ...products.map(p => p.brand)]);
  const byId = new Map(products.map(p => [String(p.id), p]));
  const bySku = groupBySku(products);

  const preview = rows.map((r): PricePreviewRow => {
    let p = r.id ? byId.get(r.id) : undefined;
    const sameSku = r.sku ? bySku.get(r.sku) ?? [] : [];
    if (!p && sameSku.length) {
      const wanted = r.brand ? brandOf(r.brand).toUpperCase() : undefined;
      const candidates = sameSku.filter(c => !wanted || String(c.brand).trim().toUpperCase() === wanted);
      if (new Set(candidates.map(c => c.brand)).size === 1) p = candidates[0];
    }
    const sku = p ? String(p.sku ?? "").trim() : (r.sku ?? "");
    const description = r.description ?? p?.description ?? "";
    const price = r.price ?? (r.description != null && p ? p.price : 0);
    const reason =
      !p ? (sameSku.length ? "— la marca no coincide —" : "— SKU no encontrado —")
      : !sku ? "— el producto no tiene SKU —"
      : !(price > 0) ? "— falta Precio Lista —"
      : undefined;
    if (reason) {
      return { row: r, sku, description, brand: p?.brand ?? r.brand ?? "—", name: reason, price: r.price ?? 0, sale_price: r.salePrice ?? null, onSale: false, exists: false };
    }
    return {
      row: r, sku, description, brand: p!.brand, name: p!.name, price,
      sale_price: r.salePrice !== undefined ? r.salePrice : p!.salePrice ?? null,
      onSale: Boolean(p!.onSale), exists: true,
    };
  });

  // Mismo SKU + marca en varias filas con precios distintos: no se sabe cuál vale, no se importa.
  const pairs = new Map<string, Set<string>>();
  for (const r of preview.filter(r => r.exists)) {
    const key = `${r.sku}||${r.brand}`;
    pairs.set(key, (pairs.get(key) ?? new Set()).add(`${r.price}|${r.sale_price ?? ""}`));
  }
  return preview.map(r => r.exists && pairs.get(`${r.sku}||${r.brand}`)!.size > 1
    ? { ...r, name: "— SKU repetido con precios distintos —", exists: false }
    : r);
}
