import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { encryptSecret } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import type { CloudProvider, GcpAccount } from "@/lib/types";

export const runtime = "nodejs";

/** GET /api/accounts: the signed-in user's linked cloud and API accounts. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const [gcpResult, openaiResult, awsResult] = await Promise.all([
    supabase
      .from("gcp_accounts")
      .select("id, provider, name, project_id, api_key_id, billing_account_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("openai_accounts")
      .select("id, account_name, target_api_key, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("aws_accounts")
      .select("id, account_name, account_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (gcpResult.error) {
    return NextResponse.json(
      { error: "Failed to load cloud accounts." },
      { status: 500 }
    );
  }

  const accounts = [
    ...(gcpResult.data ?? []),
    ...((openaiResult.data ?? []).map((account) => ({
      id: account.id,
      provider: "openai" as const,
      name: account.account_name,
      project_id: account.target_api_key ?? "",
      api_key_id: account.target_api_key,
      billing_account_id: "",
      created_at: account.created_at,
      updated_at: account.updated_at,
    }))),
    ...((awsResult.data ?? []).map((account) => ({
      id: account.id,
      provider: "aws" as const,
      name: account.account_name,
      project_id: account.account_id,
      billing_account_id: "",
      created_at: account.created_at,
      updated_at: account.updated_at,
    }))),
  ].sort((left, right) => right.created_at.localeCompare(left.created_at));

  return NextResponse.json({ accounts });
}

interface CreateAccountBody {
  provider?: CloudProvider;
  label?: string;
  account_name?: string;
  accountLabel?: string;
  adminApiKey?: string;
  apiKey?: string;
  targetApiKey?: string;
  target_api_key?: string;
  targetProjectId?: string;
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

  if (provider === "openai") {
    const adminApiKey = body.adminApiKey?.trim() || body.admin_api_key?.trim() || body.apiKey?.trim();
    const accountName = body.label?.trim() || body.account_name?.trim() || body.accountLabel?.trim();
    const targetApiKey = body.targetApiKey?.trim() || body.target_api_key?.trim() || body.targetProjectId?.trim() || null;
    if (!adminApiKey || !accountName) {
      return NextResponse.json(
        { error: "adminApiKey and label or account_name are required for OpenAI accounts." },
        { status: 400 }
      );
    }

    if (!process.env.CRYPTO_SECRET) {
      console.error("CRYPTO_SECRET is not configured; refusing to store OpenAI credentials.");
      return NextResponse.json({ error: "Credential encryption is not configured." }, { status: 500 });
    }

    let encryptedAdminKey: string;
    try {
      encryptedAdminKey = encryptSecret(adminApiKey);
    } catch (error) {
      console.error("Failed to encrypt OpenAI credentials.", error);
      return NextResponse.json({ error: "Failed to secure OpenAI credentials." }, { status: 500 });
    }

    try {
      const admin = getSupabaseAdmin();
      const { data, error } = await admin.from("openai_accounts").insert({
        user_id: user.id,
        account_name: accountName,
        admin_api_key: encryptedAdminKey,
        target_api_key: targetApiKey,
      });

      if (error) {
        console.error("Failed to create OpenAI account.", error);
        return NextResponse.json({ error: "Failed to create OpenAI account." }, { status: 500 });
      }

      return NextResponse.json({ account: data }, { status: 201 });
    } catch (error) {
      console.error("Failed to create OpenAI account.", error);
      return NextResponse.json({ error: "Failed to create OpenAI account." }, { status: 500 });
    }
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