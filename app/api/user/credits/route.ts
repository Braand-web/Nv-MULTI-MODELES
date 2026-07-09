import { auth } from "@/app/(auth)/auth";
import { getUserById } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const users = await getUserById(session.user.id);
    const dbUser = users[0];
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ credits: dbUser.credits });
  } catch (err) {
    console.error("Failed to fetch credits:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
