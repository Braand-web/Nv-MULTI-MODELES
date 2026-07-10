CREATE TABLE "Payment" (
  "amountXaf" integer NOT NULL,
  "completedAt" timestamp,
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "creditAmount" integer DEFAULT 0 NOT NULL,
  "externalId" varchar(120) NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" varchar NOT NULL,
  "periodEndsAt" timestamp,
  "plan" varchar,
  "productId" varchar(64) NOT NULL,
  "provider" varchar(32) DEFAULT 'fapshi' NOT NULL,
  "providerTransactionId" varchar(120) NOT NULL,
  "status" varchar DEFAULT 'pending' NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT "Payment_externalId_unique" UNIQUE("externalId"),
  CONSTRAINT "Payment_providerTransactionId_unique" UNIQUE("providerTransactionId")
);

CREATE TABLE "Subscription" (
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "paymentId" uuid NOT NULL,
  "periodEndsAt" timestamp NOT NULL,
  "periodStartsAt" timestamp NOT NULL,
  "plan" varchar NOT NULL,
  "status" varchar DEFAULT 'active' NOT NULL,
  "updatedAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT "Subscription_paymentId_unique" UNIQUE("paymentId")
);

ALTER TABLE "User" ADD COLUMN "planExpiresAt" timestamp;

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_User_id_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_paymentId_Payment_id_fk"
  FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_User_id_fk"
  FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;

CREATE INDEX "Payment_status_createdAt_idx" ON "Payment" USING btree ("status", "createdAt");
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment" USING btree ("userId", "createdAt");
CREATE INDEX "Subscription_userId_status_idx" ON "Subscription" USING btree ("userId", "status");

ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Subscription" ENABLE ROW LEVEL SECURITY;
