import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function DELETE(request: Request) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 503 }
    );
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  // Deleting user from auth.users triggers ON DELETE CASCADE across all public tables
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(user.id);
  
  if (deleteUserError) {
    console.error("[user/delete] failed to delete auth user", deleteUserError);
    return NextResponse.json(
      { error: "Unable to delete the account." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  const cookieName = process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ?? "sb-ccao-auth-token";
  
  for (const cookie of request.headers.get("cookie")?.split(";") ?? []) {
    const name = cookie.trim().split("=")[0];
    if (name === cookieName || name.startsWith(`${cookieName}-`)) {
      response.cookies.delete(name);
    }
  }

  return response;
}