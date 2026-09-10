import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Variables de entorno no configuradas" }, { status: 500 });
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    return NextResponse.json({ error: data.message ?? "Error al listar usuarios" }, { status: res.status });
  }

  const clients = (data.users ?? []).map((u: any) => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name ?? u.email,
    created_at: u.created_at,
  }));

  return NextResponse.json({ clients });
}
