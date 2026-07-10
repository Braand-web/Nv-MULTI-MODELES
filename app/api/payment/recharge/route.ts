import { randomUUID } from "node:crypto";
import { auth } from "@/app/(auth)/auth";
import { getBillingProduct } from "@/lib/billing/catalog";
import { initiateFapshiPayment } from "@/lib/billing/fapshi";
import { createPendingPayment, getUserById } from "@/lib/db/queries";
import { NextResponse } from "next/server";
import { z } from "zod";

const checkoutSchema = z.object({ productId: z.string().trim().min(1).max(64) });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid checkout product" }, { status: 400 });
  }

  const product = getBillingProduct(parsed.data.productId);
  if (!product) {
    return NextResponse.json({ error: "Unknown checkout product" }, { status: 404 });
  }

  const [dbUser] = await getUserById(session.user.id);
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  try {
    const externalId = `origyn_${randomUUID()}`;
    const now = new Date();
    const startsAt =
      dbUser.planExpiresAt && dbUser.planExpiresAt > now
        ? dbUser.planExpiresAt
        : now;
    const periodEndsAt = product.intervalDays
      ? new Date(startsAt.getTime() + product.intervalDays * 86_400_000)
      : undefined;
    const origin = new URL(request.url).origin;
    const checkout = await initiateFapshiPayment({
      amount: product.priceXaf,
      email: session.user.email ?? "customer@origyn.ai",
      externalId,
      message: `${product.label} - Origyn`,
      redirectUrl: `${origin}/api/payment/callback`,
      userId: session.user.id,
    });

    if (!checkout.link || !checkout.transId) {
      throw new Error("Fapshi did not return a checkout transaction");
    }

    await createPendingPayment({
      amountXaf: product.priceXaf,
      creditAmount: product.credits,
      externalId,
      kind: product.kind,
      periodEndsAt,
      plan: product.plan,
      productId: product.id,
      providerTransactionId: checkout.transId,
      userId: session.user.id,
    });

    return NextResponse.json({ url: checkout.link });
  } catch (error) {
    console.error("Unable to initiate Fapshi checkout:", error);
    return NextResponse.json(
      { error: "Unable to initiate payment. Please try again." },
      { status: 502 }
    );
  }
}
