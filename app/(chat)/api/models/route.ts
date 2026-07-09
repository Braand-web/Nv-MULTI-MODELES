import { getModelProfiles } from "@/lib/ai/model-router";
import { getAllGatewayModels, getCapabilities, isDemo } from "@/lib/ai/models";

export async function GET() {
  const headers = {
    "Cache-Control": "public, max-age=86400, s-maxage=86400",
  };

  const curatedCapabilities = await getCapabilities();
  const profiles = getModelProfiles();

  if (isDemo || process.env.OPENROUTER_API_KEY) {
    const models = await getAllGatewayModels();
    const capabilities = Object.fromEntries(
      models.map((m) => [m.id, curatedCapabilities[m.id] ?? m.capabilities])
    );

    return Response.json({ capabilities, models, profiles }, { headers });
  }

  return Response.json({ capabilities: curatedCapabilities, profiles }, { headers });
}
