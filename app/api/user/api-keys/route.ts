import { createHash, randomBytes } from "node:crypto";
import type { Session } from "next-auth";
import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import {
  createUserApiKey,
  listUserApiKeys,
  revokeUserApiKey,
} from "@/lib/db/queries";
import { NextResponse } from "next/server";

const createKeySchema = z.object({
  name: z.string().trim().min(1).max(80),
});

function getUserId(session: Session | null) {
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = getUserId(await auth());
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ keys: await listUserApiKeys(userId) });
  } catch (error) {
    console.error("Failed to list API keys:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const userId = getUserId(await auth());
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = createKeySchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid key name" }, { status: 400 });
  }

  try {
    const secret = `origyn_${randomBytes(32).toString("base64url")}`;
    const key = await createUserApiKey({
      keyHash: createHash("sha256").update(secret).digest("hex"),
      keyPrefix: secret.slice(0, 14),
      name: payload.data.name,
      userId,
    });

    return NextResponse.json({
      key: { createdAt: key.createdAt, id: key.id, name: key.name },
      secret,
    });
  } catch (error) {
    console.error("Failed to create API key:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const userId = getUserId(await auth());
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing key id" }, { status: 400 });
  }

  try {
    await revokeUserApiKey({ id, userId });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to revoke API key:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
