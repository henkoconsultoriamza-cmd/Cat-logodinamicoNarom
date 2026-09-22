import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_auth";

const VALID_STATUSES = ["pendiente", "confirmado", "en_preparacion", "entregado"];
const UUID_RE = /^[0-9a-f-]{36}$/i;

export async function PATCH(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id, status, notes, items, total } = await req.json();
  if (!id || !UUID_RE.test(id)) return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  if (status !== undefined && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
  if (items !== undefined && !Array.isArray(items)) return NextResponse.json({ error: "Items inválidos" }, { status: 400 });
  if (total !== undefined && (typeof total !== "number" || total <= 0)) return NextResponse.json({ error: "Total inválido" }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (status !== undefined) update.status = status;
  if (notes !== undefined) update.notes = String(notes).slice(0, 1000);
  if (items !== undefined) update.items = items;
  if (total !== undefined) update.total = total;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { db: { schema: "catalog" } }
  );

  const { error } = await sb.from("orders").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
