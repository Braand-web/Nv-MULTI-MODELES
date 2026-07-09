import type { PlanId } from "./entitlements";
import { DEFAULT_CHAT_MODEL, allowedModelIds, chatModels } from "./models";

export type TaskKind = "general" | "code" | "image" | "reasoning" | "vision";
export type ComplexityTier = "simple" | "standard" | "complex" | "expert";

type ModelProfile = {
  id: string;
  creditCost: number;
  minPlan: PlanId;
  quality: number;
  speed: number;
  maxComplexity: ComplexityTier;
  tasks: TaskKind[];
  strengths: string[];
};

export type RequestAnalysis = {
  task: TaskKind;
  complexity: ComplexityTier;
  score: number;
};

type SelectModelInput = {
  analysis?: RequestAnalysis;
  allowUnlistedModels?: boolean;
  credits: number;
  hasImageInput?: boolean;
  performanceHints?: Record<string, number>;
  prompt: string;
  selectedModelId: string;
  userPlan: PlanId;
};

type SuccessfulSelection = {
  analysis: RequestAnalysis;
  creditCost: number;
  isAutoSelection: boolean;
  modelId: string;
  ok: true;
  profile: ModelProfile;
  reason: string;
};

type FailedSelection = {
  error: "insufficient_credits" | "plan_required" | "model_unavailable";
  message: string;
  ok: false;
  requiredCredits?: number;
  requiredPlan?: PlanId;
  status: 402 | 403 | 400;
};

export type ModelSelection = SuccessfulSelection | FailedSelection;

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  elite: 2,
};

const COMPLEXITY_RANK: Record<ComplexityTier, number> = {
  simple: 0,
  standard: 1,
  complex: 2,
  expert: 3,
};

