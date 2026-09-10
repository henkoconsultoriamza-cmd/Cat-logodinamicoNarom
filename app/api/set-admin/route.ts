import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

export async function POST(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id, is_admin } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id del usuario" }, { status: 400 });
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
    body: JSON.stringify({ app_metadata: { is_admin: !!is_admin } }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.message ?? "Error" }, { status: res.status });
  return NextResponse.json({ ok: true });
}
