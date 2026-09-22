import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function requireAdmin(req: NextRequest): Promise<{ error: string; status: number } | null> {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return { error: "No autorizado", status: 401 };

  // Use service role to verify the token server-side — never trust client-side anon key for auth checks
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return { error: "Sesión inválida", status: 401 };
  if (!user.app_metadata?.is_admin) return { error: "Acceso denegado", status: 403 };

  return null;
}
