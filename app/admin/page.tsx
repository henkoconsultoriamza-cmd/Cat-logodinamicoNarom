// @ts-nocheck
"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import {
  APP_SETTINGS_KEY, AppSettings, BRANDS, DEFAULT_APP_SETTINGS, DEFAULT_PRODUCTS,
  PRODUCTS_KEY, Product, cloneProducts,
} from "../catalog-data";
import { supabase } from "../lib/supabase";
import { Order, OrderStatus } from "../lib/orders";

// ── Icons ────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18 }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "home") return <svg {...p}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
  if (name === "package") return <svg {...p}><path d="M16.5 9.4 7.55 4.24"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
  if (name === "users") return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
  if (name === "settings") return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  if (name === "back") return <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
  if (name === "save") return <svg {...p}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
  if (name === "reset") return <svg {...p}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>;
  if (name === "edit") return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
  if (name === "check") return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (name === "download") return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
  if (name === "upload") return <svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
  if (name === "search") return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
  if (name === "close") return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (name === "logout") return <svg {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
  if (name === "trend-up") return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
  if (name === "box") return <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
  if (name === "clock") return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
  if (name === "dollar") return <svg {...p}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
  if (name === "catalog") return <svg {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
  return null;
}

// ── Narom brand colors ───────────────────────────────────────────────────────
const N = {
  navy: "#02152C",
  navyMid: "#0a2240",
  amber: "#F4AA24",
  amberDim: "rgba(244,170,36,.12)",
  amberBright: "#FFBC3B",
  bg: "#f0f4f8",
  surface: "#ffffff",
  surface2: "#f8fafc",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  text: "#0f172a",
  text2: "#475569",
  text3: "#94a3b8",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#2563eb",
};

const COL_STATUS = ["pendiente", "confirmado", "en_preparacion", "entregado"] as const;
const COL_LABEL = { pendiente: "Pendiente", confirmado: "Confirmado", en_preparacion: "En preparación", entregado: "Entregado" };
const COL_COLOR = { pendiente: "#d97706", confirmado: "#2563eb", en_preparacion: "#7c3aed", entregado: "#16a34a" };
const NEXT_STATUS = { pendiente: "confirmado", confirmado: "en_preparacion", en_preparacion: "entregado", entregado: null };
const PREV_STATUS = { pendiente: null, confirmado: "pendiente", en_preparacion: "confirmado", entregado: "en_preparacion" };
const PAGE = 60;

// ── Shared style helpers ─────────────────────────────────────────────────────
const field = { display: "flex", flexDirection: "column" as const, gap: 6 };
const labelS = { fontSize: 11, fontWeight: 700, color: N.text2, textTransform: "uppercase" as const, letterSpacing: ".6px" };
const inputS = { height: 40, borderRadius: 8, border: `1.5px solid ${N.border}`, padding: "0 12px", fontSize: 14, color: N.text, outline: "none", background: N.surface, width: "100%", fontFamily: "inherit" };

function btn(color = N.amber, outlined = false) {
  return {
    height: 36, padding: "0 16px", borderRadius: 8,
    background: outlined ? "transparent" : color,
    color: outlined ? color : (color === N.amber ? N.navy : "#fff"),
    fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center",
    gap: 6, border: outlined ? `1.5px solid ${color}` : "none",
    flexShrink: 0, cursor: "pointer", fontFamily: "inherit",
  };
}

function tag(color: string, text: string) {
  return (
    <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 20, background: color + "18", color, fontWeight: 700, display: "inline-flex", alignItems: "center" }}>
      {text}
    </span>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color, accent }: any) {
  return (
    <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: "20px 24px", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: N.text2, textTransform: "uppercase", letterSpacing: ".07em" }}>{label}</span>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: (color || accent) + "15", display: "flex", alignItems: "center", justifyContent: "center", color: color || accent }}>
          <Icon name={icon} size={17} />
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 900, color: N.text, lineHeight: 1, letterSpacing: "-1px" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: N.text3 }}>{sub}</div>}
    </div>
  );
}

