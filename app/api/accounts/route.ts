import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { encryptSecret } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkUserEntitlement, entitlementRequiredResponse } from "@/lib/entitlementServer";
import type { CloudProvider, GcpAccount } from "@/lib/types";

export const runtime = "nodejs";
const MAX_LINKED_ACCOUNTS_PER_USER = 10;

/** GET /api/accounts: the signed-in user's linked cloud and API accounts. */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const getEntitlement = await checkUserEntitlement(user.id);
  if (!getEntitlement.entitled) {
    return NextResponse.json(entitlementRequiredResponse(getEntitlement.status), {
      status: 402,
    });
  }

  const admin = getSupabaseAdmin();
  const [gcpResult, openaiResult, awsResult] = await Promise.all([
    supabase
      .from("gcp_accounts")
      .select("id, provider, name, project_id, api_key_id, billing_account_id, created_at, updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    admin
      .from("openai_accounts")
      .select("id, account_name, created_at, target_api_key")
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
      updated_at: account.created_at,
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
  serviceAccountKey?: string | Record<string, unknown> | null;
  service_account_key?: string | Record<string, unknown> | null;
  credentials?: string | Record<string, unknown> | null;
  targetApiKey?: string;
  target_api_key?: string;
  gcpProjectId?: string;
  gcp_project_id?: string;
  projectId?: string;
  targetProjectId?: string;
  project_id?: string;
  name?: string;
  billing_account_id?: string;
  client_email?: string;
  private_key?: string;
  admin_api_key?: string;
  api_key_id?: string;
  data_handling_consent?: boolean;
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

  const postEntitlement = await checkUserEntitlement(user.id);
  if (!postEntitlement.entitled) {
    return NextResponse.json(entitlementRequiredResponse(postEntitlement.status), {
      status: 402,
    });
  }

  let body: CreateAccountBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.data_handling_consent !== true) {
    return NextResponse.json(
      { error: "Confirm authorization and data handling before linking an account." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  const accountCounts = await Promise.all([
    admin.from("gcp_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("aws_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    admin.from("openai_accounts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (accountCounts.some((result) => result.error)) {
    return NextResponse.json({ error: "Unable to verify account quota." }, { status: 503 });
  }
  const linkedAccountCount = accountCounts.reduce((total, result) => total + (result.count ?? 0), 0);
  if (linkedAccountCount >= MAX_LINKED_ACCOUNTS_PER_USER) {
    return NextResponse.json(
      { error: `Account limit reached (${MAX_LINKED_ACCOUNTS_PER_USER} linked accounts per user).` },
      { status: 429 }
    );
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
      console.error("Failed to encrypt OpenAI credentials.");
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
        console.error("Failed to create OpenAI account.");
        return NextResponse.json({ error: "Failed to create OpenAI account." }, { status: 500 });
      }

      return NextResponse.json({ account: data }, { status: 201 });
    } catch (error) {
      console.error("Failed to create OpenAI account.");
      return NextResponse.json({ error: "Failed to create OpenAI account." }, { status: 500 });
    }
  }

  if (provider === "gcp") {
    const accountLabel = body.label || body.account_name || body.accountLabel;
    const label = accountLabel?.trim() || body.name?.trim();
    const gcpProjectId = body.gcpProjectId?.trim()
      || body.gcp_project_id?.trim()
      || body.projectId?.trim()
      || body.targetApiKey?.trim()
      || body.project_id?.trim();
    const serviceAccountKey = body.serviceAccountKey
      || body.service_account_key
      || body.credentials
      || body.adminApiKey
      || (body.client_email && body.private_key
        ? { client_email: body.client_email.trim(), private_key: body.private_key }
        : null);

    if (!label || !gcpProjectId || !serviceAccountKey) {
      return NextResponse.json(
        { error: "Account label, GCP Project ID, and Service Account Key are required for GCP accounts." },
        { status: 400 }
      );
    }

    const keyPlaintext = typeof serviceAccountKey === "object"
      ? JSON.stringify(serviceAccountKey)
      : serviceAccountKey;

    let encryptedKey: string;
    try {
      encryptedKey = encryptSecret(keyPlaintext);
    } catch (error) {
      console.error("[api/accounts] GCP credential encryption failed.");
      return NextResponse.json(
        { error: "Credential encryption is not configured." },
        { status: 500 }
      );
    }

    const cleanGcpPayload: Record<string, unknown> = {
      user_id: user.id,
      account_name: label,
      gcp_project_id: gcpProjectId,
      project_id: gcpProjectId,
      service_account_key: encryptedKey,
    };

    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("gcp_accounts")
      .insert(cleanGcpPayload)
      .select("id, provider, name, project_id, api_key_id, billing_account_id, created_at, updated_at")
      .single();

    if (error) {
      console.error("[api/accounts] GCP account insert failed.");
      return NextResponse.json({ error: "Failed to create cloud account." }, { status: 500 });
    }

    return NextResponse.json({ success: true, data, account: data }, { status: 201 });
  }

  const projectId = body.project_id?.trim() ?? "";

  if (body.api_key_id && !/^[A-Za-z0-9_-]+$/.test(body.api_key_id.trim())) {
    return NextResponse.json(
      { error: "api_key_id contains unsupported characters." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("gcp_accounts")
    .insert({
      user_id: user.id,
      provider,
      project_id: projectId,
      name: body.name?.trim() || projectId || body.api_key_id?.trim() || provider,
      credentials_encrypted: "",
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