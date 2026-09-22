import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_auth";

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "catalog" } }
  );

  const { data, error } = await sb.from("orders").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Error al listar pedidos" }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}
