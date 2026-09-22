import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "../_auth";

export async function DELETE(req: NextRequest) {
  const authErr = await requireAdmin(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  const { id, email } = await req.json();
  if (!id) return NextResponse.json({ error: "Falta el id" }, { status: 400 });

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Limpiar referencias en catalog schema antes de borrar el usuario
  if (email) {
    await sb.schema("catalog").from("orders").delete().eq("client_email", email);
  }

  // Intentar borrar también de cualquier tabla profiles/clients si existe
  try {
    await sb.schema("catalog").from("clients").delete().eq("user_id", id);
  } catch {}

  const { error } = await sb.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
