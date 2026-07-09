import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  getUserById,
  getUserSettings,
  updateUserSettings,
} from "@/lib/db/queries";
import { NextResponse } from "next/server";

const settingsSchema = z.object({
  agentActionsEnabled: z.boolean().optional(),
  allowAnalytics: z.boolean().optional(),
  allowModelImprovement: z.boolean().optional(),
  appearance: z.enum(["light", "dark", "system"]).optional(),
  avatarUrl: z.string().trim().url().or(z.literal("")).optional(),
  bio: z.string().trim().max(280).optional(),
  displayName: z.string().trim().max(80).optional(),
  instructions: z.string().trim().max(4_000).optional(),
  nickname: z.string().trim().max(80).optional(),
  webResearchEnabled: z.boolean().optional(),
});

async function getAuthenticatedUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const [dbUser] = await getUserById(session.user.id);
  return dbUser ?? null;
}

export async function GET() {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getUserSettings(dbUser.id);
    return NextResponse.json({
      settings,
      user: {
        credits: dbUser.credits,
        email: dbUser.email,
        name: dbUser.name,
        plan: dbUser.plan,
      },
    });
  } catch (error) {
    console.error("Failed to fetch user settings:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const dbUser = await getAuthenticatedUser();
    if (!dbUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = settingsSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json({ error: "Invalid settings" }, { status: 400 });
    }

    const settings = await updateUserSettings(dbUser.id, payload.data);
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Failed to update user settings:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
