import { auth } from "@/app/(auth)/auth";
import { getUsageSummary } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      period: "30d",
      usage: await getUsageSummary(session.user.id),
    });
  } catch (error) {
    console.error("Failed to fetch usage summary:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
