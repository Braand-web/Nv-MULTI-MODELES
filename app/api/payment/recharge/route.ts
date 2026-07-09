import { auth } from "@/app/(auth)/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount } = await request.json();
    if (!amount || amount < 100) {
      return NextResponse.json(
        { error: "Amount must be at least 100 FCFA" },
        { status: 400 }
      );
    }

    const apiUser = process.env.FAPSHI_API_USER;
    const apiKey = process.env.FAPSHI_API_KEY;

    if (!apiUser || !apiKey) {
      return NextResponse.json(
        { error: "Fapshi API credentials not configured" },
        { status: 500 }
      );
    }

    const isLive = process.env.FAPSHI_ENV === "live";
    const baseUrl = isLive
      ? "https://live.fapshi.com"
      : "https://sandbox.fapshi.com";
    const hostUrl =
      process.env.NEXTAUTH_URL || "https://origyn-liard.vercel.app";

    const response = await fetch(`${baseUrl}/initiate-pay`, {
      body: JSON.stringify({
        amount: Number(amount),
        email: session.user.email || "customer@origyn.ai",
        externalId: `recharge_${session.user.id}_${Date.now()}`,
        message: `Achat de ${amount} crédits pour Origyn`,
        redirectUrl: `${hostUrl}/api/payment/callback`,
        userId: session.user.id,
      }),
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
        apiuser: apiUser,
      },
      method: "POST",
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Fapshi error response:", errText);
      return NextResponse.json(
        { error: "Failed to initiate payment" },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ url: data.link });
  } catch (err) {
    console.error("Payment initiation error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
