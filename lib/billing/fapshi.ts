export type FapshiPaymentStatus =
  | "SUCCESSFUL"
  | "FAILED"
  | "EXPIRED"
  | "PENDING";

type FapshiStatusResponse = {
  status?: FapshiPaymentStatus;
};

function getFapshiConfig() {
  const apiKey = process.env.FAPSHI_API_KEY;
  const apiUser = process.env.FAPSHI_API_USER;

  if (!apiKey || !apiUser) {
    throw new Error("Fapshi API credentials are not configured");
  }

  return {
    baseUrl:
      process.env.FAPSHI_ENV === "live"
        ? "https://live.fapshi.com"
        : "https://sandbox.fapshi.com",
    headers: { apikey: apiKey, apiuser: apiUser },
  };
}

export function toInternalPaymentStatus(status?: FapshiPaymentStatus) {
  switch (status) {
    case "SUCCESSFUL":
      return "successful" as const;
    case "FAILED":
      return "failed" as const;
    case "EXPIRED":
      return "expired" as const;
    default:
      return "pending" as const;
  }
}

export async function getFapshiPaymentStatus(transId: string) {
  const { baseUrl, headers } = getFapshiConfig();
  const response = await fetch(`${baseUrl}/payment-status/${transId}`, {
    headers,
    method: "GET",
  });

  if (!response.ok) {
    throw new Error("Unable to verify the Fapshi payment status");
  }

  return (await response.json()) as FapshiStatusResponse;
}

export async function initiateFapshiPayment({
  amount,
  email,
  externalId,
  message,
  redirectUrl,
  userId,
}: {
  amount: number;
  email: string;
  externalId: string;
  message: string;
  redirectUrl: string;
  userId: string;
}) {
  const { baseUrl, headers } = getFapshiConfig();
  const response = await fetch(`${baseUrl}/initiate-pay`, {
    body: JSON.stringify({
      amount,
      email,
      externalId,
      message,
      redirectUrl,
      userId,
    }),
    headers: { ...headers, "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Unable to initiate the Fapshi payment");
  }

  return (await response.json()) as { link?: string; transId?: string };
}