// ── Mini stat (secondary row) ────────────────────────────────────────────────
function MiniStat({ label, value, color }: any) {
  return (
    <div style={{ background: N.surface, borderRadius: 10, border: `1px solid ${N.border}`, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 11, color: N.text3, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      <span style={{ fontSize: 22, fontWeight: 800, color: color || N.text }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [settings, setSettings] = useState(DEFAULT_APP_SETTINGS);
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");

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
  const [editingOrder, setEditingOrder] = useState(false);
  const [editOrderNotes, setEditOrderNotes] = useState("");
  const [draggedOrderId, setDraggedOrderId] = useState<string | null>(null);

  // Clients
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientBusiness, setNewClientBusiness] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientStreet, setNewClientStreet] = useState("");
  const [newClientStreetNum, setNewClientStreetNum] = useState("");
  const [newClientCity, setNewClientCity] = useState("");
  const [newClientTax, setNewClientTax] = useState("");
  const [newClientPass, setNewClientPass] = useState("");
  const [clientMsg, setClientMsg] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [editingClient, setEditingClient] = useState(false);
  const [editFields, setEditFields] = useState<any>({});
  const [editMsg, setEditMsg] = useState("");

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
      if (u && u.app_metadata?.is_admin) setAdminUser({ email: u.email ?? "", id: u.id });
    });
  }, []);

  async function loginAdmin(e) {
    e.preventDefault();
    setAdminError(""); setAdminLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: adminEmail, password: adminPass });
    setAdminLoading(false);
    if (error) { setAdminError("Credenciales incorrectas"); return; }
    const { data } = await supabase.auth.getUser();
    const u = data.user;
    if (!u) return;
    if (!u.app_metadata?.is_admin) {
      await supabase.auth.signOut();
      setAdminError("No tenés acceso al panel de administración.");
      return;
    }
    setAdminUser({ email: u.email ?? "", id: u.id });
  }

  async function loadOrders() {
    setOrdersLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/list-orders", { headers: { "Authorization": `Bearer ${token}` } });
      const json = await res.json();
      if (!json.error) setOrders(json.orders ?? []);
    } catch { setOrders([]); }
    setOrdersLoading(false);
  }

  async function getToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? "";
  }

  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
  }

  async function loadClients() {
    setClientsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/list-clients", { headers: { "Authorization": `Bearer ${token}` } });
      const json = await res.json();
      if (!json.error) setClients(json.clients ?? []);
    } catch { setClients([]); }
    setClientsLoading(false);
  }

  async function createClient(e) {
    e.preventDefault();
    setClientMsg("");
    if (!newClientPass || newClientPass.length < 6) {
      setClientMsg("La contraseña debe tener al menos 6 caracteres");
      return;
    }
    const headers = await authHeaders();
    const address = [newClientStreet, newClientStreetNum, newClientCity].filter(Boolean).join(", ");
    const res = await fetch("/api/create-client", {
      method: "POST",
      headers,
      body: JSON.stringify({ email: newClientEmail, password: newClientPass, name: newClientName, business: newClientBusiness, phone: newClientPhone, address, street: newClientStreet, street_number: newClientStreetNum, city: newClientCity, tax_id: newClientTax }),
    });
    const json = await res.json();
    if (json.error) { setClientMsg("Error: " + json.error); return; }
    setClientMsg("✓ Cliente creado correctamente");
    setNewClientEmail(""); setNewClientName(""); setNewClientBusiness(""); setNewClientPhone("");
    setNewClientStreet(""); setNewClientStreetNum(""); setNewClientCity(""); setNewClientTax(""); setNewClientPass("");
    loadClients();
  }

  useEffect(() => {
    if (adminUser) {
      loadOrders();
      loadClients();
    }
  }, [adminUser]);

  useEffect(() => { if (adminUser && activeTab === "orders") loadOrders(); }, [activeTab]);
  useEffect(() => { if (adminUser && activeTab === "clients") loadClients(); }, [activeTab]);

  async function moveOrder(id, status) {
    const headers = await authHeaders();
    await fetch("/api/update-order", { method: "PATCH", headers, body: JSON.stringify({ id, status }) });
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

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const rows = products.map(p => ({
      SKU: p.sku, Nombre: p.name, Marca: p.brand, Categoria: p.category,
      Precio: p.price, PrecioOferta: p.salePrice ?? "", EnOferta: p.onSale ? "SI" : "NO",
      Stock: p.stock, MinQty: p.minQty,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 16 }, { wch: 40 }, { wch: 14 }, { wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "Productos_Narom.xlsx");
  }

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
      return { ...p, price: Number(row.Precio) || p.price, salePrice: row.PrecioOferta ? Number(row.PrecioOferta) : p.salePrice, onSale: row.EnOferta === "SI", stock: row.Stock !== undefined ? Number(row.Stock) : p.stock, minQty: row.MinQty !== undefined ? Number(row.MinQty) : p.minQty };
    }));
    alert(`✅ ${updated} productos actualizados. Guardá los cambios para aplicarlos.`);
    e.target.value = "";
  }

  // ── Derived stats ────────────────────────────────────────────────────────
  const pendingOrders = orders.filter(o => o.status === "pendiente").length;
  const confirmedOrders = orders.filter(o => o.status === "confirmado").length;
  const inPrepOrders = orders.filter(o => o.status === "en_preparacion").length;
  const deliveredOrders = orders.filter(o => o.status === "entregado").length;
  const totalRevenue = orders.reduce((acc, o) => acc + (o.total || 0), 0);
  const onSaleCount = products.filter(p => p.onSale).length;
  const noStockCount = products.filter(p => p.stock === 0).length;

  // ── Filtered products ────────────────────────────────────────────────────
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

  if (!hydrated) return null;

  // ── Login screen ──────────────────────────────────────────────────────────
  if (!adminUser) {
    return (
      <div style={{ minHeight: "100vh", background: `linear-gradient(135deg, ${N.navy} 0%, #0a2240 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 380, background: N.surface, borderRadius: 20, padding: "40px 36px", boxShadow: "0 30px 80px rgba(0,0,0,.35)" }}>
          <img src="/narom-logo.svg" alt="Narom" style={{ height: 38, marginBottom: 8, filter: "invert(1)" }} />
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: N.amber, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 4 }}>Panel de administración</div>
            <div style={{ fontSize: 14, color: N.text2 }}>Ingresá con tu cuenta para continuar.</div>
          </div>
          <form onSubmit={loginAdmin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={field}>
              <span style={labelS}>Email</span>
              <input type="email" required style={inputS} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@naromgroup.com.ar" />
            </div>
            <div style={field}>
              <span style={labelS}>Contraseña</span>
              <input type="password" required style={inputS} value={adminPass} onChange={e => setAdminPass(e.target.value)} placeholder="••••••••" />
            </div>
            {adminError && <div style={{ color: N.danger, fontSize: 13, fontWeight: 600 }}>{adminError}</div>}
            <button type="submit" disabled={adminLoading}
              style={{ ...btn(N.amber), justifyContent: "center", height: 44, fontSize: 14, marginTop: 4, borderRadius: 10 }}>
              {adminLoading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Nav item ──────────────────────────────────────────────────────────────
  function NavItem({ id, icon, label, count }: { id: string, icon: string, label: string, count?: number }) {
    const isActive = activeTab === id;
    return (
      <button onClick={() => setActiveTab(id)} style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        height: 42, padding: "0 14px", borderRadius: 9, border: "none",
        background: isActive ? N.amberDim : "transparent",
        color: isActive ? N.amber : "rgba(255,255,255,.55)",
        fontSize: 13, fontWeight: isActive ? 700 : 500, cursor: "pointer",
        transition: "all .15s ease", textAlign: "left",
        borderLeft: isActive ? `3px solid ${N.amber}` : "3px solid transparent",
      }}
        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <Icon name={icon} size={16} />
        <span style={{ flex: 1 }}>{label}</span>
        {count !== undefined && count > 0 && (
          <span style={{ fontSize: 11, fontWeight: 800, background: isActive ? N.amber : "rgba(255,255,255,.12)", color: isActive ? N.navy : "rgba(255,255,255,.6)", padding: "1px 7px", borderRadius: 20 }}>{count}</span>
        )}
      </button>
    );
  }

  // ── Page chrome ───────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: N.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{ width: 220, background: N.navy, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50, overflowY: "auto" }}>

        {/* Logo */}
        <div style={{ padding: "24px 18px 20px" }}>
          <img src="/narom-logo.svg" alt="Narom Group" style={{ height: 44, width: "auto" }} />
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".14em", textTransform: "uppercase", marginTop: 6 }}>
            Panel de administración
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "0 14px 12px" }} />

        {/* Nav */}
        <nav style={{ padding: "0 8px", flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.25)", letterSpacing: ".14em", textTransform: "uppercase", padding: "0 14px", marginBottom: 4, marginTop: 4 }}>
            GESTIÓN
          </div>

          <NavItem id="dashboard" icon="home" label="Inicio" />
          <NavItem id="orders" icon="package" label="Pedidos" count={pendingOrders} />
          <NavItem id="clients" icon="users" label="Clientes" count={clients.length} />

          <div style={{ height: 1, background: "rgba(255,255,255,.08)", margin: "12px 6px" }} />
          <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,.25)", letterSpacing: ".14em", textTransform: "uppercase", padding: "0 14px", marginBottom: 4 }}>
            CONFIGURACIÓN
          </div>

          <NavItem id="config" icon="settings" label="Catálogo" />

          <div style={{ flex: 1 }} />
        </nav>

        {/* Divider + Catálogo link + Logout */}
        <div style={{ padding: "12px 8px 20px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 14px", borderRadius: 9, color: "rgba(255,255,255,.45)", textDecoration: "none", fontSize: 13, fontWeight: 500, marginBottom: 4 }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.06)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Icon name="back" size={15} />
            <span>Ver catálogo</span>
          </a>
          <button onClick={() => { supabase.auth.signOut(); setAdminUser(null); }}
            style={{ display: "flex", alignItems: "center", gap: 10, height: 38, padding: "0 14px", borderRadius: 9, background: "transparent", color: "rgba(255,255,255,.35)", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, width: "100%" }}
            onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.35)"}
          >
            <Icon name="logout" size={15} />
            <span>Salir</span>
          </button>

          {/* User info */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 0", marginTop: 8, borderTop: "1px solid rgba(255,255,255,.06)" }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: N.amber, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: N.navy, flexShrink: 0 }}>
              {(adminUser.email?.[0] || "A").toUpperCase()}
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{adminUser.email}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.3)" }}>Administrador</div>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{ background: N.surface, borderBottom: `1px solid ${N.border}`, padding: "0 32px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 40 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: N.amber, letterSpacing: ".12em", textTransform: "uppercase" }}>
              NAROM GROUP · {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {activeTab === "config" && (
              <>
                <button style={btn("#64748b", true)} onClick={resetAll}><Icon name="reset" size={14} />Restaurar</button>
                <button style={btn(N.amber)} onClick={saveSettings}>
                  {saved ? <><Icon name="check" size={14} />Guardado</> : <><Icon name="save" size={14} />Guardar cambios</>}
                </button>
              </>
            )}
            {activeTab === "orders" && (
              <button style={btn(N.navy, true)} onClick={loadOrders}><Icon name="reset" size={14} />Actualizar</button>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: "32px 32px 48px" }}>

          {/* ── DASHBOARD ──────────────────────────────────────────────── */}
          {activeTab === "dashboard" && (
            <div>
              {/* Greeting */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: N.amber, letterSpacing: ".14em", textTransform: "uppercase", marginBottom: 6 }}>
                  CENTRO DE OPERACIONES
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: N.text, lineHeight: 1.1, marginBottom: 6 }}>
                  Panel Narom Group
                </div>
                <div style={{ fontSize: 14, color: N.text2 }}>
                  {orders.length} pedidos en total · {products.length.toLocaleString("es-AR")} productos en catálogo
                </div>
              </div>

              {/* Main stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
                <StatCard icon="clock" label="Pedidos pendientes" value={pendingOrders} sub="Esperando confirmación" color={N.warning} accent={N.amber} />
                <StatCard icon="package" label="En preparación" value={inPrepOrders} sub="Siendo procesados" color="#7c3aed" accent={N.amber} />
                <StatCard icon="users" label="Clientes activos" value={clients.length} sub="Distribuidores registrados" color={N.info} accent={N.amber} />
                <StatCard icon="box" label="Productos" value={products.length.toLocaleString("es-AR")} sub={`${BRANDS.length} marcas en catálogo`} color={N.success} accent={N.amber} />
              </div>

              {/* Secondary stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 28 }}>
                <MiniStat label="Confirmados" value={confirmedOrders} color={N.info} />
                <MiniStat label="Entregados" value={deliveredOrders} color={N.success} />
                <MiniStat label="Total pedidos" value={orders.length} />
                <MiniStat label="En oferta" value={onSaleCount} color={N.warning} />
                <MiniStat label="Sin stock" value={noStockCount} color={noStockCount > 0 ? N.danger : N.text3} />
              </div>

              {/* Status pipeline */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Orders by status */}
                <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: 24 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: N.text2, letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 16 }}>PEDIDOS POR ESTADO</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {COL_STATUS.map(s => {
                      const c = orders.filter(o => o.status === s).length;
                      const pct = orders.length ? Math.round(c / orders.length * 100) : 0;
                      return (
                        <div key={s}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: N.text }}>{COL_LABEL[s]}</span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: COL_COLOR[s] }}>{c}</span>
                          </div>
                          <div style={{ height: 6, borderRadius: 4, background: N.border }}>
                            <div style={{ height: 6, borderRadius: 4, background: COL_COLOR[s], width: `${pct}%`, transition: "width .5s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent orders */}
                <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: 24 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: N.text2, letterSpacing: ".1em", textTransform: "uppercase" }}>ÚLTIMOS PEDIDOS</div>
                    <button onClick={() => setActiveTab("orders")} style={{ fontSize: 12, color: N.amber, fontWeight: 700, background: "none", border: "none", cursor: "pointer" }}>
                      Ver todos →
                    </button>
                  </div>
                  {orders.length === 0 && (
                    <div style={{ fontSize: 13, color: N.text3, textAlign: "center", padding: "20px 0" }}>Sin pedidos aún</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${N.border2}` }}>
                        <div style={{ width: 34, height: 34, borderRadius: 8, background: COL_COLOR[o.status] + "18", display: "flex", alignItems: "center", justifyContent: "center", color: COL_COLOR[o.status], flexShrink: 0, fontSize: 13, fontWeight: 800 }}>
                          {(o.client_name?.[0] || "?").toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: N.text }}>{o.client_name}</div>
                          <div style={{ fontSize: 11, color: N.text3 }}>{o.items?.length || 0} productos</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 13, fontWeight: 800, color: N.text }}>$ {o.total?.toLocaleString("es-AR")}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: COL_COLOR[o.status] }}>{COL_LABEL[o.status]}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── PEDIDOS ──────────────────────────────────────────────────── */}
          {activeTab === "orders" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginBottom: 4 }}>Pedidos</div>
                <div style={{ fontSize: 14, color: N.text2 }}>{ordersLoading ? "Cargando…" : `${orders.length} pedido${orders.length !== 1 ? "s" : ""} en total`}</div>
              </div>

              {/* Kanban */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, alignItems: "start" }}>
                {COL_STATUS.map(col => {
                  const colOrders = orders.filter(o => o.status === col);
                  return (
                    <div key={col}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); if (draggedOrderId) { moveOrder(draggedOrderId, col); setDraggedOrderId(null); } }}
                      style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, overflow: "hidden", transition: "border-color .15s" }}>
                      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: 8, background: COL_COLOR[col] + "0a" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: COL_COLOR[col], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: N.text }}>{COL_LABEL[col]}</span>
                        <span style={{ marginLeft: "auto", fontSize: 11, background: COL_COLOR[col] + "20", color: COL_COLOR[col], padding: "1px 8px", borderRadius: 20, fontWeight: 700 }}>{colOrders.length}</span>
                      </div>
                      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 8, minHeight: 120 }}>
                        {colOrders.length === 0 && (
                          <div style={{ fontSize: 12, color: N.text3, textAlign: "center", padding: "20px 0" }}>Sin pedidos</div>
                        )}
                        {colOrders.map(o => (
                          <div key={o.id}
                            draggable
                            onDragStart={() => setDraggedOrderId(o.id)}
                            onDragEnd={() => setDraggedOrderId(null)}
                            onClick={() => { setSelectedOrder(o); setEditingOrder(false); setEditOrderNotes(o.notes ?? ""); }}
                            style={{ background: N.surface2, borderRadius: 10, padding: 12, cursor: "grab", border: `1px solid ${N.border}`, transition: "border-color .15s, opacity .15s", opacity: draggedOrderId === o.id ? 0.4 : 1 }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = COL_COLOR[col]}
                            onMouseLeave={e => e.currentTarget.style.borderColor = N.border}
                          >
                            <div style={{ fontSize: 13, fontWeight: 700, color: N.text, marginBottom: 2 }}>{o.client_name}</div>
                            <div style={{ fontSize: 11, color: N.text3, marginBottom: 6 }}>
                              {new Date(o.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                            </div>
                            <div style={{ fontSize: 12, color: N.text2, marginBottom: 8 }}>{o.items.length} producto{o.items.length !== 1 ? "s" : ""}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: 14, fontWeight: 800, color: N.navy }}>$ {o.total.toLocaleString("es-AR")}</span>
                              <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                                {PREV_STATUS[col] && (
                                  <button onClick={() => moveOrder(o.id, PREV_STATUS[col])}
                                    style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${N.border2}`, color: N.text2, fontWeight: 700, cursor: "pointer", background: "transparent" }}>←</button>
                                )}
                                {NEXT_STATUS[col] && (
                                  <button onClick={() => moveOrder(o.id, NEXT_STATUS[col])}
                                    style={{ fontSize: 10, padding: "3px 8px", borderRadius: 5, background: COL_COLOR[NEXT_STATUS[col]] + "15", color: COL_COLOR[NEXT_STATUS[col]], border: "none", fontWeight: 700, cursor: "pointer" }}>→</button>
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

          {/* ── CLIENTES ─────────────────────────────────────────────────── */}
          {activeTab === "clients" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginBottom: 4 }}>Clientes</div>
                <div style={{ fontSize: 14, color: N.text2 }}>{clients.length} distribuidor{clients.length !== 1 ? "es" : ""} registrado{clients.length !== 1 ? "s" : ""}</div>
              </div>

              {/* New client form */}
              <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: N.text, marginBottom: 16 }}>Agregar cliente</div>
                <form onSubmit={createClient}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 12 }}>
                    <div style={field}><span style={labelS}>Nombre y apellido</span>
                      <input style={inputS} required value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Juan García" />
                    </div>
                    <div style={field}><span style={labelS}>Nombre comercial</span>
                      <input style={inputS} value={newClientBusiness} onChange={e => setNewClientBusiness(e.target.value)} placeholder="Ferretería El Clavo" />
                    </div>
                    <div style={field}><span style={labelS}>CUIT / CUIL / DNI</span>
                      <input style={inputS} value={newClientTax} onChange={e => setNewClientTax(e.target.value)} placeholder="20-12345678-9" />
                    </div>
                    <div style={field}><span style={labelS}>Email</span>
                      <input type="email" style={inputS} required value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} placeholder="cliente@ejemplo.com" />
                    </div>
                    <div style={field}><span style={labelS}>Celular / WhatsApp</span>
                      <input style={inputS} value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="+54 9 11 1234-5678" />
                    </div>
                    <div style={field}><span style={labelS}>Calle</span>
                      <input style={inputS} value={newClientStreet} onChange={e => setNewClientStreet(e.target.value)} placeholder="Av. Corrientes" />
                    </div>
                    <div style={field}><span style={labelS}>Número</span>
                      <input style={inputS} value={newClientStreetNum} onChange={e => setNewClientStreetNum(e.target.value)} placeholder="1234" />
                    </div>
                    <div style={field}><span style={labelS}>Localidad</span>
                      <input style={inputS} value={newClientCity} onChange={e => setNewClientCity(e.target.value)} placeholder="CABA" />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
                    <div style={{ ...field, flex: 1 }}><span style={labelS}>Contraseña inicial</span>
                      <input type="password" style={inputS} required value={newClientPass} onChange={e => setNewClientPass(e.target.value)} placeholder="mínimo 6 caracteres" />
                    </div>
                    <button type="submit" style={{ ...btn(N.navy), height: 40, flexShrink: 0 }}>Agregar cliente</button>
                  </div>
                </form>
                {clientMsg && <div style={{ marginTop: 12, fontSize: 13, color: clientMsg.startsWith("✓") ? N.success : N.danger, fontWeight: 600 }}>{clientMsg}</div>}
              </div>

              {/* Client list */}
              <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: N.text }}>Distribuidores ({clients.length})</span>
                  <button style={{ ...btn(N.navy, true), height: 32, fontSize: 12 }} onClick={loadClients}><Icon name="reset" size={13} />Actualizar</button>
                </div>
                {clientsLoading && <div style={{ padding: 24, color: N.text3, fontSize: 13 }}>Cargando…</div>}
                {!clientsLoading && clients.length === 0 && (
                  <div style={{ padding: 24, fontSize: 13, color: N.text3 }}>Sin clientes registrados aún.</div>
                )}
                <div>
                  {clients.map((c, i) => {
                    const clientOrders = orders.filter(o => o.client_email === c.email);
                    const meta = c.user_metadata ?? {};
                    return (
                      <div key={c.id} onClick={() => setSelectedClient(c)}
                        style={{ padding: "14px 24px", borderBottom: i < clients.length - 1 ? `1px solid ${N.border}` : "none", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", transition: "background .15s" }}
                        onMouseEnter={e => (e.currentTarget.style.background = N.surface2)}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: N.navy + "12", color: N.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16, flexShrink: 0 }}>
                          {(c.name || c.email || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: N.text }}>{c.name || "—"}</div>
                          <div style={{ fontSize: 12, color: N.text3 }}>{meta.business ? `${meta.business} · ` : ""}{c.email}</div>
                        </div>
                        {meta.phone && <div style={{ fontSize: 12, color: N.text2 }}>{meta.phone}</div>}
                        <div style={{ fontSize: 12, fontWeight: 600, color: clientOrders.length > 0 ? N.info : N.text3, background: clientOrders.length > 0 ? N.info + "15" : N.border, padding: "3px 10px", borderRadius: 20 }}>
                          {clientOrders.length} pedido{clientOrders.length !== 1 ? "s" : ""}
                        </div>
                        <div style={{ color: N.text3, fontSize: 16 }}>›</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Client detail modal */}
              {selectedClient && (() => {
                const c = selectedClient;
                const meta = c.user_metadata ?? {};
                const clientOrders = orders.filter(o => o.client_email === c.email).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                const fmt = (n: number) => `$ ${n.toLocaleString("es-AR", { minimumFractionDigits: 0 })}`;
                return (
                  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 500, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) setSelectedClient(null); }}>
                    <div style={{ width: 520, height: "100vh", background: N.surface, overflowY: "auto", boxShadow: "-8px 0 40px rgba(0,0,0,.15)", display: "flex", flexDirection: "column" }}>

                      {/* Header */}
                      <div style={{ background: N.navy, padding: "24px 28px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                        <div style={{ width: 48, height: 48, borderRadius: 12, background: N.amber + "22", color: N.amber, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20 }}>
                          {(c.name || c.email || "?")[0].toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 18, fontWeight: 800, color: "#fff" }}>{c.name || "—"}</div>
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,.5)" }}>{c.email}</div>
                        </div>
                        <button onClick={async () => {
                            const isAdmin = c.app_metadata?.is_admin;
                            if (!confirm(isAdmin ? `¿Quitarle acceso admin a ${c.name || c.email}?` : `¿Dar acceso admin a ${c.name || c.email}?`)) return;
                            const headers = await authHeaders();
                            const res = await fetch("/api/set-admin", { method: "POST", headers, body: JSON.stringify({ id: c.id, is_admin: !isAdmin }) });
                            const json = await res.json();
                            if (json.error) { alert("Error: " + json.error); return; }
                            setSelectedClient({ ...c, app_metadata: { ...c.app_metadata, is_admin: !isAdmin } });
                            loadClients();
                          }}
                          style={{ fontSize: 12, fontWeight: 700, color: c.app_metadata?.is_admin ? N.danger : N.text3, background: c.app_metadata?.is_admin ? N.danger + "15" : N.border, border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", marginRight: 6 }}>
                          {c.app_metadata?.is_admin ? "Quitar admin" : "Dar admin"}
                        </button>
                        <button onClick={() => { setEditingClient(true); setEditFields({ name: c.name, business: meta.business, phone: meta.phone, address: meta.address, tax_id: meta.tax_id }); setEditMsg(""); }}
                          style={{ fontSize: 12, fontWeight: 700, color: N.amber, background: N.amber + "18", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", marginRight: 8 }}>
                          Editar
                        </button>
                        <button onClick={() => { setSelectedClient(null); setEditingClient(false); }} style={{ color: "rgba(255,255,255,.4)", background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>✕</button>
                      </div>

                      <div style={{ padding: 28, flex: 1 }}>
                        {/* Data */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: N.text3, letterSpacing: ".1em", textTransform: "uppercase" as const }}>Datos del cliente</div>
                        </div>

                        {editingClient ? (
                          <div style={{ marginBottom: 28 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                              {[
                                { label: "Nombre y apellido", key: "name" },
                                { label: "Nombre comercial", key: "business" },
                                { label: "CUIT / CUIL / DNI", key: "tax_id" },
                                { label: "Celular / WhatsApp", key: "phone" },
                                { label: "Dirección", key: "address" },
                              ].map(f => (
                                <div key={f.key} style={field}>
                                  <span style={labelS}>{f.label}</span>
                                  <input style={inputS} value={editFields[f.key] ?? ""} onChange={e => setEditFields(p => ({ ...p, [f.key]: e.target.value }))} />
                                </div>
                              ))}
                            </div>
                            {editMsg && <div style={{ fontSize: 13, color: editMsg.startsWith("✓") ? N.success : N.danger, fontWeight: 600, marginBottom: 12 }}>{editMsg}</div>}
                            <div style={{ display: "flex", gap: 10 }}>
                              <button style={{ ...btn(N.navy) }} onClick={async () => {
                                setEditMsg("");
                                const headers = await authHeaders();
                              const res = await fetch("/api/update-client", { method: "PATCH", headers, body: JSON.stringify({ id: c.id, ...editFields }) });
                                const json = await res.json();
                                if (json.error) { setEditMsg("Error: " + json.error); return; }
                                setEditMsg("✓ Datos actualizados");
                                setEditingClient(false);
                                setSelectedClient({ ...c, name: editFields.name, user_metadata: { ...meta, ...editFields } });
                                loadClients();
                              }}>Guardar cambios</button>
                              <button style={{ ...btn(N.text3, true) }} onClick={() => setEditingClient(false)}>Cancelar</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 28 }}>
                            {[
                              ["Nombre comercial", meta.business],
                              ["CUIT / CUIL / DNI", meta.tax_id],
                              ["Celular / WhatsApp", meta.phone],
                              ["Dirección", meta.address],
                              ["Email", c.email],
                              ["Alta", new Date(c.created_at).toLocaleDateString("es-AR")],
                            ].map(([label, value]) => (
                              <div key={label} style={{ background: N.surface2, borderRadius: 10, padding: "12px 14px", border: `1px solid ${N.border}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: N.text3, textTransform: "uppercase" as const, letterSpacing: ".08em", marginBottom: 4 }}>{label}</div>
                                <div style={{ fontSize: 14, fontWeight: 600, color: value ? N.text : N.text3 }}>{value || "—"}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Orders */}
                        <div style={{ fontSize: 11, fontWeight: 800, color: N.text3, letterSpacing: ".1em", textTransform: "uppercase" as const, marginBottom: 14 }}>
                          Pedidos ({clientOrders.length})
                        </div>
                        {clientOrders.length === 0 ? (
                          <div style={{ fontSize: 13, color: N.text3, padding: "20px 0" }}>Sin pedidos aún.</div>
                        ) : clientOrders.map(o => (
                          <div key={o.id} style={{ borderRadius: 10, border: `1px solid ${N.border}`, padding: 16, marginBottom: 10 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <div style={{ fontSize: 12, color: N.text3 }}>{new Date(o.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 16, fontWeight: 800, color: N.text }}>{fmt(o.total)}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: COL_COLOR[o.status] + "18", color: COL_COLOR[o.status] }}>{COL_LABEL[o.status]}</span>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: N.text2 }}>
                              {(o.items as any[]).map((it, idx) => (
                                <span key={idx}>{idx > 0 ? " · " : ""}{it.quantity}× {it.name}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── CATÁLOGO ─────────────────────────────────────────────────── */}
          {activeTab === "config" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: N.text, marginBottom: 4 }}>Catálogo</div>
                <div style={{ fontSize: 14, color: N.text2 }}>Gestión de productos, precios y configuración general</div>
              </div>

              {/* Business settings */}
              <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, padding: 24, marginBottom: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: N.text, marginBottom: 20 }}>Configuración del negocio</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={field}><span style={labelS}>Nombre del negocio</span>
                    <input style={inputS} value={settings.businessName} onChange={e => setSettings(s => ({ ...s, businessName: e.target.value }))} />
                  </div>
                  <div style={field}><span style={labelS}>Tagline</span>
                    <input style={inputS} value={settings.tagline} onChange={e => setSettings(s => ({ ...s, tagline: e.target.value }))} />
                  </div>
                  <div style={field}><span style={labelS}>Color de acento</span>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input type="color" value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} style={{ width: 44, height: 40, border: `1.5px solid ${N.border}`, borderRadius: 8, padding: 3, cursor: "pointer" }} />
                      <input style={{ ...inputS, flex: 1 }} value={settings.accentColor} onChange={e => setSettings(s => ({ ...s, accentColor: e.target.value }))} />
                    </div>
                  </div>
                  <div style={field}><span style={labelS}>WhatsApp (sin +)</span>
                    <input style={inputS} value={settings.whatsappNumber} onChange={e => setSettings(s => ({ ...s, whatsappNumber: e.target.value }))} />
                  </div>
                  <div style={field}><span style={labelS}>Moneda</span>
                    <select style={{ ...inputS, appearance: "none" }} value={settings.currency} onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}>
                      <option value="ARS">ARS — Peso argentino</option>
                      <option value="USD">USD — Dólar</option>
                      <option value="BRL">BRL — Real</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div style={{ background: N.surface, borderRadius: 14, border: `1px solid ${N.border}`, overflow: "hidden" }}>
                <div style={{ padding: "16px 24px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: N.text, flex: 1 }}>
                    Productos ({filteredProds.length} de {products.length})
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, background: N.surface2, borderRadius: 8, padding: "0 12px", height: 36, border: `1px solid ${N.border}` }}>
                    <Icon name="search" size={14} />
                    <input value={prodSearch} onChange={e => { setProdSearch(e.target.value); setProdPage(0); }}
                      placeholder="Buscar nombre o SKU…" style={{ background: "transparent", border: "none", outline: "none", fontSize: 13, color: N.text, width: 180, fontFamily: "inherit" }} />
                  </div>
                  <select value={prodBrand} onChange={e => { setProdBrand(e.target.value); setProdPage(0); }}
                    style={{ height: 36, borderRadius: 8, border: `1px solid ${N.border}`, padding: "0 10px", fontSize: 13, background: N.surface2, color: N.text, outline: "none", fontFamily: "inherit" }}>
                    <option>Todas</option>
                    {BRANDS.map(b => <option key={b}>{b}</option>)}
                  </select>
                  <button style={{ ...btn("#16a34a", true), height: 36 }} onClick={exportExcel}><Icon name="download" size={14} />Exportar Excel</button>
                  <button style={{ ...btn("#2563eb", true), height: 36 }} onClick={() => xlsxRef.current?.click()}><Icon name="upload" size={14} />Importar Excel</button>
                  <input ref={xlsxRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importExcel} />
                </div>

                <div style={{ padding: "0 24px" }}>
                  <div style={{ fontSize: 12, color: N.text3, padding: "12px 0 4px" }}>
                    Columnas de importación Excel: SKU · Precio · PrecioOferta · EnOferta (SI/NO) · Stock · MinQty
                  </div>
                  {pagedProds.map(p => {
                    const isEditing = editingId === p.id;
                    return (
                      <div key={p.id} style={{ padding: "14px 0", borderBottom: `1px solid ${N.border}` }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: N.text }}>{p.name}</div>
                            <div style={{ fontSize: 12, color: N.text3, marginTop: 2 }}>{p.brand} · {p.category} · SKU {p.sku}</div>
                            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                              {p.onSale && p.salePrice
                                ? tag("#dc2626", `Oferta: $${p.salePrice} ARS`)
                                : tag("#475569", `$${p.price} ARS`)
                              }
                              {tag(p.stock > 0 ? "#16a34a" : "#dc2626", p.stock > 0 ? `Stock: ${p.stock}` : "Sin stock")}
                              {tag("#64748b", `Mín. ${p.minQty}`)}
                            </div>
                          </div>
                          <button style={{ ...btn(isEditing ? N.navy : "#64748b", !isEditing), height: 34, fontSize: 12 }} onClick={() => setEditingId(isEditing ? null : p.id)}>
                            <Icon name="edit" size={13} />{isEditing ? "Cerrar" : "Editar"}
                          </button>
                        </div>

                        {isEditing && (
                          <div style={{ marginTop: 12, background: N.surface2, borderRadius: 10, padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, border: `1px solid ${N.border}` }}>
                            <div style={field}><span style={labelS}>Precio</span>
                              <input type="number" style={inputS} value={p.price} onChange={e => updateProduct(p.id, "price", Number(e.target.value))} />
                            </div>
                            <div style={field}><span style={labelS}>Stock</span>
                              <input type="number" style={inputS} value={p.stock} onChange={e => updateProduct(p.id, "stock", Number(e.target.value))} />
                            </div>
                            <div style={field}><span style={labelS}>Min. qty</span>
                              <input type="number" style={inputS} value={p.minQty} onChange={e => updateProduct(p.id, "minQty", Number(e.target.value))} />
                            </div>
                            <div style={field}><span style={labelS}>Precio oferta</span>
                              <input type="number" style={inputS} value={p.salePrice ?? ""} onChange={e => updateProduct(p.id, "salePrice", Number(e.target.value) || undefined)} />
                            </div>
                            <div style={{ gridColumn: "1 / -1" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: N.text }}>
                                <input type="checkbox" checked={p.onSale} onChange={e => updateProduct(p.id, "onSale", e.target.checked)} />
                                Marcar como oferta
                              </label>
                            </div>
                            <div style={{ ...field, gridColumn: "1 / -1" }}>
                              <span style={labelS}>Tag</span>
                              <input style={inputS} value={p.tag ?? ""} placeholder='Nuevo, Más vendido…' onChange={e => updateProduct(p.id, "tag", e.target.value || undefined)} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {totalPages > 1 && (
                  <div style={{ padding: "16px 24px", borderTop: `1px solid ${N.border}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    <button disabled={prodPage === 0} style={{ ...btn("#64748b", true), height: 32, fontSize: 12 }} onClick={() => setProdPage(p => p - 1)}>← Anterior</button>
                    <span style={{ fontSize: 13, color: N.text3 }}>Página {prodPage + 1} de {totalPages}</span>
                    <button disabled={prodPage >= totalPages - 1} style={{ ...btn("#64748b", true), height: 32, fontSize: 12 }} onClick={() => setProdPage(p => p + 1)}>Siguiente →</button>
                  </div>
                )}
              </div>

              <div style={{ textAlign: "center", padding: "20px 0 0", fontSize: 12, color: N.text3 }}>
                Desarrollado por <a href="https://henkoconsultoria.com" style={{ color: N.navy, textDecoration: "none", fontWeight: 600 }}>Henko Consultoría</a>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal detalle pedido ─────────────────────────────────────────── */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => setSelectedOrder(null)}>
          <div style={{ background: N.surface, borderRadius: 18, border: `1px solid ${N.border}`, width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto", boxShadow: "0 30px 80px rgba(0,0,0,.2)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: "22px 26px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: N.text }}>{selectedOrder.client_name}</div>
                <div style={{ fontSize: 13, color: N.text3 }}>{selectedOrder.client_email}</div>
                <div style={{ fontSize: 12, color: N.text3, marginTop: 2 }}>
                  {new Date(selectedOrder.created_at).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} style={{ color: N.text3, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                <Icon name="close" size={20} />
              </button>
            </div>

            <div style={{ padding: "14px 26px", borderBottom: `1px solid ${N.border}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: N.text2, textTransform: "uppercase", letterSpacing: ".07em" }}>ESTADO</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: COL_COLOR[selectedOrder.status], background: COL_COLOR[selectedOrder.status] + "18", padding: "4px 12px", borderRadius: 20 }}>
                {COL_LABEL[selectedOrder.status]}
              </span>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {PREV_STATUS[selectedOrder.status] && (
                  <button onClick={() => moveOrder(selectedOrder.id, PREV_STATUS[selectedOrder.status])}
                    style={{ ...btn("#64748b", true), height: 30, fontSize: 12 }}>← Atrás</button>
                )}
                {NEXT_STATUS[selectedOrder.status] && (
                  <button onClick={() => moveOrder(selectedOrder.id, NEXT_STATUS[selectedOrder.status])}
                    style={{ ...btn(COL_COLOR[NEXT_STATUS[selectedOrder.status]]), height: 30, fontSize: 12 }}>Avanzar →</button>
                )}
              </div>
            </div>

            <div style={{ padding: "18px 26px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: N.text2, textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 12 }}>PRODUCTOS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedOrder.items.map((it, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: N.surface2, borderRadius: 10, border: `1px solid ${N.border}` }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: N.text }}>{it.name}</div>
                      <div style={{ fontSize: 11, color: N.text3 }}>{it.brand} · SKU {it.sku}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: N.text }}>{it.quantity}×</div>
                      <div style={{ fontSize: 12, color: N.text3 }}>$ {it.unitPrice.toLocaleString("es-AR")}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: N.text3 }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: N.navy }}>$ {selectedOrder.total.toLocaleString("es-AR")}</span>
              </div>

              {/* Notas */}
              <div style={{ marginTop: 20, borderTop: `1px solid ${N.border}`, paddingTop: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: N.text2, textTransform: "uppercase", letterSpacing: ".07em" }}>NOTAS</span>
                  {!editingOrder && (
                    <button onClick={() => { setEditingOrder(true); setEditOrderNotes(selectedOrder.notes ?? ""); }}
                      style={{ ...btn(N.amber, true), height: 28, fontSize: 11 }}><Icon name="edit" size={12} />Editar</button>
                  )}
                </div>
                {editingOrder ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <textarea value={editOrderNotes} onChange={e => setEditOrderNotes(e.target.value)}
                      placeholder="Agregar notas sobre este pedido…"
                      style={{ width: "100%", minHeight: 80, borderRadius: 8, border: `1.5px solid ${N.border}`, padding: "10px 12px", fontSize: 13, color: N.text, fontFamily: "inherit", resize: "vertical", outline: "none", boxSizing: "border-box" }} />
                    <div style={{ display: "flex", gap: 8 }}>
                      <button style={btn(N.navy)} onClick={async () => {
                        const headers = await authHeaders();
                        const res = await fetch("/api/update-order", { method: "PATCH", headers, body: JSON.stringify({ id: selectedOrder.id, notes: editOrderNotes }) });
                        if (res.ok) {
                          setSelectedOrder({ ...selectedOrder, notes: editOrderNotes });
                          setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, notes: editOrderNotes } : o));
                          setEditingOrder(false);
                        }
                      }}>Guardar</button>
                      <button style={btn(N.text3, true)} onClick={() => setEditingOrder(false)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: selectedOrder.notes ? N.text : N.text3, fontStyle: selectedOrder.notes ? "normal" : "italic" }}>
                    {selectedOrder.notes || "Sin notas"}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
