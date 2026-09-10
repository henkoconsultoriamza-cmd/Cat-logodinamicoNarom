import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { email, password, name, business, phone, address, tax_id } = await req.json();

  if (!email || !password || !name) {
    return NextResponse.json({ error: "Faltan datos obligatorios" }, { status: 400 });
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "Contraseña demasiado corta" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name, business, phone, address, tax_id } }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.message ?? "Error al crear usuario" }, { status: res.status });
  return NextResponse.json({ user: data });
}