const MODEL_PROFILES: Record<string, Omit<ModelProfile, "id">> = {
  "black-forest-labs/flux.2-klein-4b": {
    creditCost: 25,
    maxComplexity: "standard",
    minPlan: "free",
    quality: 6,
    speed: 8,
    strengths: ["image-generation", "low-cost", "fast-visual-drafts"],
    tasks: ["image"],
  },
  "black-forest-labs/flux.2-pro": {
    creditCost: 70,
    maxComplexity: "expert",
    minPlan: "pro",
    quality: 9,
    speed: 6,
    strengths: ["image-generation", "photorealism", "prompt-following"],
    tasks: ["image"],
  },
  "openai/gpt-image-1-mini": {
    creditCost: 120,
    maxComplexity: "complex",
    minPlan: "elite",
    quality: 9,
    speed: 6,
    strengths: ["image-generation", "instruction-following", "reference-images"],
    tasks: ["image"],
  },
  "xai/grok-4.5": {
    creditCost: 25,
    maxComplexity: "expert",
    minPlan: "elite",
    quality: 10,
    speed: 5,
    strengths: ["frontier-general", "reasoning", "vision"],
    tasks: ["general", "code", "reasoning", "vision"],
  },
  "openai/gpt-5.5": {
    creditCost: 90,
    maxComplexity: "expert",
    minPlan: "elite",
    quality: 10,
    speed: 5,
    strengths: ["frontier-general", "reasoning", "code", "vision"],
    tasks: ["general", "code", "reasoning", "vision"],
  },
  "openai/o4-mini": {
    creditCost: 15,
    maxComplexity: "complex",
    minPlan: "pro",
    quality: 8,
    speed: 7,
    strengths: ["reasoning", "math", "code", "vision"],
    tasks: ["reasoning", "code", "general", "vision"],
  },
  "openai/o3-pro": {
    creditCost: 250,
    maxComplexity: "expert",
    minPlan: "elite",
    quality: 10,
    speed: 4,
    strengths: ["advanced-reasoning", "math", "architecture", "code"],
    tasks: ["reasoning", "code", "general", "vision"],
  },
  "anthropic/claude-sonnet-5": {
    creditCost: 30,
    maxComplexity: "complex",
    minPlan: "pro",
    quality: 9,
    speed: 6,
    strengths: ["writing", "analysis", "code", "vision"],
    tasks: ["general", "code", "reasoning", "vision"],
  },
  "anthropic/claude-fable-5": {
    creditCost: 150,
    maxComplexity: "complex",
    minPlan: "elite",
    quality: 8,
    speed: 7,
    strengths: ["writing", "conversation", "analysis", "vision"],
    tasks: ["general", "reasoning", "vision"],
  },
  "anthropic/claude-opus-4.8": {
    creditCost: 80,
    maxComplexity: "expert",
    minPlan: "elite",
    quality: 10,
    speed: 4,
    strengths: ["deep-analysis", "long-form", "code", "vision"],
    tasks: ["general", "code", "reasoning", "vision"],
  },
  "google/gemini-3.5-flash": {
    creditCost: 30,
    maxComplexity: "standard",
    minPlan: "free",
    quality: 6,
    speed: 10,
    strengths: ["fast-general", "summaries", "vision"],
    tasks: ["general", "code", "vision"],
  },
  "google/gemini-3.5-pro": {
    creditCost: 30,
    maxComplexity: "complex",
    minPlan: "pro",
    quality: 8,
    speed: 7,
    strengths: ["analysis", "long-context", "vision", "code"],
    tasks: ["general", "code", "reasoning", "vision"],
  },
  "deepseek/deepseek-v4-pro": {
    creditCost: 8,
    maxComplexity: "complex",
    minPlan: "pro",
    quality: 8,
    speed: 6,
    strengths: ["code", "reasoning", "technical-analysis"],
    tasks: ["code", "reasoning", "general"],
  },
  "deepseek/deepseek-v4-flash": {
    creditCost: 2,
    maxComplexity: "standard",
    minPlan: "free",
    quality: 6,
    speed: 9,
    strengths: ["fast-code", "general", "low-cost"],
    tasks: ["code", "general"],
  },
  "meta-llama/llama-4-scout": {
    creditCost: 2,
    maxComplexity: "standard",
    minPlan: "free",
    quality: 6,
    speed: 8,
    strengths: ["general", "vision", "large-context"],
    tasks: ["general", "code", "vision"],
  },
  "meta-llama/llama-4-maverick": {
    creditCost: 5,
    maxComplexity: "complex",
    minPlan: "pro",
    quality: 8,
    speed: 7,
    strengths: ["general", "code", "vision"],
    tasks: ["general", "code", "vision"],
  },
  "deepseek/deepseek-v3.2": {
    creditCost: 2,
    maxComplexity: "complex",
    minPlan: "free",
    quality: 7,
    speed: 8,
    strengths: ["code", "tools", "low-cost"],
    tasks: ["code", "general", "reasoning"],
  },
  "moonshotai/kimi-k2.5": {
    creditCost: 10,
    maxComplexity: "complex",
    minPlan: "free",
    quality: 7,
    speed: 8,
    strengths: ["general", "code", "analysis", "low-cost"],
    tasks: ["general", "code", "reasoning"],
  },
  "openai/gpt-oss-20b": {
    creditCost: 1,
    maxComplexity: "standard",
    minPlan: "free",
    quality: 5,
    speed: 9,
    strengths: ["cheap-reasoning", "simple-code", "low-cost"],
    tasks: ["general", "code", "reasoning"],
  },
  "openai/gpt-oss-120b": {
    creditCost: 5,
    maxComplexity: "complex",
    minPlan: "pro",
    quality: 8,
    speed: 6,
    strengths: ["open-weight", "reasoning", "code"],
    tasks: ["general", "code", "reasoning"],
  },
  "xai/grok-4.1-fast-non-reasoning": {
    creditCost: 2,
    maxComplexity: "standard",
    minPlan: "free",
    quality: 6,
    speed: 10,
    strengths: ["fast-general", "tools", "low-latency"],
    tasks: ["general", "code"],
  },
};

const MODEL_PROFILE_LIST = chatModels.map((model) =>
  getModelRoutingProfile(model.id)
);

export function getModelRoutingProfile(modelId: string): ModelProfile {
  const profile = MODEL_PROFILES[modelId] ?? {
    creditCost: 2,
    maxComplexity: "standard" as const,
    minPlan: "free" as const,
    quality: 5,
    speed: 6,
    strengths: ["general"],
    tasks: ["general" as const],
  };

  return {
    id: modelId,
    ...profile,
  };
}

