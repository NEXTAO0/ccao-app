import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** PATCH /api/budgets/:id: update a budget (auto_kill toggle, threshold, email list). */
export async function PATCH(request: Request, { params }: Params) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const allowed: Record<string, unknown> = {};

  if (body.name !== undefined) allowed.name = String(body.name).trim();
  if (body.threshold_amount !== undefined) {
    const threshold = Number(body.threshold_amount);
    if (!Number.isFinite(threshold) || threshold <= 0) {
      return NextResponse.json(
        { error: "threshold_amount must be a positive number." },
        { status: 400 }
      );
    }
    allowed.threshold_amount = threshold;
  }
  if (body.currency !== undefined) allowed.currency = String(body.currency);
  if (body.auto_kill !== undefined) allowed.auto_kill = Boolean(body.auto_kill);
  if (body.active !== undefined) allowed.active = Boolean(body.active);
  if (body.period !== undefined) {
    if (!["hourly", "daily", "monthly"].includes(String(body.period))) {
      return NextResponse.json(
        { error: "period must be hourly, daily or monthly." },
        { status: 400 }
      );
    }
    allowed.period = body.period;
  }
  if (body.alert_emails !== undefined) {
    if (!Array.isArray(body.alert_emails)) {
      return NextResponse.json(
        { error: "alert_emails must be an array of strings." },
        { status: 400 }
      );
    }
    allowed.alert_emails = (body.alert_emails as string[])
      .map((e) => e.trim())
      .filter(Boolean);
  }

  if (Object.keys(allowed).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("budgets")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update budget." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Budget not found or not owned by the current user." },
      { status: 404 }
    );
  }

  return NextResponse.json({ budget: data });
}

/** DELETE /api/budgets/:id: remove a budget. */
export async function DELETE(_request: Request, { params }: Params) {
  const { supabase, user } = await requireUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id } = await params;

  const { error, count } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete budget." },
      { status: 500 }
    );
  }
  if (!count) {
    return NextResponse.json(
      { error: "Budget not found or not owned by the current user." },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}