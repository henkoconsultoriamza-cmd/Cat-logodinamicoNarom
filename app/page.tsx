"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  APP_SETTINGS_KEY, AppSettings, BRANDS, CART_KEY, CATEGORIES,
  DEFAULT_APP_SETTINGS, DEFAULT_PRODUCTS, Product, PRODUCTS_KEY, Variant,
} from "./catalog-data";
import { supabase } from "./lib/supabase";
import { saveOrder } from "./lib/orders";

type CartItem = {
  productId: string;
  variantSku?: string;
  variantLabel?: string;
  name: string;
  brand: string;
  unitPrice: number;
  quantity: number;
  image: string;
  imageColor: string;
  imageIcon: string;
};

// ─── Icons ────────────────────────────────────────────────────────────────────
function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "search") return <svg {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>;
  if (name === "cart") return <svg {...p}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
  if (name === "close") return <svg {...p}><path d="m6 6 12 12M18 6 6 18"/></svg>;
  if (name === "plus") return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
  if (name === "minus") return <svg {...p}><path d="M5 12h14"/></svg>;
  if (name === "trash") return <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="m19 6-.867 12.142A2 2 0 0 1 16.138 20H7.862a2 2 0 0 1-1.995-1.858L5 6m5 0V4h4v2"/></svg>;
  if (name === "whatsapp") return <svg {...p} stroke="none" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0 0 20.885 3.488"/></svg>;
  if (name === "settings") return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
  if (name === "check") return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
  if (name === "filter") return <svg {...p}><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(value: number, currency: AppSettings["currency"]) {
  if (currency === "ARS") return `$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  if (currency === "BRL") return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  return `US$ ${value.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Product image ─────────────────────────────────────────────────────────────
function ProductImg({ product, size = 80, radius = 10 }: { product: Product | { image: string; imageColor: string; imageIcon: string }; size?: number; radius?: number }) {
  const [err, setErr] = useState(false);
  if (product.image && !err) {
    return (
      <img
        src={product.image}
        alt=""
        width={size}
        height={size}
        onError={() => setErr(true)}
        style={{ width: size, height: size, borderRadius: radius, objectFit: "contain", flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{ width: size, height: size, borderRadius: radius, background: product.imageColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.4, flexShrink: 0 }}>
      {product.imageIcon}
    </div>
  );
}

// ─── Card image (fills container, contain fit, fallback emoji) ────────────────
function CardImg({ product }: { product: Product }) {
  const [err, setErr] = useState(false);
  const fill: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
  if (product.image && !err) {
    return (
      <img
        src={product.image}
        alt=""
        onError={() => setErr(true)}
        style={{ ...fill, objectFit: "contain", padding: 8, boxSizing: "border-box" }}
      />
    );
  }
  return (
    <div style={{ ...fill, background: product.imageColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 60 }}>
      {product.imageIcon}
    </div>
  );
}

// ─── Tag ──────────────────────────────────────────────────────────────────────
function Tag({ label, accent }: { label: string; accent: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    "Nuevo":       { bg: "#052e16", color: "#4ade80" },
    "Oferta":      { bg: "#3b0000", color: "#f87171" },
    "Más vendido": { bg: "#1c1000", color: "#fbbf24" },
  };
  const s = colors[label] ?? { bg: accent + "25", color: accent };
  return <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color, letterSpacing: ".3px", whiteSpace: "nowrap" as const }}>{label}</span>;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────
function Toggle({ on, onChange, accent }: { on: boolean; onChange: () => void; accent: string }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, borderRadius: 11, background: on ? accent : "var(--border2)", position: "relative", transition: "background .2s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: 9, background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.4)" }} />
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Catalog() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [products, setProducts] = useState<Product[]>(DEFAULT_PRODUCTS);
  const [hydrated, setHydrated] = useState(false);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  const [onlySale, setOnlySale] = useState(false);
  const [onlyStock, setOnlyStock] = useState(false);

  const [selected, setSelected] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [detailQty, setDetailQty] = useState(1);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addedId, setAddedId] = useState<string | null>(null);

  const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [orderSending, setOrderSending] = useState(false);
  const PAGE_SIZE = 48;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const accent = settings.accentColor;

  useEffect(() => {
    const s = localStorage.getItem(APP_SETTINGS_KEY);
    if (s) { try { setSettings({ ...DEFAULT_APP_SETTINGS, ...JSON.parse(s) }); } catch { localStorage.removeItem(APP_SETTINGS_KEY); } }
    const p = localStorage.getItem(PRODUCTS_KEY);
    if (p) { try { setProducts(JSON.parse(p)); } catch { localStorage.removeItem(PRODUCTS_KEY); } }
    const c = localStorage.getItem(CART_KEY);
    if (c) { try { setCart(JSON.parse(c)); } catch { localStorage.removeItem(CART_KEY); } }
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart)); }, [cart, hydrated]);

  // Restaurar sesión Supabase al cargar
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      if (u) setUser({ id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? u.email ?? "" });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      const u = session?.user;
      setUser(u ? { id: u.id, email: u.email ?? "", name: u.user_metadata?.name ?? u.email ?? "" } : null);
    });
    return () => subscription.unsubscribe();
  }, []);

  function openProduct(p: Product) {
    setSelected(p);
    setSelectedVariant(p.variants?.[0] ?? null);
    setDetailQty(p.minQty);
  }

  function effectivePrice(p: Product, v?: Variant | null) {
    if (v) return v.price;
    if (p.onSale && p.salePrice) return p.salePrice;
    return p.price;
  }

  function addToCart(p: Product, qty: number, variant?: Variant | null) {
    const unitPrice = effectivePrice(p, variant);
    setCart(prev => {
      const key = variant?.sku ?? p.id;
      const existing = prev.find(i => (i.variantSku ?? i.productId) === key);
      if (existing) return prev.map(i => (i.variantSku ?? i.productId) === key ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { productId: p.id, variantSku: variant?.sku, variantLabel: variant?.label, name: p.name, brand: p.brand, unitPrice, quantity: qty, image: p.image, imageColor: p.imageColor, imageIcon: p.imageIcon }];
    });
    setSelected(null);
  }

  function updateQty(key: string, delta: number) {
    setCart(prev => prev.map(i => (i.variantSku ?? i.productId) !== key ? i : i.quantity + delta < 1 ? i : { ...i, quantity: i.quantity + delta }));
  }

  function removeFromCart(key: string) {
    setCart(prev => prev.filter(i => (i.variantSku ?? i.productId) !== key));
  }

  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  function buildWhatsAppMsg() {
    const lines = cart.map(i => `• ${i.quantity}× ${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} — ${fmt(i.unitPrice, settings.currency)} c/u`).join("\n");
    return `Hola! Quiero hacer un pedido mayorista:\n\n${lines}\n\nTotal estimado: ${fmt(cartTotal, settings.currency)}\n\n¿Podés confirmarme disponibilidad?`;
  }

  async function handleSendOrder() {
    if (!cart.length) return;
    if (!user) { setLoginOpen(true); return; }
    setOrderSending(true);
    try {
      // Guardar en Supabase
      await saveOrder({
        clientId:    user.id,
        clientEmail: user.email,
        clientName:  user.name,
        items: cart.map(i => ({ productId: i.productId, name: i.name, brand: i.brand, sku: i.variantSku ?? i.productId, unitPrice: i.unitPrice, quantity: i.quantity })),
        total: cartTotal,
      });
    } catch (e) {
      console.error("Error guardando pedido:", e);
    }
    // Enviar por WhatsApp siempre
    window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(buildWhatsAppMsg())}`, "_blank");
    setCart([]);
    setCartOpen(false);
    setOrderSending(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPass });
    setLoginLoading(false);
    if (error) { setLoginError("Email o contraseña incorrectos"); return; }
    setLoginOpen(false);
    setLoginEmail(""); setLoginPass("");
    // Reintentar envío tras login exitoso
    setTimeout(() => handleSendOrder(), 300);
  }

  const BRAND_GROUPS: Record<string, string[]> = {
    "MOTA": ["MOTA", "ArtMota", "LubriMota", "MembraMota", "GasMota"],
  };
  const VISIBLE_BRANDS = BRANDS.filter(b => !Object.values(BRAND_GROUPS).flat().includes(b) || Object.keys(BRAND_GROUPS).includes(b));

  function expandBrands(selected: string[]): string[] {
    const expanded = new Set<string>();
    for (const b of selected) {
      expanded.add(b);
      for (const sub of (BRAND_GROUPS[b] ?? [])) expanded.add(sub);
    }
    return [...expanded];
  }

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [query, activeCategory, activeBrands, onlySale, onlyStock]);

  const filtered = useMemo(() => products.filter(p => {
    if (activeCategory !== "Todos" && p.category !== activeCategory) return false;
    if (activeBrands.length && !expandBrands(activeBrands).includes(p.brand)) return false;
    if (onlySale && !p.onSale) return false;
    if (onlyStock && p.stock === 0) return false;
    if (query) {
      const q = query.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q);
    }
    return true;
  }), [products, activeCategory, activeBrands, onlySale, onlyStock, query]);

  function toggleBrand(b: string) {
    setActiveBrands(prev => prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]);
  }

  const css = (s: CSSProperties): CSSProperties => s;
  const currentPrice = selected ? effectivePrice(selected, selectedVariant) : 0;

  if (!hydrated) return null;

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const headerBg = "rgba(14,16,24,.92)";
  const sidebarCatActive = css({ display: "block", width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 700, color: accent, background: accent + "18", marginBottom: 3, border: `1px solid ${accent}30` });
  const sidebarCatIdle = css({ display: "block", width: "100%", textAlign: "left" as const, padding: "8px 12px", borderRadius: 7, fontSize: 13, fontWeight: 400, color: "var(--text2)", background: "transparent", marginBottom: 3, border: "1px solid transparent", transition: "all .15s" });

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ background: "rgba(2,13,26,.94)", backdropFilter: "blur(14px)", borderBottom: "1px solid var(--border)", padding: "0 20px", height: 60, display: "flex", alignItems: "center", gap: 14, position: "sticky", top: 0, zIndex: 100 }}>
        <button
          onClick={() => setSidebarOpen(o => !o)}
          className="mobile-filter-btn"
          style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)", background: "var(--surface2)", border: "1px solid var(--border)", cursor: "pointer", flexShrink: 0 }}
        >
          <Icon name="filter" />
        </button>

        {/* Logo Narom */}
        <a href="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
          <img src="/narom-logo.svg" alt="Narom Group" style={{ height: 30, width: "auto" }} />
        </a>

        {/* Buscador */}
        <div style={{ flex: 1, maxWidth: 480, position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text3)", pointerEvents: "none" }}>
            <Icon name="search" size={14} />
          </span>
          <input
            style={{ width: "100%", height: 38, borderRadius: 12, border: "1px solid var(--border)", padding: "0 14px 0 36px", fontSize: 13, background: "var(--surface2)", color: "var(--text)", outline: "none" }}
            placeholder="Buscar por nombre, marca o SKU…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {user && (
            <span style={{ fontSize: 12, color: "var(--text3)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: accent + "22", color: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>
                {user.name[0]?.toUpperCase()}
              </span>
            </span>
          )}
          <a href="/admin" style={{ width: 36, height: 36, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text3)", background: "var(--surface2)", border: "1px solid var(--border)", textDecoration: "none" }}>
            <Icon name="settings" size={16} />
          </a>
          <button
            onClick={() => setCartOpen(o => !o)}
            style={{ height: 36, padding: "0 14px", borderRadius: 9, display: "flex", alignItems: "center", gap: 8, color: cartCount > 0 ? "#fff" : "var(--text2)", background: cartCount > 0 ? accent : "var(--surface2)", border: `1px solid ${cartCount > 0 ? accent : "var(--border)"}`, fontWeight: 700, fontSize: 13, position: "relative", boxShadow: cartCount > 0 ? `0 4px 16px ${accent}40` : "none", transition: "all .2s" }}
          >
            <Icon name="cart" size={16} />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Sidebar overlay (mobile) ───────────────────────────────────────── */}
        {sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)} className="sidebar-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.6)", zIndex: 150 }} />
        )}

        {/* ── Sidebar ────────────────────────────────────────────────────────── */}
        <aside className={sidebarOpen ? "sidebar sidebar-open" : "sidebar"} style={{ width: 224, flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--border)", padding: "20px 0 24px", overflowY: "auto", position: "sticky", top: 60, height: "calc(100vh - 60px)" }}>

          {/* MARCAS */}
          <div style={{ padding: "0 12px 4px" }}>
            <div className="nav-label">Marcas</div>
            {VISIBLE_BRANDS.map(b => {
              const on = activeBrands.includes(b);
              return (
                <button key={b} className={"nav-item" + (on ? " active" : "")} onClick={() => toggleBrand(b)}>
                  <span className="nav-dot" />
                  <span style={{ flex: 1 }}>{b}</span>
                  {on && <Icon name="check" size={12} />}
                </button>
              );
            })}
          </div>

          <div className="nav-separator" style={{ margin: "14px 12px" }} />

          {/* CATEGORÍAS */}
          <div style={{ padding: "0 12px 4px" }}>
            <div className="nav-label">Categorías</div>
            {["Todos", ...CATEGORIES].map(cat => {
              const on = activeCategory === cat;
              return (
                <button key={cat} className={"nav-item" + (on ? " active" : "")}
                  onClick={() => { setActiveCategory(cat); setSidebarOpen(false); }}>
                  <span className="nav-dot" />
                  <span style={{ flex: 1 }}>{cat}</span>
                </button>
              );
            })}
          </div>

          <div className="nav-separator" style={{ margin: "14px 12px" }} />

          {/* FILTROS */}
          <div style={{ padding: "0 12px 4px" }}>
            <div className="nav-label">Filtros</div>
            <button className={"nav-item" + (onlySale ? " active" : "")} onClick={() => setOnlySale(o => !o)}>
              <span className="nav-dot" />
              <span style={{ flex: 1 }}>Solo en oferta</span>
              {onlySale && <Icon name="check" size={12} />}
            </button>
            <button className={"nav-item" + (onlyStock ? " active" : "")} onClick={() => setOnlyStock(o => !o)}>
              <span className="nav-dot" />
              <span style={{ flex: 1 }}>Con stock</span>
              {onlyStock && <Icon name="check" size={12} />}
            </button>
          </div>

          {(activeBrands.length > 0 || onlySale || onlyStock || activeCategory !== "Todos") && (
            <>
              <div className="nav-separator" style={{ margin: "14px 12px 10px" }} />
              <div style={{ padding: "0 12px" }}>
                <button className="nav-item" style={{ color: accent }} onClick={() => { setActiveCategory("Todos"); setActiveBrands([]); setOnlySale(false); setOnlyStock(false); }}>
                  <Icon name="close" size={13} />
                  <span>Limpiar filtros</span>
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ── Grid ───────────────────────────────────────────────────────────── */}
        <main style={{ flex: 1, padding: "12px 14px", overflowY: "auto", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <span style={{ fontSize: 13, color: "var(--text3)" }}>
              {filtered.length === 0 ? "Sin resultados" : `${filtered.length} producto${filtered.length !== 1 ? "s" : ""}`}
              {activeCategory !== "Todos" && ` · ${activeCategory}`}
              {activeBrands.length > 0 && ` · ${activeBrands.join(", ")}`}
            </span>
            {onlySale && <Tag label="Oferta" accent={accent} />}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text3)" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🔩</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6, color: "var(--text2)" }}>Sin resultados</div>
              <div style={{ fontSize: 13 }}>Probá cambiar los filtros o la búsqueda</div>
            </div>
          ) : (
            <div className="product-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
              {filtered.slice(0, visibleCount).map(p => {
                const price = p.onSale && p.salePrice ? p.salePrice : p.price;
                const inStock = p.stock > 0;
                const cartQty = cart.filter(i => i.productId === p.id).reduce((s, i) => s + i.quantity, 0);
                return (
                  <div
                    key={p.id}
                    onClick={() => openProduct(p)}
                    style={{ background: "var(--surface)", borderRadius: 16, border: "1px solid var(--border)", overflow: "hidden", cursor: "pointer", display: "flex", flexDirection: "column", transition: "border-color .2s, box-shadow .2s, transform .2s" }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = accent + "60"; el.style.boxShadow = `0 8px 28px rgba(0,0,0,.4)`; el.style.transform = "translateY(-1px)"; }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = "var(--border)"; el.style.boxShadow = "none"; el.style.transform = "none"; }}
                  >
                    {/* Image */}
                    <div style={{ height: 128, background: "var(--surface2)", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                      <CardImg product={p} />
                      {p.tag && (
                        <div style={{ position: "absolute", top: 8, left: 8 }}>
                          <Tag label={p.tag} accent={accent} />
                        </div>
                      )}
                      {!inStock && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(2,13,26,.55)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: "var(--text3)", letterSpacing: ".1em", textTransform: "uppercase" as const }}>Sin stock</span>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: "10px 12px", flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: "var(--text3)", letterSpacing: ".12em", textTransform: "uppercase" as const }}>{p.brand}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.35 }}>{p.name}</div>
                      <div style={{ fontSize: 10, color: "var(--text3)", fontFamily: "monospace", marginTop: 1 }}>{p.sku}</div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: 17, fontWeight: 800, color: p.onSale ? "#f87171" : "var(--text)", letterSpacing: "-0.03em" }}>{fmt(price, settings.currency)}</span>
                        {p.onSale && <span style={{ fontSize: 11, color: "var(--text3)", textDecoration: "line-through" }}>{fmt(p.price, settings.currency)}</span>}
                      </div>
                    </div>

                    <div style={{ padding: "8px 12px 10px", display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
                      {cartQty > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <button
                            onClick={e => { e.stopPropagation(); e.preventDefault(); updateQty(p.id, -p.minQty); }}
                            style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface3)", color: "var(--text2)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--border)" }}
                          >
                            <Icon name="minus" size={12} />
                          </button>
                          <span style={{ fontSize: 14, fontWeight: 800, minWidth: 26, textAlign: "center" as const, color: accent }}>{cartQty}</span>
                          <button
                            onClick={e => { e.stopPropagation(); e.preventDefault(); if (inStock) addToCart(p, p.minQty); }}
                            style={{ width: 30, height: 30, borderRadius: 8, background: accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 2px 8px ${accent}40` }}
                          >
                            <Icon name="plus" size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={e => { e.stopPropagation(); e.preventDefault(); if (inStock) addToCart(p, p.minQty); }}
                          style={{ height: 30, padding: "0 12px", borderRadius: 8, background: inStock ? accent : "var(--surface3)", color: inStock ? "#fff" : "var(--text3)", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 5, opacity: inStock ? 1 : 0.4, boxShadow: inStock ? `0 2px 10px ${accent}35` : "none" }}
                        >
                          <Icon name="plus" size={12} />
                          Agregar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {filtered.length > 0 && visibleCount < filtered.length && (
            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <button
                onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                style={{ padding: "10px 28px", borderRadius: 10, background: accent, color: "#fff", fontWeight: 700, fontSize: 14 }}
              >
                Ver más ({filtered.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </main>

        {/* ── Cart ───────────────────────────────────────────────────────────── */}
        {cartOpen && (
          <div className="cart-panel" style={{ width: 330, background: "var(--surface)", borderLeft: "1px solid var(--border)", display: "flex", flexDirection: "column", position: "sticky", top: 62, height: "calc(100vh - 62px)" }}>
            <div style={{ padding: "16px 18px 12px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>Pedido mayorista</span>
              <button style={{ color: "var(--text3)" }} onClick={() => setCartOpen(false)}><Icon name="close" /></button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text3)" }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>🛒</div>
                  <div style={{ fontSize: 13 }}>El pedido está vacío</div>
                </div>
              ) : cart.map(item => {
                const key = item.variantSku ?? item.productId;
                return (
                  <div key={key} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--surface2)" }}>
                    <ProductImg product={item as any} size={44} radius={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{item.name}</div>
                      {item.variantLabel && <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{item.variantLabel}</div>}
                      <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 1 }}>{fmt(item.unitPrice, settings.currency)} c/u · {fmt(item.unitPrice * item.quantity, settings.currency)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <button onClick={() => updateQty(key, -1)} style={{ width: 24, height: 24, borderRadius: 5, border: "1.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                          <Icon name="minus" size={12} />
                        </button>
                        <span style={{ fontSize: 13, fontWeight: 600, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                        <button onClick={() => updateQty(key, 1)} style={{ width: 24, height: 24, borderRadius: 5, border: "1.5px solid var(--border2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                          <Icon name="plus" size={12} />
                        </button>
                        <button onClick={() => removeFromCart(key)} style={{ color: "#ef4444", marginLeft: 4 }}>
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <span style={{ fontSize: 13, color: "var(--text2)" }}>Total estimado</span>
                <span style={{ fontSize: 22, fontWeight: 800, color: accent }}>{fmt(cartTotal, settings.currency)}</span>
              </div>
              {user && (
                <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 8, textAlign: "center" }}>
                  Pedido como <strong style={{ color: "var(--text2)" }}>{user.name}</strong>
                </div>
              )}
              <button
                onClick={handleSendOrder}
                disabled={cart.length === 0 || orderSending}
                style={{ width: "100%", height: 46, borderRadius: 10, background: "#25D366", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 8, opacity: cart.length === 0 ? 0.5 : 1 }}
              >
                <Icon name="whatsapp" size={20} />
                {orderSending ? "Enviando…" : user ? "Confirmar pedido" : "Iniciar sesión y pedir"}
              </button>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} style={{ width: "100%", height: 36, borderRadius: 8, border: "1.5px solid var(--border2)", color: "var(--text2)", fontSize: 13, fontWeight: 500 }}>
                  Vaciar pedido
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Product modal ──────────────────────────────────────────────────────── */}
      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          <div style={{ background: "var(--surface)", borderRadius: 18, maxWidth: 860, width: "100%", maxHeight: "92vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>

            {/* Imagen grande */}
            <div style={{ position: "relative", height: 380, flexShrink: 0, background: "var(--surface2)", overflow: "hidden" }}>
              {selected.image
                ? <img src={selected.image} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                : <div style={{ width: "100%", height: "100%", background: selected.imageColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 100 }}>{selected.imageIcon}</div>
              }
              <button style={{ position: "absolute", top: 12, right: 12, background: "rgba(0,0,0,.5)", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => setSelected(null)}>
                <Icon name="close" size={18} />
              </button>
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 6 }}>
                {selected.tag && <Tag label={selected.tag} accent={accent} />}
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20, background: selected.stock > 0 ? "#052e16" : "#3b0000", color: selected.stock > 0 ? "#4ade80" : "#f87171" }}>
                  {selected.stock > 0 ? `${selected.stock} en stock` : "Sin stock"}
                </span>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: "16px 22px 0", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text3)", letterSpacing: ".5px", textTransform: "uppercase" as const, marginBottom: 3 }}>{selected.brand}</div>
              <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.25, marginBottom: 4 }}>{selected.name}</div>
              <div style={{ fontSize: 11, color: "var(--text3)", fontFamily: "monospace", marginBottom: 8 }}>SKU: {selected.sku}</div>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 14 }}>{selected.description}</p>
            </div>

            {/* Modal body */}
            <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
              {/* Specs */}
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 12 }}>Especificaciones</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 20px", marginBottom: 20 }}>
                {Object.entries((selected.specs ?? {}) as Record<string, string>).map(([k, v]) => (
                  <div key={k} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 7 }}>
                    <div style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600, marginBottom: 2 }}>{k}</div>
                    <div style={{ fontSize: 13, color: "var(--text)", fontWeight: 500 }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Variants */}
              {selected.variants && selected.variants.length > 0 && (
                <>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", letterSpacing: "1px", textTransform: "uppercase" as const, marginBottom: 10 }}>Variantes</div>
                  <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 8, marginBottom: 8 }}>
                    {selected.variants.map(v => {
                      const active = selectedVariant?.sku === v.sku;
                      return (
                        <button key={v.sku} onClick={() => setSelectedVariant(v)}
                          style={{ padding: "8px 14px", borderRadius: 9, border: `1.5px solid ${active ? accent : "var(--border2)"}`, background: active ? accent + "15" : "transparent", color: active ? accent : v.stock === 0 ? "var(--text3)" : "var(--text)", fontSize: 13, fontWeight: active ? 600 : 400, opacity: v.stock === 0 ? 0.5 : 1 }}
                        >
                          <div>{v.label}</div>
                          <div style={{ fontSize: 11, color: active ? accent : "var(--text3)", marginTop: 2 }}>{fmt(v.price, settings.currency)} · {v.stock > 0 ? `${v.stock} u.` : "Sin stock"}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 14, background: "var(--surface2)" }}>
              {/* Qty */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface3)", borderRadius: 9, padding: "6px 6px" }}>
                <button onClick={() => setDetailQty(q => Math.max(selected.minQty, q - 1))} style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                  <Icon name="minus" size={14} />
                </button>
                <span style={{ fontSize: 15, fontWeight: 700, minWidth: 32, textAlign: "center" }}>{detailQty}</span>
                <button onClick={() => setDetailQty(q => q + 1)} style={{ width: 30, height: 30, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text2)" }}>
                  <Icon name="plus" size={14} />
                </button>
              </div>

              {/* Price */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: selected.onSale ? "#f87171" : "var(--text)" }}>
                  {fmt(currentPrice * detailQty, settings.currency)}
                </div>
                <div style={{ fontSize: 12, color: "var(--text3)" }}>
                  {fmt(currentPrice, settings.currency)} c/u · mín. {selected.minQty} u.
                  {selected.priceRetail && <span> · PVP {fmt(selected.priceRetail, settings.currency)}</span>}
                </div>
              </div>

              {/* Add */}
              <button
                onClick={() => addToCart(selected, detailQty, selectedVariant)}
                disabled={selected.stock === 0}
                style={{ height: 46, padding: "0 24px", borderRadius: 10, background: selected.stock === 0 ? "var(--surface3)" : accent, color: selected.stock === 0 ? "var(--text3)" : "#000", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}
              >
                <Icon name="cart" size={16} />
                Agregar al pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Login modal ────────────────────────────────────────────────────────── */}
      {loginOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={e => { if (e.target === e.currentTarget) setLoginOpen(false); }}>
          <div style={{ background: "var(--surface)", borderRadius: 18, width: "100%", maxWidth: 380, padding: 28, border: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Iniciá sesión</div>
            <p style={{ fontSize: 13, color: "var(--text3)", marginBottom: 24 }}>Para confirmar tu pedido necesitamos identificarte.</p>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Email</label>
                <input
                  type="email" required autoFocus
                  value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
                  placeholder="tu@email.com"
                  style={{ height: 42, borderRadius: 9, border: `1.5px solid ${loginError ? "#ef4444" : "var(--border)"}`, padding: "0 14px", fontSize: 14, background: "var(--surface2)", color: "var(--text)", outline: "none" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", textTransform: "uppercase" as const, letterSpacing: ".5px" }}>Contraseña</label>
                <input
                  type="password" required
                  value={loginPass} onChange={e => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  style={{ height: 42, borderRadius: 9, border: `1.5px solid ${loginError ? "#ef4444" : "var(--border)"}`, padding: "0 14px", fontSize: 14, background: "var(--surface2)", color: "var(--text)", outline: "none" }}
                />
              </div>
              {loginError && <div style={{ fontSize: 13, color: "#ef4444", fontWeight: 500 }}>{loginError}</div>}
              <button
                type="submit" disabled={loginLoading}
                style={{ height: 44, borderRadius: 9, background: accent, color: "#000", fontSize: 14, fontWeight: 700, opacity: loginLoading ? 0.7 : 1 }}
              >
                {loginLoading ? "Ingresando…" : "Ingresar y confirmar pedido"}
              </button>
            </form>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border)", textAlign: "center" }}>
              <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>¿No tenés acceso aún?</p>
              <button
                onClick={() => { const msg = "Hola! Quiero solicitar acceso al catálogo mayorista."; window.open(`https://wa.me/${settings.whatsappNumber}?text=${encodeURIComponent(msg)}`, "_blank"); }}
                style={{ fontSize: 13, color: "#25D366", fontWeight: 600, display: "flex", alignItems: "center", gap: 6, margin: "0 auto" }}
              >
                <Icon name="whatsapp" size={15} />
                Solicitar acceso por WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.92)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", padding: 16 }}
        >
          <img
            src={lightbox}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: 8, boxShadow: "0 8px 40px rgba(0,0,0,.8)" }}
          />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,.15)", border: "none", borderRadius: "50%", width: 40, height: 40, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>
      )}
    </div>
  );
}
