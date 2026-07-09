import { getUserById, updateUserCredits } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const transId = searchParams.get("transId");

  const hostUrl =
    process.env.NEXTAUTH_URL || "https://origyn-liard.vercel.app";

  if (!transId) {
    return NextResponse.redirect(new URL("/?payment=error", hostUrl));
  }

  try {
    const apiUser = process.env.FAPSHI_API_USER;
    const apiKey = process.env.FAPSHI_API_KEY;

    if (!apiUser || !apiKey) {
      console.error("Fapshi API credentials not configured in callback");
      return NextResponse.redirect(new URL("/?payment=error", hostUrl));
    }

    const isLive = process.env.FAPSHI_ENV === "live";
    const baseUrl = isLive
      ? "https://live.fapshi.com"
      : "https://sandbox.fapshi.com";

    const response = await fetch(`${baseUrl}/payment-status/${transId}`, {
      headers: {
        apikey: apiKey,
        apiuser: apiUser,
      },
      method: "GET",
    });

    if (!response.ok) {
      console.error("Failed to verify payment status with Fapshi");
      return NextResponse.redirect(new URL("/?payment=error", hostUrl));
    }

    const data = await response.json();

    if (data.status === "SUCCESSFUL" && data.userId) {
      const users = await getUserById(data.userId);
      const dbUser = users[0];

      if (dbUser) {
        const addedCredits = Number(data.amount);
        const newCredits = dbUser.credits + addedCredits;
        await updateUserCredits({ id: dbUser.id, credits: newCredits });
        return NextResponse.redirect(new URL("/?payment=success", hostUrl));
      }
    }

    return NextResponse.redirect(new URL("/?payment=error", hostUrl));
  } catch (err) {
    console.error("Payment verification callback error:", err);
    return NextResponse.redirect(new URL("/?payment=error", hostUrl));
  }
}
