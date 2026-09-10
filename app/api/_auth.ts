import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function requireAdmin(req: NextRequest): Promise<{ error: string; status: number } | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No autorizado", status: 401 };

  const caller = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user } } = await caller.auth.getUser();
  if (!user?.app_metadata?.is_admin) return { error: "Acceso denegado", status: 403 };

  return null;
}
