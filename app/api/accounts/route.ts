import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { encryptSecret } from "@/lib/crypto";
import type { CloudProvider, GcpAccount } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/accounts: the signed-in user's linked cloud and API accounts. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data, error } = await supabase
    .from("gcp_accounts")
    .select("id, provider, name, project_id, api_key_id, billing_account_id, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load cloud accounts." },
      { status: 500 }
    );
  }
  return NextResponse.json({ accounts: data ?? [] });
}

interface CreateAccountBody {
  provider?: CloudProvider;
  project_id?: string;
  name?: string;
  billing_account_id?: string;
  client_email?: string;
  private_key?: string;
  admin_api_key?: string;
  api_key_id?: string;
}

/**
 * POST /api/accounts: link a GCP project. The service-account key is encrypted at
 * rest with CRYPTO_SECRET (see lib/crypto.ts) before being stored, and is never
 * returned by any subsequent read endpoint.
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: CreateAccountBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const provider = body.provider ?? "gcp";
  if (!["gcp", "aws", "openai"].includes(provider)) {
    return NextResponse.json({ error: "provider must be gcp, aws, or openai." }, { status: 400 });
  }

  const projectId = body.project_id?.trim() ?? "";
  if (provider === "gcp" && !projectId) {
    return NextResponse.json(
      { error: "project_id is required." },
      { status: 400 }
    );
  }

  if (provider === "gcp" && (!body.client_email || !body.private_key)) {
    return NextResponse.json(
      { error: "client_email and private_key are required (service-account JSON)." },
      { status: 400 }
    );
  }

  if (provider === "openai" && (!body.admin_api_key?.trim() || !body.api_key_id?.trim())) {
    return NextResponse.json(
      { error: "admin_api_key and api_key_id are required for OpenAI accounts." },
      { status: 400 }
    );
  }

  if (body.api_key_id && !/^[A-Za-z0-9_-]+$/.test(body.api_key_id.trim())) {
    return NextResponse.json(
      { error: "api_key_id contains unsupported characters." },
      { status: 400 }
    );
  }

  const encrypted = provider === "gcp"
    ? encryptSecret(JSON.stringify({
        client_email: body.client_email?.trim(),
        private_key: body.private_key,
      }))
    : provider === "openai"
      ? encryptSecret(body.admin_api_key!.trim())
      : "";

  const { data, error } = await supabase
    .from("gcp_accounts")
    .insert({
      user_id: user.id,
      provider,
      project_id: projectId,
      name: body.name?.trim() || projectId || body.api_key_id?.trim() || provider,
      credentials_encrypted: encrypted,
      api_key_id: body.api_key_id?.trim() ?? null,
      billing_account_id: body.billing_account_id?.trim() ?? "",
    })
    .select("id, provider, name, project_id, api_key_id, billing_account_id, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create cloud account." },
      { status: 500 }
    );
  }

  return NextResponse.json({ account: data as GcpAccount }, { status: 201 });
}