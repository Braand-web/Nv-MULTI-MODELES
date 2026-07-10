import { applyPaymentStatus } from "@/lib/db/queries";
import {
  getFapshiPaymentStatus,
  toInternalPaymentStatus,
} from "@/lib/billing/fapshi";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const transId = url.searchParams.get("transId");

  if (!transId) {
    return NextResponse.redirect(new URL("/?payment=error", url.origin));
  }

  try {
    const fapshiPayment = await getFapshiPaymentStatus(transId);
    const result = await applyPaymentStatus({
      providerTransactionId: transId,
      status: toInternalPaymentStatus(fapshiPayment.status),
    });
    const isSuccessful = result.status === "successful";
    return NextResponse.redirect(
      new URL(isSuccessful ? "/?payment=success" : "/?payment=pending", url.origin)
    );
  } catch (error) {
    console.error("Unable to verify Fapshi checkout callback:", error);
    return NextResponse.redirect(new URL("/?payment=error", url.origin));
  }
}
