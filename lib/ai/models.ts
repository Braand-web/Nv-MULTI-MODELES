export const TENCENT_HY3_FREE_MODEL = "tencent/hy3:free";
export const TENCENT_HY3_FREE_EXPIRES_AT = "2026-07-21T23:59:59.999Z";
export const FALLBACK_CHAT_MODEL = "deepseek/deepseek-v3.2";

export function isTencentHy3FreeAvailable(now = new Date()) {
  return now.getTime() <= new Date(TENCENT_HY3_FREE_EXPIRES_AT).getTime();
}

export function getDefaultChatModel(now = new Date()) {
  return isTencentHy3FreeAvailable(now)
    ? TENCENT_HY3_FREE_MODEL
    : FALLBACK_CHAT_MODEL;
}

export const DEFAULT_CHAT_MODEL = getDefaultChatModel();

export function getModelFallbacks(modelId: string) {
  if (modelId === TENCENT_HY3_FREE_MODEL) {
    return [FALLBACK_CHAT_MODEL, "openai/gpt-oss-20b"];
  }

  return [FALLBACK_CHAT_MODEL];
}

export const titleModel = {
  description: "Fast model for title generation",
  gatewayOrder: ["fireworks", "bedrock"],
  id: "moonshotai/kimi-k2.5",
  name: "Kimi K2.5",
  provider: "moonshotai",
};

export type ModelCapabilities = {
  tools: boolean;
  vision: boolean;
  reasoning: boolean;
};

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
  gatewayOrder?: string[];
  reasoningEffort?: "none" | "minimal" | "low" | "medium" | "high";
};

export const chatModels: ChatModel[] = [
  {
    description:
      "Free through July 21, 2026. Strong reasoning and agent workflows with 262K context.",
    id: TENCENT_HY3_FREE_MODEL,
    name: "Tencent Hy3 Free",
    provider: "tencent",
    reasoningEffort: "high",
  },
  {
    description: "Fast FLUX.2 image generation model",
    id: "black-forest-labs/flux.2-klein-4b",
    name: "FLUX.2 Klein",
    provider: "black-forest-labs",
  },
  {
    description: "High-quality FLUX.2 image generation model",
    id: "black-forest-labs/flux.2-pro",
    name: "FLUX.2 Pro",
    provider: "black-forest-labs",
  },
  {
    description: "OpenAI GPT Image generation model",
    id: "openai/gpt-image-1-mini",
    name: "GPT Image Mini",
    provider: "openai",
  },
  {
    description: "xAI Grok 4.5 frontier intelligence",
    id: "xai/grok-4.5",
    name: "Grok 4.5",
    provider: "xai",
  },
  {
    description: "OpenAI GPT-5.5 Flagship",
    id: "openai/gpt-5.5",
    name: "GPT-5.5",
    provider: "openai",
  },
  {
    description: "OpenAI o4-mini Reasoning",
    id: "openai/o4-mini",
    name: "o4-mini",
    provider: "openai",
    reasoningEffort: "medium",
  },
  {
    description: "OpenAI o3-pro Advanced Reasoning",
    id: "openai/o3-pro",
    name: "o3-pro",
    provider: "openai",
    reasoningEffort: "high",
  },
  {
    description: "Anthropic Claude Sonnet 5",
    id: "anthropic/claude-sonnet-5",
    name: "Claude Sonnet 5",
    provider: "anthropic",
  },
  {
    description: "Anthropic Claude Fable 5",
    id: "anthropic/claude-fable-5",
    name: "Claude Fable 5",
    provider: "anthropic",
  },
  {
    description: "Anthropic Claude Opus 4.8",
    id: "anthropic/claude-opus-4.8",
    name: "Claude Opus 4.8",
    provider: "anthropic",
  },
  {
    description: "Google Gemini 3.5 Flash",
    id: "google/gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "google",
  },
  {
    description: "Google Gemini 3.5 Pro",
    id: "google/gemini-3.5-pro",
    name: "Gemini 3.5 Pro",
    provider: "google",
  },
  {
    description: "DeepSeek V4 Pro 1.6T MoE",
    id: "deepseek/deepseek-v4-pro",
    name: "DeepSeek V4 Pro",
    provider: "deepseek",
  },
  {
    description: "DeepSeek V4 Flash MoE",
    id: "deepseek/deepseek-v4-flash",
    name: "DeepSeek V4 Flash",
    provider: "deepseek",
  },
  {
    description: "Meta Llama 4 Scout 10M Context",
    id: "meta-llama/llama-4-scout",
    name: "Llama 4 Scout",
    provider: "meta-llama",
  },
  {
    description: "Meta Llama 4 Maverick",
    id: "meta-llama/llama-4-maverick",
    name: "Llama 4 Maverick",
    provider: "meta-llama",
  },
  {
    description: "Fast and capable model with tool use",
    gatewayOrder: ["bedrock", "deepinfra"],
    id: "deepseek/deepseek-v3.2",
    name: "DeepSeek V3.2",
    provider: "deepseek",
  },
  {
    description: "Moonshot AI flagship model",
    gatewayOrder: ["fireworks", "bedrock"],
    id: "moonshotai/kimi-k2.5",
    name: "Kimi K2.5",
    provider: "moonshotai",
  },
  {
    description: "Compact reasoning model",
    gatewayOrder: ["groq", "bedrock"],
    id: "openai/gpt-oss-20b",
    name: "GPT OSS 20B",
    provider: "openai",
    reasoningEffort: "low",
  },
  {
    description: "Open-source 120B parameter model",
    gatewayOrder: ["fireworks", "bedrock"],
    id: "openai/gpt-oss-120b",
    name: "GPT OSS 120B",
    provider: "openai",
    reasoningEffort: "low",
  },
  {
    description: "Fast non-reasoning model with tool use",
    gatewayOrder: ["xai"],
    id: "xai/grok-4.1-fast-non-reasoning",
    name: "Grok 4.1 Fast",
    provider: "xai",
  },
];