export function getModelCreditCost(modelId: string): number {
  return getModelRoutingProfile(modelId).creditCost;
}

export function getModelProfiles() {
  return Object.fromEntries(
    chatModels.map((model) => [model.id, getModelRoutingProfile(model.id)])
  );
}

export function isImageGenerationModel(modelId: string) {
  return getModelRoutingProfile(modelId).tasks.includes("image");
}

export function analyzeRequest(
  prompt: string,
  hasImageInput = false
): RequestAnalysis {
  const lowerPrompt = normalizePrompt(prompt);
  const score =
    getLengthComplexity(prompt) +
    keywordScore(lowerPrompt, [
      "architecture",
      "debug",
      "security",
      "database",
      "sql",
      "api",
      "algorithm",
      "production",
      "rentable",
      "pricing",
      "analyse",
      "analyze",
      "complex",
      "multi-step",
      "refactor",
      "migration",
      "supabase",
    ]) +
    (hasImageInput ? 2 : 0);

  return {
    complexity: toComplexityTier(score),
    score,
    task: detectTask(lowerPrompt, hasImageInput),
  };
}

function normalizePrompt(prompt: string) {
  return prompt
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function selectModelForRequest({
  analysis: providedAnalysis,
  allowUnlistedModels = false,
  credits,
  hasImageInput = false,
  performanceHints = {},
  prompt,
  selectedModelId,
  userPlan,
}: SelectModelInput): ModelSelection {
  const analysis = providedAnalysis ?? analyzeRequest(prompt, hasImageInput);

  if (selectedModelId !== "auto") {
    return selectRequestedModel({
      allowUnlistedModels,
      analysis,
      credits,
      performanceHints,
      selectedModelId,
      userPlan,
    });
  }

  const candidates = MODEL_PROFILE_LIST.filter((profile) =>
    supportsTask(profile, analysis.task)
  );

  const accessibleCandidates = candidates.filter((profile) =>
    hasPlanAccess(userPlan, profile.minPlan)
  );

  const affordableCandidates = accessibleCandidates.filter(
    (profile) => credits >= profile.creditCost
  );

  if (affordableCandidates.length === 0) {
    if (accessibleCandidates.length === 0) {
      const requiredPlan = candidates
        .map((profile) => profile.minPlan)
        .sort((a, b) => PLAN_RANK[a] - PLAN_RANK[b])[0];

      return {
        error: "plan_required",
        message:
          "Ce type de demande demande un modele reserve a un plan superieur.",
        ok: false,
        requiredPlan,
        status: 403,
      };
    }

    const cheapest = accessibleCandidates.reduce((best, profile) =>
      profile.creditCost < best.creditCost ? profile : best
    );

    return {
      error: "insufficient_credits",
      message:
        "Vous n'avez pas assez de credits pour le modele le moins cher adapte a cette demande.",
      ok: false,
      requiredCredits: cheapest.creditCost,
      status: 402,
    };
  }

  const selected = affordableCandidates
    .map((profile) => ({
      profile,
      score: scoreModel(profile, analysis, credits, performanceHints),
    }))
    .sort((a, b) => b.score - a.score)[0].profile;

  return {
    analysis,
    creditCost: selected.creditCost,
    isAutoSelection: true,
    modelId: selected.id,
    ok: true,
    profile: selected,
    reason: buildSelectionReason(selected, analysis),
  };
}

function selectRequestedModel({
  allowUnlistedModels,
  analysis,
  credits,
  performanceHints,
  selectedModelId,
  userPlan,
}: {
  allowUnlistedModels: boolean;
  analysis: RequestAnalysis;
  credits: number;
  performanceHints: Record<string, number>;
  selectedModelId: string;
  userPlan: PlanId;
}): ModelSelection {
  const modelId =
    allowedModelIds.has(selectedModelId) || allowUnlistedModels
      ? selectedModelId
      : DEFAULT_CHAT_MODEL;
  const profile = getModelRoutingProfile(modelId);

  if (!hasPlanAccess(userPlan, profile.minPlan)) {
    return {
      error: "plan_required",
      message: "Ce modele est reserve a un plan superieur.",
      ok: false,
      requiredPlan: profile.minPlan,
      status: 403,
    };
  }

  if (credits < profile.creditCost) {
    return {
      error: "insufficient_credits",
      message:
        "Vous n'avez pas assez de credits pour utiliser ce modele. Veuillez recharger votre solde.",
      ok: false,
      requiredCredits: profile.creditCost,
      status: 402,
    };
  }

  return {
    analysis,
    creditCost: profile.creditCost,
    isAutoSelection: false,
    modelId,
    ok: true,
    profile,
    reason: buildSelectionReason(profile, analysis),
  };
}

function detectTask(prompt: string, hasImageInput: boolean): TaskKind {
  if (
    keywordScore(prompt, [
      "generate image",
      "create image",
      "make an image",
      "draw",
      "paint",
      "illustration",
      "logo",
      "image of",
      "photo of",
      "genere une image",
      "genere moi une image",
      "dessine",
      "cree une image",
      "creer une image",
    ]) > 0
  ) {
    return "image";
  }

  if (hasImageInput) {
    return "vision";
  }

  if (
    keywordScore(prompt, [
      "code",
      "typescript",
      "javascript",
      "python",
      "react",
      "next.js",
      "sql",
      "supabase",
      "api",
      "bug",
      "debug",
      "function",
      "component",
      "schema",
      "migration",
      "refactor",
      "script",
    ]) > 0
  ) {
    return "code";
  }

  if (
    keywordScore(prompt, [
      "analyse",
      "analyze",
      "raisonne",
      "strategy",
      "strategie",
      "rentable",
      "profit",
      "pricing",
      "compare",
      "decision",
      "architecture",
      "math",
      "logic",
    ]) > 0
  ) {
    return "reasoning";
  }

  return "general";
}

function getLengthComplexity(prompt: string) {
  if (prompt.length > 3000) {
    return 5;
  }
  if (prompt.length > 1200) {
    return 3;
  }
  if (prompt.length > 400) {
    return 1;
  }
  return 0;
}

function keywordScore(prompt: string, keywords: string[]) {
  return keywords.reduce(
    (score, keyword) => score + (prompt.includes(keyword) ? 1 : 0),
    0
  );
}

function toComplexityTier(score: number): ComplexityTier {
  if (score >= 8) {
    return "expert";
  }
  if (score >= 5) {
    return "complex";
  }
  if (score >= 2) {
    return "standard";
  }
  return "simple";
}

function supportsTask(profile: ModelProfile, task: TaskKind) {
  if (profile.tasks.includes(task)) {
    return true;
  }

  return task === "reasoning" && profile.tasks.includes("general");
}

function hasPlanAccess(userPlan: PlanId, requiredPlan: PlanId) {
  return PLAN_RANK[userPlan] >= PLAN_RANK[requiredPlan];
}

function scoreModel(
  profile: ModelProfile,
  analysis: RequestAnalysis,
  credits: number,
  performanceHints: Record<string, number>
) {
  const requiredComplexity = COMPLEXITY_RANK[analysis.complexity];
  const maxComplexity = COMPLEXITY_RANK[profile.maxComplexity];
  const complexityFit =
    maxComplexity >= requiredComplexity
      ? 4 - Math.abs(maxComplexity - requiredComplexity)
      : -8;

  const taskFit = profile.tasks.includes(analysis.task) ? 10 : 4;
  const costPressure = analysis.complexity === "simple" ? 1.5 : 0.8;
  const creditHeadroom = credits >= profile.creditCost * 5 ? 1 : 0;
  const qualityWeight =
    analysis.complexity === "complex" || analysis.complexity === "expert"
      ? 1.7
      : 1;
  const speedWeight = analysis.complexity === "simple" ? 1.5 : 0.8;

  return (
    taskFit +
    complexityFit +
    profile.quality * qualityWeight +
    profile.speed * speedWeight +
    creditHeadroom -
    profile.creditCost * costPressure +
    (performanceHints[profile.id] ?? 0)
  );
}

function buildSelectionReason(profile: ModelProfile, analysis: RequestAnalysis) {
  return `${analysis.task}/${analysis.complexity}: ${profile.strengths.join(", ")}`;
}
