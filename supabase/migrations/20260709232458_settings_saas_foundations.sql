CREATE TABLE "UserSetting" (
  "agentActionsEnabled" boolean DEFAULT true NOT NULL,
  "allowAnalytics" boolean DEFAULT true NOT NULL,
  "allowModelImprovement" boolean DEFAULT false NOT NULL,
  "appearance" varchar DEFAULT 'system' NOT NULL,
  "avatarUrl" text DEFAULT '' NOT NULL,
  "bio" varchar(280) DEFAULT '' NOT NULL,
  "displayName" varchar(80) DEFAULT '' NOT NULL,
  "instructions" text DEFAULT '' NOT NULL,
  "nickname" varchar(80) DEFAULT '' NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid PRIMARY KEY NOT NULL REFERENCES "User"("id"),
  "webResearchEnabled" boolean DEFAULT true NOT NULL
);

CREATE TABLE "Team" (
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(80) NOT NULL,
  "ownerId" uuid NOT NULL REFERENCES "User"("id")
);

CREATE TABLE "TeamMember" (
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "role" varchar DEFAULT 'member' NOT NULL,
  "teamId" uuid NOT NULL REFERENCES "Team"("id"),
  "userId" uuid NOT NULL REFERENCES "User"("id"),
  CONSTRAINT "TeamMember_teamId_userId_pk" PRIMARY KEY("teamId", "userId")
);

CREATE TABLE "ApiKey" (
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "keyHash" varchar(64) NOT NULL UNIQUE,
  "keyPrefix" varchar(16) NOT NULL,
  "lastUsedAt" timestamp,
  "name" varchar(80) NOT NULL,
  "revokedAt" timestamp,
  "userId" uuid NOT NULL REFERENCES "User"("id")
);

CREATE INDEX "ApiKey_userId_idx" ON "ApiKey" USING btree ("userId");
CREATE INDEX "TeamMember_userId_idx" ON "TeamMember" USING btree ("userId");

ALTER TABLE "UserSetting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TeamMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ApiKey" ENABLE ROW LEVEL SECURITY;
