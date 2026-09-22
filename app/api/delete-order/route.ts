import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_auth";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id } = await req.json();
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "catalog" } }
  );
  const { error } = await sb.from("orders").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Error al eliminar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
