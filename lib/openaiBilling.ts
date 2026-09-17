// [MANUAL_SETUP_REQUIRED]: OpenAI Admin Key required in .env.local
const OPENAI_ADMIN_KEY = process.env.OPENAI_ADMIN_KEY || "";

interface OpenAIUsageBucket {
  input_tokens: number;
  output_tokens: number;
  num_model_requests: number;
}

/**
 * Fetches total month-to-date completion token spend estimate from OpenAI Usage API
 */
export async function getOpenAiMonthToDateSpend(adminKey: string = OPENAI_ADMIN_KEY): Promise<number> {
  const now = new Date();
  const startOfMonth = Math.floor(new Date(now.getFullYear(), now.getMonth(), 1).getTime() / 1000);

  try {
    const response = await fetch(
      `https://api.openai.com/v1/organization/usage/completions?start_time=${startOfMonth}`,
      {
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`OpenAI Usage API Error: ${response.statusText}`);
    }

    const data = await response.json();
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Aggregate token totals across response buckets
    for (const bucket of data.data || []) {
      for (const result of bucket.results || []) {
        totalInputTokens += result.input_tokens || 0;
        totalOutputTokens += result.output_tokens || 0;
      }
    }

    // Blended estimate ($2.50 / 1M input, $10.00 / 1M output - adjust per model averages)
    const estimatedCost = (totalInputTokens / 1000000) * 2.5 + (totalOutputTokens / 1000000) * 10.0;
    return parseFloat(estimatedCost.toFixed(4));
  } catch (error) {
    console.error("Failed to fetch OpenAI usage:", error);
    throw error;
  }
}

/**
 * Hard-Cap Action: Revokes/deletes an active OpenAI API key to halt further spend
 */
export async function revokeOpenAiApiKey(apiKeyId: string, adminKey: string = OPENAI_ADMIN_KEY): Promise<boolean> {
  if (!/^[A-Za-z0-9_-]+$/.test(apiKeyId)) {
    throw new Error("Invalid OpenAI API key ID format.");
  }
  try {
    const response = await fetch(`https://api.openai.com/v1/organization/api_keys/${apiKeyId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log(`CRITICAL: OpenAI API Key ${apiKeyId} successfully revoked by CCAO.`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to revoke OpenAI key ${apiKeyId}:`, error);
    return false;
  }
}