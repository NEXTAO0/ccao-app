import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import type { AlertLog } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/alerts?limit=25: the signed-in user's recent anomaly/budget alerts. */
export async function GET(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 25), 1), 100);

  const { data, error } = await supabase
    .from("alert_logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json(
      { error: "Failed to load alerts." },
      { status: 500 }
    );
  }
  return NextResponse.json({ alerts: (data as AlertLog[]) ?? [] });
}