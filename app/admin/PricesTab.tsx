// @ts-nocheck
"use client";

import { useEffect, useRef, useState } from "react";
import { BRANDS, Product } from "../catalog-data";
import * as XLSX from "xlsx";

const N = {
  navy: "#02152C", navyMid: "#0a2240", amber: "#F4AA24", amberDim: "rgba(244,170,36,.12)",
  bg: "#f0f4f8", surface: "#ffffff", surface2: "#f8fafc",
  border: "#e2e8f0", border2: "#cbd5e1",
  text: "#0f172a", text2: "#475569", text3: "#94a3b8",
  success: "#16a34a", warning: "#d97706", danger: "#dc2626", info: "#2563eb",
};

type PriceRow = { sku: string; brand: string; price: number; sale_price: number | null; on_sale: boolean; description: string | null; };
type PreviewRow = { sku: string; brand: string; name: string; description: string; price: number; sale_price: number | null; exists: boolean; };

function fmt(n: number) { return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }

function Icon({ name, size = 16 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "upload")   return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
  if (name === "download") return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
  if (name === "save")     return <svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
  if (name === "check")    return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (name === "close")    return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (name === "search")   return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
  if (name === "reset")    return <svg {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
  if (name === "percent")  return <svg {...p}><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
  return null;
}

export default function PricesTab({ products, getToken }: { products: Product[]; getToken: () => Promise<string> }) {
  const [supabasePrices, setSupabasePrices] = useState<PriceRow[]>([]);
  const [search, setSearch]     = useState("");
  const [brandFilter, setBrandFilter] = useState("TODAS");
  const [editing, setEditing]   = useState<Record<string, { price: string; sale_price: string; description: string }>>({});
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");

  // Bulk adjustment
  const [bulkBrand, setBulkBrand] = useState("TODAS");
  const [bulkPct, setBulkPct]     = useState("");
  const [bulkType, setBulkType]   = useState<"increase" | "decrease">("increase");
  const [bulkApplying, setBulkApplying] = useState(false);

  // Excel import
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview]   = useState<PreviewRow[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");

  // Load Supabase prices
  useEffect(() => {
    fetch("/api/prices").then(r => r.json()).then(setSupabasePrices).catch(() => {});
  }, []);

  // Merge: products with Supabase overrides applied
  const merged = products.map(p => {
    const ov = supabasePrices.find(r => r.sku === p.sku && r.brand === p.brand);
    return ov
      ? { ...p, price: ov.price, salePrice: ov.sale_price ?? undefined, onSale: ov.on_sale, description: ov.description ?? p.description }
      : p;
  });

  const filtered = merged.filter(p => {
    const matchBrand = brandFilter === "TODAS" || p.brand === brandFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    return matchBrand && matchSearch;
  });

  function key(p: Product) { return `${p.brand}||${p.sku}`; }

  function startEdit(p: Product) {
    setEditing(prev => ({
      ...prev,
      [key(p)]: {
        price:       String(p.price),
        sale_price:  p.salePrice != null ? String(p.salePrice) : "",
        description: p.description ?? "",
      },
    }));
  }

  function cancelEdit(p: Product) {
    setEditing(prev => { const n = { ...prev }; delete n[key(p)]; return n; });
  }

  async function saveOne(p: Product) {
    const ed = editing[key(p)];
    if (!ed) return;
    const price = parseFloat(ed.price) || 0;
    const sale_price = ed.sale_price !== "" ? parseFloat(ed.sale_price) : null;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ rows: [{ sku: p.sku, brand: p.brand, price, sale_price, on_sale: sale_price != null && sale_price < price, description: ed.description || null }] }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSupabasePrices(prev => {
        const next = prev.filter(r => !(r.sku === p.sku && r.brand === p.brand));
        next.push({ sku: p.sku, brand: p.brand, price, sale_price, on_sale: sale_price != null && sale_price < price, description: ed.description || null });
        return next;
      });
      cancelEdit(p);
      setSaveMsg("✓ Guardado");
    } catch (e: any) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  // Bulk adjustment
  async function applyBulk() {
    const pct = parseFloat(bulkPct);
    if (!pct || pct <= 0) return;
    const targets = merged.filter(p => bulkBrand === "TODAS" || p.brand === bulkBrand);
    const factor = bulkType === "increase" ? 1 + pct / 100 : 1 - pct / 100;
    const rows = targets.map(p => ({
      sku: p.sku, brand: p.brand,
      price: Math.round(p.price * factor * 100) / 100,
      sale_price: p.salePrice != null ? Math.round(p.salePrice * factor * 100) / 100 : null,
      on_sale: p.onSale,
      description: p.description ?? null,
    }));
    setBulkApplying(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const fresh = await fetch("/api/prices").then(r => r.json());
      setSupabasePrices(fresh);
      setSaveMsg(`✓ ${rows.length} productos actualizados`);
    } catch (e: any) {
      setSaveMsg("Error: " + e.message);
    } finally {
      setBulkApplying(false);
      setBulkPct("");
      setTimeout(() => setSaveMsg(""), 4000);
    }
  }

  // Download template
  function downloadTemplate() {
    const header = [["SKU", "DESCRIPCION", "PRECIO", "PRECIO_CON_DESCUENTO"]];
    const example = [
      ["AG01", "Aguarrás mineral 1 LT", 3798.30, 3453.00],
      ["2728", 'Canilla esférica metálica 1/2"', 4312.00, 3920.00],
    ];
    const ws = XLSX.utils.aoa_to_sheet([...header, ...example]);
    ws["!cols"] = [{ wch: 14 }, { wch: 50 }, { wch: 14 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Precios");
    XLSX.writeFile(wb, "Plantilla_Precios_Narom.xlsx");
  }

  // Parse uploaded Excel
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportMsg("Leyendo archivo...");
    setPreview(null);
    const reader = new FileReader();
    reader.onerror = () => setImportMsg("Error al leer el archivo. Intentá de nuevo.");
    reader.onload = ev => {
      try {
        setImportMsg("Paso 1: parseando Excel...");
        const data = ev.target?.result;
        if (!data) { setImportMsg("Error: el archivo llegó vacío."); return; }
        let wb: any;
        try {
          wb = XLSX.read(new Uint8Array(data as ArrayBuffer), { type: "array" });
        } catch (xlsxErr: any) {
          setImportMsg("Error XLSX: " + xlsxErr?.message + ". Intentando modo binario...");
          return;
        }
        if (!wb.SheetNames.length) { setImportMsg("El archivo no tiene hojas."); return; }
        setImportMsg("Paso 2: leyendo filas...");
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
        setImportMsg(`Paso 3: ${rows.length} filas leídas. Buscando encabezado...`);

        const hIdx = rows.findIndex(r => r.some(c => /SKU|C[OÓ]D|ART[IÍ]CULO/i.test(String(c))));
        if (hIdx === -1) {
          setImportMsg(`No se encontró columna SKU o Código. Encabezados detectados: ${JSON.stringify(rows[0])}`);
          return;
        }

        const header = rows[hIdx].map(c => String(c).trim());
        const iSku  = header.findIndex(h => /^sku$/i.test(h) || /^c[oó]digo$/i.test(h) || /^c[oó]d\.?$/i.test(h) || /^art[íi]culo$/i.test(h) || /sku/i.test(h));
        const iDesc = header.findIndex(h => /descripci[oó]n/i.test(h) || /^nombre$/i.test(h) || /^detalle$/i.test(h) || /^producto$/i.test(h));
        const iPri  = header.findIndex(h => /^precio$/i.test(h) || /precio\s*lista/i.test(h) || /^price$/i.test(h));
        const iSale = header.findIndex(h => /descuento/i.test(h) || /c\/d/i.test(h) || /precio.{0,4}c.{0,4}d/i.test(h) || /oferta/i.test(h));

        if (iSku === -1) {
          setImportMsg(`Encabezados encontrados: ${JSON.stringify(header)} — no se detectó columna de código.`);
          return;
        }

        setImportMsg(`Paso 4: merged tiene ${merged.length} productos, construyendo mapa...`);
        const dataRows = rows.slice(hIdx + 1).filter(r => r[iSku]);
        const validMerged = merged.filter((p): p is NonNullable<typeof p> => p != null && p.sku != null);
        const skuMap = new Map(validMerged.map(p => [String(p.sku), p]));

        setImportMsg(`Columnas: SKU="${header[iSku]}" Precio="${header[iPri] ?? '—'}" C/D="${header[iSale] ?? '—'}" | ${dataRows.length} filas | ${skuMap.size} productos en catálogo`);

        const parsed: PreviewRow[] = dataRows.map(r => {
          const sku = String(r[iSku]).trim();
          const existing = skuMap.get(sku);
          const rawPrice = iPri >= 0 && r[iPri] != null ? parseFloat(r[iPri]) || 0 : 0;
          const rawSale  = iSale >= 0 && r[iSale] != null ? parseFloat(r[iSale]) || null : null;
          const price     = rawPrice > 0 ? rawPrice : (rawSale ?? 0);
          const sale_price = rawPrice > 0 ? rawSale : null;
          return {
            sku,
            brand:       existing?.brand ?? "—",
            name:        existing?.name  ?? "— no encontrado —",
            description: iDesc >= 0 && r[iDesc] ? String(r[iDesc]).trim() : (existing?.description ?? ""),
            price,
            sale_price,
            exists:      !!existing,
          };
        });
        setPreview(parsed);
      } catch (err: any) {
        setImportMsg("Error al procesar el Excel: " + (err?.message ?? String(err)));
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  }

  async function confirmImport() {
    if (!preview) return;
    const valid = preview.filter(r => r.exists);
    if (!valid.length) return;
    setImporting(true);
    try {
      const token = await getToken();
      const rows = valid.map(r => ({
        sku: r.sku, brand: r.brand,
        price: r.price,
        sale_price: r.sale_price,
        on_sale: r.sale_price != null && r.sale_price < r.price,
        description: r.description || null,
      }));
      const res = await fetch("/api/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      const fresh = await fetch("/api/prices").then(r => r.json());
      setSupabasePrices(fresh);
      setPreview(null);
      setImportMsg(`✓ ${valid.length} precios importados correctamente`);
    } catch (e: any) {
      setImportMsg("Error: " + e.message);
    } finally {
      setImporting(false);
      setTimeout(() => setImportMsg(""), 5000);
    }
  }

  const inputS: React.CSSProperties = { height: 34, padding: "0 10px", borderRadius: 8, border: `1.5px solid ${N.border}`, fontSize: 13, outline: "none", background: N.surface, color: N.text, fontFamily: "inherit", width: "100%", boxSizing: "border-box" };
  const btnS = (bg = N.navy, outline = false): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px",
    borderRadius: 8, border: outline ? `1.5px solid ${bg}` : "none",
    background: outline ? "transparent" : bg, color: outline ? bg : "#fff",
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginBottom: 4 }}>Precios</div>
        <div style={{ fontSize: 14, color: N.text2 }}>Editá precios individualmente, por marca, o importá desde Excel</div>
      </div>

      {saveMsg && (
        <div style={{ background: saveMsg.startsWith("Error") ? "#fef2f2" : "#f0fdf4", border: `1px solid ${saveMsg.startsWith("Error") ? "#fca5a5" : "#86efac"}`, borderRadius: 10, padding: "10px 16px", fontSize: 13, color: saveMsg.startsWith("Error") ? N.danger : N.success, marginBottom: 16 }}>
          {saveMsg}
        </div>
      )}

      {/* ── Ajuste masivo ─────────────────────────────────────────────────── */}
      <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: N.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="percent" size={15} /> Ajuste masivo
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: N.text3, textTransform: "uppercase", letterSpacing: ".08em" }}>Marca</span>
            <select style={{ ...inputS, width: 160 }} value={bulkBrand} onChange={e => setBulkBrand(e.target.value)}>
              <option value="TODAS">Todas las marcas</option>
              {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: N.text3, textTransform: "uppercase", letterSpacing: ".08em" }}>Acción</span>
            <select style={{ ...inputS, width: 140 }} value={bulkType} onChange={e => setBulkType(e.target.value as any)}>
              <option value="increase">Aumentar %</option>
              <option value="decrease">Reducir %</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: N.text3, textTransform: "uppercase", letterSpacing: ".08em" }}>Porcentaje</span>
            <input style={{ ...inputS, width: 100 }} type="number" min="0" step="0.5" placeholder="ej. 10" value={bulkPct} onChange={e => setBulkPct(e.target.value)} />
          </div>
          <button style={btnS(N.navy)} disabled={!bulkPct || bulkApplying} onClick={applyBulk}>
            {bulkApplying ? "Aplicando…" : "Aplicar"}
          </button>
          {bulkPct && (
            <span style={{ fontSize: 12, color: N.text3, alignSelf: "center" }}>
              {bulkBrand === "TODAS" ? merged.length : merged.filter(p => p.brand === bulkBrand).length} productos afectados
            </span>
          )}
        </div>
      </div>

      {/* ── Importar Excel ────────────────────────────────────────────────── */}
      <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: 20, marginBottom: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: N.text, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="upload" size={15} /> Importar desde Excel
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: preview ? 16 : 0 }}>
          <button style={btnS(N.navy, true)} onClick={downloadTemplate}>
            <Icon name="download" size={14} /> Descargar plantilla
          </button>
          <button style={btnS(N.navy)} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={14} /> Subir Excel
          </button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleFile} />
        </div>

        {importMsg && (
          <div style={{ fontSize: 13, color: importMsg.startsWith("Error") ? N.danger : N.success, marginTop: 8 }}>{importMsg}</div>
        )}

        {/* Preview table */}
        {preview && (
          <div>
            <div style={{ fontSize: 13, color: N.text2, marginBottom: preview.filter(r => r.exists).length === 0 ? 6 : 10 }}>
              <strong>{preview.filter(r => r.exists).length}</strong> productos encontrados ·{" "}
              <span style={{ color: preview.filter(r => !r.exists).length > 0 ? N.danger : N.text3 }}>{preview.filter(r => !r.exists).length} SKUs no reconocidos</span>
            </div>
            {preview.length > 0 && preview.filter(r => r.exists).length === 0 && (
              <div style={{ fontSize: 12, color: N.warning, background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "8px 12px", marginBottom: 10 }}>
                Ningún SKU del Excel coincide con los productos del catálogo. Verificá que los códigos sean idénticos (mayúsculas, guiones).
                El primer SKU del archivo: <strong>{preview[0]?.sku}</strong>
              </div>
            )}
            <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${N.border}`, marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: N.surface2 }}>
                    {["SKU","Marca","Nombre","Descripción","Precio","Precio c/d"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 700, color: N.text2, borderBottom: `1px solid ${N.border}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} style={{ background: r.exists ? "transparent" : "#fff5f5", borderBottom: `1px solid ${N.border}` }}>
                      <td style={{ padding: "7px 12px", fontWeight: 700, color: r.exists ? N.text : N.danger }}>{r.sku}</td>
                      <td style={{ padding: "7px 12px", color: N.text2 }}>{r.brand}</td>
                      <td style={{ padding: "7px 12px", color: N.text, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</td>
                      <td style={{ padding: "7px 12px", color: N.text2, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description || "—"}</td>
                      <td style={{ padding: "7px 12px", color: N.text }}>{r.price ? `$ ${fmt(r.price)}` : "—"}</td>
                      <td style={{ padding: "7px 12px", color: r.sale_price ? N.success : N.text3 }}>{r.sale_price ? `$ ${fmt(r.sale_price)}` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={btnS(N.success)} disabled={importing || !preview.some(r => r.exists)} onClick={confirmImport}>
                <Icon name="check" size={14} /> {importing ? "Importando…" : `Confirmar ${preview.filter(r => r.exists).length} productos`}
              </button>
              <button style={btnS("#64748b", true)} onClick={() => { setPreview(null); setImportMsg(""); }}>
                <Icon name="close" size={14} /> Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Tabla de precios ──────────────────────────────────────────────── */}
      <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: N.text, flex: 1 }}>
            Productos ({filtered.length})
          </span>
          <select style={{ ...inputS, width: 160 }} value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
            <option value="TODAS">Todas las marcas</option>
            {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: N.surface2, borderRadius: 8, padding: "0 12px", height: 36, border: `1px solid ${N.border}` }}>
            <Icon name="search" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nombre o SKU…"
              style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: N.text, width: 180, fontFamily: "inherit" }} />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: N.surface2 }}>
                {["SKU","Marca","Nombre","Descripción","Precio","Precio c/d",""].map(h => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: N.text2, borderBottom: `1px solid ${N.border}`, whiteSpace: "nowrap", fontSize: 11, textTransform: "uppercase", letterSpacing: ".06em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const k = key(p);
                const ed = editing[k];
                return (
                  <tr key={k} style={{ borderBottom: `1px solid ${N.border}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = N.surface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <td style={{ padding: "10px 14px", fontWeight: 700, color: N.text, whiteSpace: "nowrap" }}>{p.sku || "—"}</td>
                    <td style={{ padding: "10px 14px", color: N.text2, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, background: N.amberDim, color: N.navy, padding: "2px 8px", borderRadius: 20 }}>{p.brand}</span>
                    </td>
                    <td style={{ padding: "10px 14px", color: N.text, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</td>

                    {ed ? (
                      <>
                        <td style={{ padding: "6px 8px" }}>
                          <input style={{ ...inputS, width: 200 }} value={ed.description} onChange={e => setEditing(prev => ({ ...prev, [k]: { ...prev[k], description: e.target.value } }))} placeholder="Descripción…" />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input style={{ ...inputS, width: 110 }} type="number" value={ed.price} onChange={e => setEditing(prev => ({ ...prev, [k]: { ...prev[k], price: e.target.value } }))} placeholder="Precio" />
                        </td>
                        <td style={{ padding: "6px 8px" }}>
                          <input style={{ ...inputS, width: 110 }} type="number" value={ed.sale_price} onChange={e => setEditing(prev => ({ ...prev, [k]: { ...prev[k], sale_price: e.target.value } }))} placeholder="C/D (opcional)" />
                        </td>
                        <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>
                          <div style={{ display: "flex", gap: 6 }}>
                            <button style={btnS(N.success)} disabled={saving} onClick={() => saveOne(p)}><Icon name="save" size={13} />{saving ? "…" : "Guardar"}</button>
                            <button style={btnS("#64748b", true)} onClick={() => cancelEdit(p)}><Icon name="close" size={13} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ padding: "10px 14px", color: N.text2, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description || "—"}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: p.price > 0 ? N.text : N.text3, whiteSpace: "nowrap" }}>
                          {p.price > 0 ? `$ ${fmt(p.price)}` : "Sin precio"}
                        </td>
                        <td style={{ padding: "10px 14px", color: N.success, whiteSpace: "nowrap" }}>
                          {p.salePrice ? `$ ${fmt(p.salePrice)}` : "—"}
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <button style={btnS(N.navy, true)} onClick={() => startEdit(p)} title="Editar precio">
                            Editar
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
