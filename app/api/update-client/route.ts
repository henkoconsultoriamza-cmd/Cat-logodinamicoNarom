import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  const { id, name, business, phone, address, tax_id } = await req.json();

  if (!id) return NextResponse.json({ error: "Falta el id del usuario" }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Variables de entorno no configuradas" }, { status: 500 });
  }

  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "apikey": serviceKey,
      "Authorization": `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({
      user_metadata: { name, business, phone, address, tax_id },
    }),
  });

  const data = await res.json();
  if (!res.ok) return NextResponse.json({ error: data.message ?? "Error al actualizar" }, { status: res.status });
  return NextResponse.json({ user: data });
}
