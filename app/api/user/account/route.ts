import { auth } from "@/app/(auth)/auth";
import { deleteUserAccount } from "@/lib/db/queries";
import { NextResponse } from "next/server";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  if (payload?.confirmation !== "DELETE") {
    return NextResponse.json({ error: "Confirmation required" }, { status: 400 });
  }

  try {
    await deleteUserAccount(session.user.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete user account:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
