import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/orders?order=created_at.desc`, {
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Accept-Profile": "catalog",
    },
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data?.message ?? "Error al listar pedidos" }, { status: res.status });
  return NextResponse.json({ orders: data ?? [] });
}
