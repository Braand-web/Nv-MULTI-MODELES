CREATE TABLE IF NOT EXISTS "AIUsage" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
  "messageId" uuid,
  "selectedModelId" text NOT NULL,
  "modelId" text NOT NULL,
  "isAutoSelection" boolean NOT NULL DEFAULT false,
  "task" varchar NOT NULL,
  "complexity" varchar NOT NULL,
  "userPlan" varchar NOT NULL,
  "creditCost" integer NOT NULL,
  "promptChars" integer NOT NULL DEFAULT 0,
  "promptTokens" integer,
  "completionTokens" integer,
  "totalTokens" integer,
  "providerCostUsdMicros" integer,
  "hasImageInput" boolean NOT NULL DEFAULT false,
  "routeReason" text,
  "status" varchar NOT NULL DEFAULT 'completed',
  "error" text,
  "createdAt" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "AIUsage_user_created_idx"
  ON "AIUsage" ("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "AIUsage_model_created_idx"
  ON "AIUsage" ("modelId", "createdAt");
