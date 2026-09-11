import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_auth";

const VALID_STATUSES = ["pendiente", "confirmado", "en_preparacion", "entregado"];
const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function PATCH(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id, status } = await req.json();
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const res = await fetch(`${supabaseUrl}/rest/v1/orders?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
      "Accept-Profile": "catalog",
      "Content-Profile": "catalog",
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const data = await res.json();
    return NextResponse.json({ error: data?.message ?? "Error al actualizar" }, { status: res.status });
  }
  return NextResponse.json({ ok: true });
}
