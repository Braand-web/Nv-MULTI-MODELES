ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "credits" integer NOT NULL DEFAULT 50;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "plan" varchar NOT NULL DEFAULT 'free';

UPDATE "User"
SET "plan" = 'free'
WHERE "plan" IS NULL;
