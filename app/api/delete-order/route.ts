import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id } = await req.json();
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
    method: "DELETE",
    headers: {
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Accept-Profile": "catalog",
      "Content-Profile": "catalog",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json({ error: text || "Error al eliminar" }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
