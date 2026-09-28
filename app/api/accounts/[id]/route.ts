import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const { id } = await params;
  const admin = getSupabaseAdmin();

  const { data: cloudAccount, error: cloudLookupError } = await admin
    .from("gcp_accounts")
    .select("id, provider")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (cloudLookupError) {
    console.error("[api/accounts] Cloud account lookup failed:", cloudLookupError);
    return NextResponse.json({ error: "Failed to load linked account." }, { status: 500 });
  }

  if (cloudAccount) {
    if (cloudAccount.provider === "aws") {
      const { error: budgetsError } = await admin
        .from("budgets")
        .delete()
        .eq("user_id", user.id)
        .eq("aws_account_id", id);
      if (budgetsError) {
        console.error("[api/accounts] AWS budget cleanup failed:", budgetsError);
        return NextResponse.json({ error: "Failed to remove budgets linked to this account." }, { status: 500 });
      }
    }

    const { error } = await admin
      .from("gcp_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[api/accounts] Cloud account unlink failed:", error);
      return NextResponse.json({ error: "Failed to unlink account." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data: awsAccount, error: awsLookupError } = await admin
    .from("aws_accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (awsLookupError) {
    console.error("[api/accounts] AWS account lookup failed:", awsLookupError);
    return NextResponse.json({ error: "Failed to load linked account." }, { status: 500 });
  }

  if (awsAccount) {
    const { error: budgetsError } = await admin
      .from("budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("aws_account_id", id);
    if (budgetsError) {
      console.error("[api/accounts] AWS budget cleanup failed:", budgetsError);
      return NextResponse.json({ error: "Failed to remove budgets linked to this account." }, { status: 500 });
    }

    const { error } = await admin
      .from("aws_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      console.error("[api/accounts] AWS account unlink failed:", error);
      return NextResponse.json({ error: "Failed to unlink account." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const { data: openaiAccount, error: openaiLookupError } = await admin
    .from("openai_accounts")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (openaiLookupError) {
    console.error("[api/accounts] OpenAI account lookup failed:", openaiLookupError);
    return NextResponse.json({ error: "Failed to load linked account." }, { status: 500 });
  }

  if (!openaiAccount) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const { error: budgetsError } = await admin
    .from("budgets")
    .delete()
    .eq("user_id", user.id)
    .eq("openai_account_id", id);
  if (budgetsError) {
    console.error("[api/accounts] OpenAI budget cleanup failed:", budgetsError);
    return NextResponse.json({ error: "Failed to remove budgets linked to this account." }, { status: 500 });
  }

  const { error } = await admin
    .from("openai_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    console.error("[api/accounts] OpenAI account unlink failed:", error);
    return NextResponse.json({ error: "Failed to unlink account." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}