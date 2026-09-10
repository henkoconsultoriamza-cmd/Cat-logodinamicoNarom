import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return NextResponse.json({ error: "Configuración incompleta" }, { status: 500 });

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
    headers: { "apikey": serviceKey, "Authorization": `Bearer ${serviceKey}` },
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.message ?? "Error al listar usuarios" }, { status: res.status });

  const clients = (data.users ?? []).map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name ?? u.email,
    user_metadata: u.user_metadata ?? {},
    app_metadata: u.app_metadata ?? {},
    created_at: u.created_at,
  }));

  return NextResponse.json({ clients });
}
