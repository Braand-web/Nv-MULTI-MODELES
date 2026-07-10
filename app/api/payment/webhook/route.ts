import { applyPaymentStatus } from "@/lib/db/queries";
import {
  getFapshiPaymentStatus,
  toInternalPaymentStatus,
} from "@/lib/billing/fapshi";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as { transId?: string };
    if (!payload.transId) {
      return NextResponse.json({ error: "Missing transaction id" }, { status: 400 });
    }

    // The payload only tells us what to verify. Credits are issued exclusively
    // from the status returned by Fapshi's authenticated API.
    const fapshiPayment = await getFapshiPaymentStatus(payload.transId);
    await applyPaymentStatus({
      providerTransactionId: payload.transId,
      status: toInternalPaymentStatus(fapshiPayment.status),
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Unable to process Fapshi webhook:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
