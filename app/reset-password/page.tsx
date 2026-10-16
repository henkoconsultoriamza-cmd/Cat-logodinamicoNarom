"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword]     = useState("");
  const [confirm, setConfirm]       = useState("");
  const [status, setStatus]         = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg]               = useState("");
  const [ready, setReady]           = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);

  // Supabase pasa el token en el hash (#access_token=...&type=recovery)
  // onAuthStateChange lo intercepta y establece la sesión automáticamente
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
        setIsAdmin(session?.user?.app_metadata?.is_admin === true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setMsg("La contraseña debe tener al menos 6 caracteres."); return; }
    if (password !== confirm) { setMsg("Las contraseñas no coinciden."); return; }
    setStatus("loading");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setMsg("Error: " + error.message); setStatus("error"); return; }
    setStatus("done");
  }

  const N = { navy: "#02152C", amber: "#F4AA24", bg: "#f0f4f8", border: "#e2e8f0", text: "#0f172a", text2: "#475569", danger: "#dc2626", success: "#16a34a" };

  return (
    <div style={{ minHeight: "100vh", background: N.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, border: `1px solid ${N.border}`, padding: "40px 36px", width: "100%", maxWidth: 400, boxShadow: "0 4px 24px rgba(0,0,0,.08)" }}>

        <div style={{ marginBottom: 28, textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: N.navy, letterSpacing: "-1px" }}>Narom Group</div>
          <div style={{ fontSize: 14, color: N.text2, marginTop: 6 }}>Restablecer contraseña</div>
        </div>

        {status === "done" ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: N.success, marginBottom: 8 }}>Contraseña actualizada</div>
            <div style={{ fontSize: 14, color: N.text2, marginBottom: 24 }}>Ya podés iniciar sesión con tu nueva contraseña.</div>
            <a href={isAdmin ? "/admin" : "/"} style={{ display: "inline-block", padding: "10px 24px", background: N.amber, color: N.navy, borderRadius: 8, fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
              {isAdmin ? "Ir al panel" : "Ir al catálogo"}
            </a>
          </div>
        ) : !ready ? (
          <div style={{ textAlign: "center", color: N.text2, fontSize: 14 }}>
            Verificando enlace…
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: N.text2, textTransform: "uppercase", letterSpacing: ".6px" }}>Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                style={{ height: 42, borderRadius: 8, border: `1.5px solid ${N.border}`, padding: "0 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: N.text2, textTransform: "uppercase", letterSpacing: ".6px" }}>Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repetí la contraseña"
                required
                style={{ height: 42, borderRadius: 8, border: `1.5px solid ${N.border}`, padding: "0 12px", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            {msg && (
              <div style={{ fontSize: 13, color: status === "error" ? N.danger : N.text2, background: (status === "error" ? N.danger : N.text2) + "12", padding: "8px 12px", borderRadius: 8 }}>
                {msg}
              </div>
            )}
            <button
              type="submit"
              disabled={status === "loading"}
              style={{ height: 42, background: N.amber, color: N.navy, border: "none", borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: status === "loading" ? "not-allowed" : "pointer", opacity: status === "loading" ? .7 : 1 }}
            >
              {status === "loading" ? "Guardando…" : "Cambiar contraseña"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
