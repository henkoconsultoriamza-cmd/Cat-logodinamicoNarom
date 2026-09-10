import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET() {
  const { data, error } = await adminClient.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const clients = data.users.map(u => ({
    id: u.id,
    email: u.email,
    name: u.user_metadata?.name ?? u.email,
    created_at: u.created_at,
  }));

  return NextResponse.json({ clients });
}
