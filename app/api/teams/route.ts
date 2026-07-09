import { z } from "zod";
import { auth } from "@/app/(auth)/auth";
import { createUserTeam, listUserTeams } from "@/lib/db/queries";
import { NextResponse } from "next/server";

const teamSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({ teams: await listUserTeams(session.user.id) });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = teamSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: "Invalid team name" }, { status: 400 });
  }

  try {
    return NextResponse.json(
      { team: await createUserTeam({ name: payload.data.name, userId: session.user.id }) },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create team:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