export async function getCapabilities(): Promise<
  Record<string, ModelCapabilities>
> {
  const results = await Promise.all(
    chatModels.map(async (model) => {
      const lowerId = model.id.toLowerCase();
      if (lowerId === "openai/o4-mini" || lowerId === "openai/o3-pro") {
        return [model.id, { reasoning: true, tools: true, vision: true }];
      }
      if (lowerId === TENCENT_HY3_FREE_MODEL) {
        return [model.id, { reasoning: true, tools: true, vision: false }];
      }
      if (
        lowerId.includes("flux.2") ||
        lowerId.includes("gpt-image") ||
        lowerId.includes("gemini-3.1-flash-image") ||
        lowerId.includes("gemini-3-pro-image")
      ) {
        return [model.id, { reasoning: false, tools: false, vision: true }];
      }
      if (lowerId === "xai/grok-4.5") {
        return [model.id, { reasoning: false, tools: true, vision: true }];
      }
      if (
        lowerId === "anthropic/claude-sonnet-5" ||
        lowerId === "anthropic/claude-fable-5" ||
        lowerId === "anthropic/claude-opus-4.8"
      ) {
        return [model.id, { reasoning: false, tools: true, vision: true }];
      }
      if (lowerId.includes("gemini-3.5")) {
        return [model.id, { reasoning: false, tools: true, vision: true }];
      }
      if (lowerId.includes("deepseek-v4")) {
        return [model.id, { reasoning: false, tools: true, vision: false }];
      }
      if (lowerId.includes("llama-4")) {
        return [model.id, { reasoning: false, tools: true, vision: true }];
      }
      if (lowerId === "auto") {
        return [model.id, { reasoning: true, tools: true, vision: true }];
      }

      try {
        const res = await fetch(
          `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
          { next: { revalidate: 86_400 } }
        );
        if (!res.ok) {
          return [model.id, { reasoning: false, tools: false, vision: false }];
        }

        const json = await res.json();
        const endpoints = json.data?.endpoints ?? [];
        const params = new Set(
          endpoints.flatMap(
            (e: { supported_parameters?: string[] }) =>
              e.supported_parameters ?? []
          )
        );
        const inputModalities = new Set(
          json.data?.architecture?.input_modalities ?? []
        );

        return [
          model.id,
          {
            reasoning: params.has("reasoning"),
            tools: params.has("tools"),
            vision: inputModalities.has("image"),
          },
        ];
      } catch {
        return [model.id, { reasoning: false, tools: false, vision: false }];
      }
    })
  );

  return Object.fromEntries(results);
}

export const isDemo = process.env.IS_DEMO === "1";

type GatewayModel = {
  id: string;
  name: string;
  description?: string;
  architecture?: {
    input_modalities?: string[];
  };
  supported_parameters?: string[];
};

export type GatewayModelWithCapabilities = ChatModel & {
  capabilities: ModelCapabilities;
};

export async function getAllGatewayModels(): Promise<
  GatewayModelWithCapabilities[]
> {
  try {
    const url = process.env.OPENROUTER_API_KEY
      ? "https://openrouter.ai/api/v1/models"
      : "https://ai-gateway.vercel.sh/v1/models";

    const res = await fetch(url, {
      next: { revalidate: 86_400 },
    });
    if (!res.ok) {
      return [];
    }

    const json = await res.json();
    return (json.data ?? []).map((m: GatewayModel) => {
      const hasVision = m.architecture?.input_modalities?.includes("image") ?? false;
      const hasTools = m.supported_parameters?.includes("tools") ?? false;
      const hasReasoning = m.supported_parameters?.includes("reasoning") ?? false;

      return {
        capabilities: {
          reasoning: hasReasoning,
          tools: hasTools,
          vision: hasVision,
        },
        description: m.description ?? "",
        id: m.id,
        name: m.name,
        provider: m.id.split("/")[0],
      };
    });
  } catch {
    return [];
  }
}

export function getActiveModels(): ChatModel[] {
  return chatModels;
}

export const allowedModelIds = new Set(chatModels.map((m) => m.id));

export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);

export type ModelAvailability = "healthy" | "impacted" | "unknown";

type GatewayEndpoint = {
  provider_name?: string;
  status?: number;
  uptime_last_15m?: number;
  uptime_last_1h?: number;
  latency_last_1h?: {
    p50?: number;
    p95?: number;
  };
};

const PROVIDER_IMPACTED_UPTIME_THRESHOLD = 99;
const PROVIDER_IMPACTED_P50_MS = 10_000;
const PROVIDER_IMPACTED_P95_MS = 30_000;

function isEndpointImpacted(endpoint: GatewayEndpoint) {
  return (
    (endpoint.status !== undefined && endpoint.status !== 0) ||
    (endpoint.uptime_last_15m !== undefined &&
      endpoint.uptime_last_15m < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.uptime_last_1h !== undefined &&
      endpoint.uptime_last_1h < PROVIDER_IMPACTED_UPTIME_THRESHOLD) ||
    (endpoint.latency_last_1h?.p50 !== undefined &&
      endpoint.latency_last_1h.p50 > PROVIDER_IMPACTED_P50_MS) ||
    (endpoint.latency_last_1h?.p95 !== undefined &&
      endpoint.latency_last_1h.p95 > PROVIDER_IMPACTED_P95_MS)
  );
}

export async function getModelAvailability(
  modelId: string
): Promise<ModelAvailability> {
  const model = chatModels.find((item) => item.id === modelId);

  if (!model) {
    return "unknown";
  }

  try {
    const res = await fetch(
      `https://ai-gateway.vercel.sh/v1/models/${model.id}/endpoints`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) {
      return "unknown";
    }

    const json = await res.json();
    const endpoints = (json.data?.endpoints ?? []) as GatewayEndpoint[];

    if (endpoints.length === 0) {
      return "unknown";
    }

    return endpoints.some(isEndpointImpacted) ? "impacted" : "healthy";
  } catch {
    return "unknown";
  }
}
