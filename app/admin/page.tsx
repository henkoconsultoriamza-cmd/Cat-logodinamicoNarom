// @ts-nocheck
"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import {
  APP_SETTINGS_KEY, AppSettings, BRANDS, DEFAULT_APP_SETTINGS, DEFAULT_PRODUCTS,
  PRODUCTS_KEY, Product, cloneProducts,
} from "../catalog-data";
import { supabase } from "../lib/supabase";
import { getOrders, updateOrderStatus, Order, OrderStatus } from "../lib/orders";

function Icon({ name, size = 18 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
  if (name === "back") return <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
  if (name === "save") return <svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
  if (name === "reset") return <svg {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
  if (name === "edit") return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  if (name === "eye") return <svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
  if (name === "eye-off") return <svg {...p}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
  if (name === "check") return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (name === "download") return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
  if (name === "upload") return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
  if (name === "search") return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
  if (name === "close") return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (name === "user") return <svg {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
  if (name === "package") return <svg {...p}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
  return null;
}

const css = (s) => s;
const field = css({ display: "flex", flexDirection: "column", gap: 6 });
const label = css({ fontSize: 12, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase", letterSpacing: ".5px" });
const input = () => css({ height: 40, borderRadius: 8, border: "1.5px solid var(--border)", padding: "0 12px", fontSize: 14, color: "var(--text)", outline: "none", background: "var(--surface)", width: "100%" });

const TABS = ["orders", "clients", "config"] as const;
type Tab = typeof TABS[number];

const COL_STATUS = ["pendiente", "confirmado", "en_preparacion", "entregado"] as const;
const COL_LABEL = { pendiente: "⏳ Pendiente", confirmado: "✅ Confirmado", en_preparacion: "📦 En preparación", entregado: "🚚 Entregado" };
const COL_COLOR = { pendiente: "#b45309", confirmado: "#1d4ed8", en_preparacion: "#7c3aed", entregado: "#16a34a" };
const NEXT_STATUS = { pendiente: "confirmado", confirmado: "en_preparacion", en_preparacion: "entregado", entregado: null };
const PREV_STATUS = { pendiente: null, confirmado: "pendiente", en_preparacion: "confirmado", entregado: "en_preparacion" };

const PAGE = 60;

export default function Admin() {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("orders");

  // Auth
  const [adminUser, setAdminUser] = useState(null);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminLoading, setAdminLoading] = useState(false);

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Clients
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientPass, setNewClientPass] = useState("");
  const [clientMsg, setClientMsg] = useState("");

  // Products filter
  const [prodSearch, setProdSearch] = useState("");
  const [prodBrand, setProdBrand] = useState("Todas");
  const [prodPage, setProdPage] = useState(0);

  const xlsxRef = useRef(null);

  useEffect(() => {
    const s = localStorage.getItem(APP_SETTINGS_KEY);
    if (s) { try { setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(s) }); } catch { localStorage.removeItem(APP_SETTINGS_KEY); } }
    const p = localStorage.getItem(PRODUCTS_KEY);
    if (p) { try { setProducts(JSON.parse(p)); } catch { localStorage.removeItem(PRODUCTS_KEY); } }
    setHydrated(true);
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setAdminUser({ email: u.email ?? "", id: u.id });
    });
  }, []);

  async function loginAdmin(e) {
    e.preventDefault();
    setAdminError(""); setAdminLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPass });
    setAdminLoading(false);
    if (error) { setAdminError("Credenciales incorrectas"); return; }
    const { data } = await supabase.auth.getUser();
    if (data.user) setAdminUser({ email: data.user.email ?? "", id: data.user.id });
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try { setOrders(await getOrders()); } catch { setOrders([]); }
    setOrdersLoading(false);
  }

  async function loadClients() {
    setClientsLoading(true);
    try {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
      if (!error) setClients(data ?? []);
    } catch { setClients([]); }
    setClientsLoading(false);
  }

  async function createClient(e) {
    e.preventDefault();
    setClientMsg("");
    const { data: authData, error: authError } = await supabase.auth.admin?.createUser({
      email: newClientEmail, password: newClientPass, email_confirm: true,
      user_metadata: { name: newClientName }
    }) ?? {};
    if (authError) {
      // Si no tenemos acceso admin, usamos la tabla clients directamente
      const { error } = await supabase.from("clients").insert({ email: newClientEmail, name: newClientName, notes: "" });
      if (error) { setClientMsg("Error: " + error.message); return; }
    }
    setClientMsg("Cliente creado correctamente");
    setNewClientEmail(""); setNewClientName(""); setNewClientPass("");
    loadClients();
  }

  useEffect(() => { if (adminUser && activeTab === "orders") loadOrders(); }, [adminUser, activeTab]);
  useEffect(() => { if (adminUser && activeTab === "clients") loadClients(); }, [adminUser, activeTab]);

  async function moveOrder(id, status) {
    await updateOrderStatus(id, status);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    if (selectedOrder?.id === id) setSelectedOrder(o => ({ ...o, status }));
  }

  function saveSettings() {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function resetAll() {
    if (!confirm("¿Restaurar todos los datos a los valores originales de demo?")) return;
    localStorage.removeItem(APP_SETTINGS_KEY);
    localStorage.removeItem(PRODUCTS_KEY);
    setSettings(DEFAULT_APP_SETTINGS);
    setProducts(cloneProducts(DEFAULT_PRODUCTS));
  }

  function updateProduct(id, key, value) {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [key]: value } : p));
  }

  // ── Excel export ──────────────────────────────────────────────────────────
  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = products.map(p => ({
      SKU: p.sku,
      Nombre: p.name,
      Marca: p.brand,
      Categoria: p.category,
      Precio: p.price,
      PrecioOferta: p.salePrice ?? "",
      EnOferta: p.onSale ? "SI" : "NO",
      Stock: p.stock,
      MinQty: p.minQty,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "Productos_Narom.xlsx");
  }

  // ── Excel import ──────────────────────────────────────────────────────────
  async function importExcel(e) {
    const file = e.target.files[0];
    if (!file) return;
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    let updated = 0;
    setProducts(prev => prev.map(p => {
      const row = rows.find(r => r.SKU === p.sku);
      if (!row) return p;
      updated++;
      return {
        ...p,
        price: Number(row.Precio) || p.price,
        salePrice: row.PrecioOferta ? Number(row.PrecioOferta) : p.salePrice,
        onSale: row.EnOferta === "SI",
        stock: row.Stock !== undefined ? Number(row.Stock) : p.stock,
        minQty: row.MinQty !== undefined ? Number(row.MinQty) : p.minQty,
      };
    }));
    alert(`✅ ${updated} productos actualizados. Guardá los cambios para aplicarlos.`);
    e.target.value = "";
  }

  const accent = settings.accentColor;

  // ── Filtered products ─────────────────────────────────────────────────────
  const filteredProds = products.filter(p => {
    if (prodBrand !== "Todas" && p.brand !== prodBrand) return false;
    if (prodSearch) {
      const q = prodSearch.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    }
    return true;
  });
  const pagedProds = filteredProds.slice(prodPage * PAGE, (prodPage + 1) * PAGE);
  const totalPages = Math.ceil(filteredProds.length / PAGE);

  const S = {
    page: css({ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column" }),
    header: css({ background: "var(--surface)", borderBottom: "1px solid var(--border)", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 10 }),
    title: css({ fontWeight: 700, fontSize: 16 }),
    body: css({ padding: "28px 24px", width: "100%", maxWidth: 1400, margin: "0 auto" }),
    section: css({ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", padding: "24px", marginBottom: 24 }),
    sectionTitle: css({ fontSize: 15, fontWeight: 700, marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid var(--border)" }),
    grid2: css({ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }),
    btn: (color, outlined?) => css({ height: 36, padding: "0 16px", borderRadius: 8, background: outlined ? "transparent" : color, color: outlined ? color : "#fff", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, border: outlined ? `1.5px solid ${color}` : "none", flexShrink: 0, cursor: "pointer" }),
    tag: (color) => css({ fontSize: 11, padding: "2px 8px", borderRadius: 20, background: color + "20", color, fontWeight: 600 }),
  };

  if (!hydrated) return null;

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!adminUser) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 360, background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", padding: 32 }}>
          <img src="/narom-logo.svg" alt="Narom" style={{ height: 32, marginBottom: 20 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Panel de administración</div>
          <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>Ingresá con tu cuenta para administrar el catálogo.</p>
          <form onSubmit={loginAdmin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={field}><span style={label}>Email</span>
              <input type="email" required style={input()} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@narom.com" />
            </div>
            <div style={field}><span style={label}>Contraseña</span>
              <input type="password" required style={input()} value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="••••••••" />
            </div>
            {adminError && <div style={{ color: "#ef4444", fontSize: 13 }}>{adminError}</div>}
            <button type="submit" disabled={adminLoading} style={{ ...S.btn(accent), justifyContent: "center", height: 42 }}>
              {adminLoading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--text3)", textDecoration: "none", fontSize: 13, fontWeight: 500, flexShrink: 0 }}>
          <Icon name="back" size={15} /> Catálogo
        </a>
        <img src="/narom-logo.svg" alt="Narom" style={{ height: 26, width: "auto" }} />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 2, background: "var(--surface2)", borderRadius: 9, padding: 3, marginLeft: 8 }}>
          {([["orders", "📦 Pedidos"], ["clients", "👥 Clientes"], ["config", "⚙️ Catálogo"]] as const).map(([tab, lbl]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ height: 30, padding: "0 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, background: activeTab === tab ? "var(--surface)" : "transparent", color: activeTab === tab ? "var(--text)" : "var(--text3)", border: activeTab === tab ? "1px solid var(--border)" : "none", cursor: "pointer" }}>
              {lbl}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {activeTab === "config" && <>
          <button style={S.btn("#64748b", true)} onClick={resetAll}><Icon name="reset" size={14} />Restaurar</button>
          <button style={S.btn(accent)} onClick={saveSettings}>
            {saved ? <><Icon name="check" size={14} />Guardado</> : <><Icon name="save" size={14} />Guardar</>}
          </button>
        </>}
        <button style={S.btn("#64748b", true)} onClick={() => { supabase.auth.signOut(); setAdminUser(null); }}>
          <Icon name="back" size={14} />Salir
        </button>
      </header>

      <div style={S.body}>

        {/* ── PEDIDOS ──────────────────────────────────────────────────────── */}
        {activeTab === "orders" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: "var(--text3)" }}>
                {ordersLoading ? "Cargando…" : `${orders.length} pedido${orders.length !== 1 ? "s" : ""}`}
              </span>
              <button style={S.btn(accent, true)} onClick={loadOrders}><Icon name="reset" size={13} />Actualizar</button>
            </div>

            {/* Kanban horizontal */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "start" }}>
              {COL_STATUS.map(col => {
                const colOrders = orders.filter(o => o.status === col);
                return (
                  <div key={col} style={{ background: "var(--surface)", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
                    {/* Column header */}
                    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8, background: COL_COLOR[col] + "12" }}>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>{COL_LABEL[col]}</span>
                      <span style={{ fontSize: 11, background: COL_COLOR[col] + "25", color: COL_COLOR[col], padding: "1px 7px", borderRadius: 20, fontWeight: 700, marginLeft: "auto" }}>{colOrders.length}</span>
                    </div>

                    {/* Cards */}
                    <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
                      {colOrders.length === 0 && (
                        <div style={{ fontSize: 12, color: "var(--text3)", textAlign: "center", padding: "20px 0" }}>Sin pedidos</div>
                      )}
                      {colOrders.map(o => (
                        <div key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          style={{ background: "var(--surface2)", borderRadius: 10, padding: 12, cursor: "pointer", border: "1px solid var(--border)" }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = COL_COLOR[col] + "60"}
                          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{o.client_name}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 6 }}>
                            {new Date(o.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text2)", marginBottom: 8 }}>
                            {o.items.length} producto{o.items.length !== 1 ? "s" : ""}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: accent }}>$ {o.total.toLocaleString("es-AR")}</span>
                            <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                              {PREV_STATUS[col] && (
                                <button onClick={() => moveOrder(o.id, PREV_STATUS[col])}
                                  style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, border: "1px solid var(--border2)", color: "var(--text3)", fontWeight: 600, cursor: "pointer", background: "transparent" }}>←</button>
                              )}
                              {NEXT_STATUS[col] && (
                                <button onClick={() => moveOrder(o.id, NEXT_STATUS[col])}
                                  style={{ fontSize: 10, padding: "3px 7px", borderRadius: 5, background: COL_COLOR[NEXT_STATUS[col]] + "22", color: COL_COLOR[NEXT_STATUS[col]], border: "none", fontWeight: 600, cursor: "pointer" }}>→</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── CLIENTES ─────────────────────────────────────────────────────── */}
        {activeTab === "clients" && (
          <div>
            {/* Crear cliente */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Nuevo cliente</div>
              <form onSubmit={createClient} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 12, alignItems: "end" }}>
                <div style={field}>
                  <span style={label}>Nombre</span>
                  <input style={input()} required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nombre del negocio" />
                </div>
                <div style={field}>
                  <span style={label}>Email</span>
                  <input type="email" style={input()} required value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="cliente@ejemplo.com" />
                </div>
                <div style={field}>
                  <span style={label}>Contraseña inicial</span>
                  <input type="text" style={input()} required value={newClientPass} onChange={e => setNewClientPass(e.target.value)} placeholder="mínimo 6 caracteres" />
                </div>
                <button type="submit" style={S.btn(accent)}>Crear</button>
              </form>
              {clientMsg && <div style={{ marginTop: 12, fontSize: 13, color: clientMsg.startsWith("Error") ? "#ef4444" : "#16a34a" }}>{clientMsg}</div>}
            </div>

            {/* Lista clientes */}
            <div style={S.section}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={S.sectionTitle}>Clientes registrados ({clients.length})</div>
                <button style={S.btn(accent, true)} onClick={loadClients}><Icon name="reset" size={13} />Actualizar</button>
              </div>
              {clientsLoading && <div style={{ color: "var(--text3)", fontSize: 13 }}>Cargando…</div>}
              {!clientsLoading && clients.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--text3)" }}>
                  Todavía no hay clientes.<br />
                  <span style={{ fontSize: 12 }}>Nota: los clientes se crean directamente desde Supabase → Authentication → Users con "Auto confirm user" tildado.</span>
                </div>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {clients.map(c => (
                  <div key={c.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--surface2)", display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: accent + "22", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {(c.name || c.email || "?")[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>{c.email}</div>
                    </div>
                    {c.notes && <div style={{ fontSize: 12, color: "var(--text3)", maxWidth: 200 }}>{c.notes}</div>}
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      {orders.filter(o => o.client_email === c.email).length} pedidos
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── CATÁLOGO / CONFIG ─────────────────────────────────────────────── */}
        {activeTab === "config" && (
          <div>
            {/* Negocio */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Configuración del negocio</div>
              <div style={S.grid2}>
                <div style={field}><span style={label}>Nombre del negocio</span>
                  <input style={input()} value={settings.businessName} onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))} />
                </div>
                <div style={field}><span style={label}>Tagline</span>
                  <input style={input()} value={settings.tagline} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} />
                </div>
                <div style={field}><span style={label}>Sigla / Logo texto</span>
                  <input style={input()} value={settings.logoText} maxLength={3} onChange={e => setSettings(s => ({ ...s, logoText: e.target.value }))} />
                </div>
                <div style={field}><span style={label}>Color de acento</span>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input type="color" value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} style={{ width: 44, height: 40, border: "1.5px solid var(--border)", borderRadius: 8, padding: 3, cursor: "pointer" }} />
                    <input style={{ ...input(), flex: 1 }} value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} />
                  </div>
                </div>
                <div style={field}><span style={label}>Moneda</span>
                  <select style={{ ...input(), appearance: "none" }} value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}>
                    <option value="ARS">ARS — Peso argentino</option>
                    <option value="USD">USD — Dólar</option>
                    <option value="BRL">BRL — Real</option>
                  </select>
                </div>
                <div style={field}><span style={label}>WhatsApp (sin +)</span>
                  <input style={input()} value={settings.whatsappNumber} onChange={e => setSettings(s => ({ ...s, whatsappNumber: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginTop: 16, padding: 14, background: "var(--surface2)", borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{settings.logoText}</div>
                <div>
                  <div style={{ fontWeight: 700 }}>{settings.businessName}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{settings.tagline}</div>
                </div>
              </div>
            </div>

            {/* Productos */}
            <div style={S.section}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ ...S.sectionTitle, marginBottom: 0, paddingBottom: 0, borderBottom: "none", flex: 1 }}>
                  Productos ({filteredProds.length} de {products.length})
                </div>

                {/* Buscar */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface2)", borderRadius: 8, padding: "0 12px", height: 36 }}>
                  <Icon name="search" size={14} />
                  <input value={prodSearch} onChange={e => { setProdSearch(e.target.value); setProdPage(0); }}
                    placeholder="Buscar nombre o SKU…" style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: "var(--text)", width: 180 }} />
                </div>

                {/* Filtro marca */}
                <select value={prodBrand} onChange={e => { setProdBrand(e.target.value); setProdPage(0); }}
                  style={{ height: 36, borderRadius: 8, border: "1.5px solid var(--border)", padding: "0 10px", fontSize: 13, background: "var(--surface2)", color: "var(--text)", outline: "none" }}>
                  <option>Todas</option>
                  {BRANDS.map(b => <option key={b}>{b}</option>)}
                </select>

                {/* Excel */}
                <button style={S.btn("#16a34a", true)} onClick={exportExcel}><Icon name="download" size={14} />Exportar Excel</button>
                <button style={S.btn("#1d4ed8", true)} onClick={() => xlsxRef.current?.click()}><Icon name="upload" size={14} />Importar Excel</button>
                <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importExcel} />
              </div>

              <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 12 }}>
                El Excel de importación debe tener las columnas: SKU · Precio · PrecioOferta · EnOferta (SI/NO) · Stock · MinQty
              </div>

              {pagedProds.map(p => {
                const isEditing = editingId === p.id;
                return (
                  <div key={p.id} style={{ padding: "12px 0", borderBottom: "1px solid var(--surface2)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>{p.brand} · {p.category} · SKU {p.sku}</div>
                        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                          <span style={S.tag(p.onSale ? "#dc2626" : accent)}>{p.onSale && p.salePrice ? `Oferta: $${p.salePrice}` : `$${p.price}`} {settings.currency}</span>
                          <span style={S.tag(p.stock > 0 ? "#16a34a" : "#dc2626")}>{p.stock > 0 ? `Stock: ${p.stock}` : "Sin stock"}</span>
                          <span style={S.tag("#64748b")}>Mín. {p.minQty}</span>
                        </div>
                      </div>
                      <button style={S.btn(isEditing ? accent : "var(--text2)", !isEditing)} onClick={() => setEditingId(isEditing ? null : p.id)}>
                        <Icon name="edit" size={13} />{isEditing ? "Cerrar" : "Editar"}
                      </button>
                    </div>

                    {isEditing && (
                      <div style={{ marginTop: 10, background: "var(--surface2)", borderRadius: 10, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
                        <div style={field}><span style={label}>Precio</span>
                          <input type="number" style={input()} value={p.price} onChange={e => updateProduct(p.id, "price", Number(e.target.value))} />
                        </div>
                        <div style={field}><span style={label}>Stock</span>
                          <input type="number" style={input()} value={p.stock} onChange={e => updateProduct(p.id, "stock", Number(e.target.value))} />
                        </div>
                        <div style={field}><span style={label}>Min. qty</span>
                          <input type="number" style={input()} value={p.minQty} onChange={e => updateProduct(p.id, "minQty", Number(e.target.value))} />
                        </div>
                        <div style={field}><span style={label}>Precio oferta</span>
                          <input type="number" style={input()} value={p.salePrice ?? ""} onChange={e => updateProduct(p.id, "salePrice", Number(e.target.value) || undefined)} />
                        </div>
                        <div style={{ ...field, gridColumn: "1 / -1" }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                            <input type="checkbox" checked={p.onSale} onChange={e => updateProduct(p.id, "onSale", e.target.checked)} />
                            Marcar como oferta
                          </label>
                        </div>
                        <div style={{ ...field, gridColumn: "1 / -1" }}>
                          <span style={label}>Tag</span>
                          <input style={input()} value={p.tag ?? ""} placeholder='Nuevo, Más vendido…' onChange={e => updateProduct(p.id, "tag", e.target.value || undefined)} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Paginación */}
              {totalPages > 1 && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20 }}>
                  <button disabled={prodPage === 0} style={S.btn("#64748b", true)} onClick={() => setProdPage(p => p - 1)}>← Anterior</button>
                  <span style={{ fontSize: 13, color: "var(--text3)" }}>Página {prodPage + 1} de {totalPages}</span>
                  <button disabled={prodPage >= totalPages - 1} style={S.btn("#64748b", true)} onClick={() => setProdPage(p => p + 1)}>Siguiente →</button>
                </div>
              )}
            </div>

            <div style={{ textAlign: "center", padding: "4px 0 32px", fontSize: 12, color: "var(--text3)" }}>
              Catálogo Dinámico · Desarrollado por <a href="https://henkoconsultoria.com" style={{ color: accent, textDecoration: "none", fontWeight: 600 }}>Henko Consultoría</a>
            </div>
          </div>
        )}
      </div>

      {/* ── Modal detalle pedido ─────────────────────────────────────────────── */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSelectedOrder(null)}>
          <div style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", width: "100%", maxWidth: 520, maxHeight: "80vh", overflow: "auto" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{selectedOrder.client_name}</div>
                <div style={{ fontSize: 13, color: "var(--text3)" }}>{selectedOrder.client_email}</div>
                <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 2 }}>
                  {new Date(selectedOrder.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ color: "var(--text3)", background: "transparent", border: "none", cursor: "pointer" }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Estado */}
            <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text3)" }}>ESTADO</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COL_COLOR[selectedOrder.status], background: COL_COLOR[selectedOrder.status] + "20", padding: "3px 12px", borderRadius: 20 }}>
                {COL_LABEL[selectedOrder.status]}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {PREV_STATUS[selectedOrder.status] && (
                  <button onClick={() => moveOrder(selectedOrder.id, PREV_STATUS[selectedOrder.status])}
                    style={{ ...S.btn("#64748b", true), height: 30, fontSize: 12 }}>← Atrás</button>
                )}
                {NEXT_STATUS[selectedOrder.status] && (
                  <button onClick={() => moveOrder(selectedOrder.id, NEXT_STATUS[selectedOrder.status])}
                    style={{ ...S.btn(COL_COLOR[NEXT_STATUS[selectedOrder.status]]), height: 30, fontSize: 12 }}>Avanzar →</button>
                )}
              </div>
            </div>

            {/* Items */}
            <div style={{ padding: "16px 24px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text2)", marginBottom: 12 }}>PRODUCTOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedOrder.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--surface2)", borderRadius: 8 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{it.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>{it.brand} · SKU {it.sku}</div>
                    </div>
                    <div style={{ textAlign: "right" as const }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{it.quantity}×</div>
                      <div style={{ fontSize: 12, color: "var(--text3)" }}>$ {it.unitPrice.toLocaleString("es-AR")}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "var(--text3)" }}>Total</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>$ {selectedOrder.total.toLocaleString("es-AR")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
