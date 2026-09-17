import { CostExplorerClient, GetCostAndUsageCommand } from "@aws-sdk/client-cost-explorer";
import { IAMClient, PutUserPolicyCommand } from "@aws-sdk/client-iam";

// [MANUAL_SETUP_REQUIRED]: Ensure AWS credentials are defined in .env.local
const awsConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
};

const ceClient = new CostExplorerClient(awsConfig);
const iamClient = new IAMClient(awsConfig);

/**
 * Fetches Month-To-Date (MTD) unblended cost for AWS account
 */
export async function getAwsMonthToDateSpend(): Promise<number> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const today = now.toISOString().split("T")[0];

  // AWS requires start and end date to be different
  const endDate = startOfMonth === today 
    ? new Date(now.getTime() + 86400000).toISOString().split("T")[0] 
    : today;

  const command = new GetCostAndUsageCommand({
    TimePeriod: { Start: startOfMonth, End: endDate },
    Granularity: "MONTHLY",
    Metrics: ["UnblendedCost"],
  });

  try {
    const response = await ceClient.send(command);
    const amountStr = response.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || "0";
    return parseFloat(amountStr);
  } catch (error) {
    console.error("Error fetching AWS cost data:", error);
    throw error;
  }
}

/**
 * Hard-Cap Action: Attaches a DenyAll IAM policy to block billing-heavy operations
 */
export async function freezeAwsAccount(iamUserName: string): Promise<void> {
  const denyAllPolicy = JSON.stringify({
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Deny",
        Action: "*",
        Resource: "*",
      },
    ],
  });

  const command = new PutUserPolicyCommand({
    UserName: iamUserName,
    PolicyName: "CCAO_AutoKill_DenyAll",
    PolicyDocument: denyAllPolicy,
  });

  await iamClient.send(command);
  console.log(`CRITICAL: Hard-cap enforced on AWS user ${iamUserName}`);
}