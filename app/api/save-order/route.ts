import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";


export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const caller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
  const { data: { user } } = await caller.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });

  const { items, total } = await req.json();
  if (!Array.isArray(items) || items.length === 0 || typeof total !== "number") {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Prefer": "return=representation",
      "Accept-Profile": "catalog",
      "Content-Profile": "catalog",
    },
    body: JSON.stringify({
      client_id:    user.id,
      client_email: user.email,
      client_name:  user.user_metadata?.name ?? user.email,
      items,
      total,
      status: "pendiente",
    }),
  });

  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) return NextResponse.json({ error: data?.message ?? data ?? "Error al guardar el pedido", status: res.status }, { status: res.status });
  return NextResponse.json({ ok: true, supabaseStatus: res.status, data });
}
