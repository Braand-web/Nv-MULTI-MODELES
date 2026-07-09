import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  json,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

export const user = pgTable("User", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  email: varchar("email", { length: 64 }).notNull(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  image: text("image"),
  isAnonymous: boolean("isAnonymous").notNull().default(false),
  name: text("name"),
  password: varchar("password", { length: 64 }),
  plan: varchar("plan", { enum: ["free", "pro", "elite"] })
    .notNull()
    .default("free"),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  credits: integer("credits").notNull().default(50),
});

export type User = InferSelectModel<typeof user>;

export const userSetting = pgTable("UserSetting", {
  agentActionsEnabled: boolean("agentActionsEnabled").notNull().default(true),
  allowAnalytics: boolean("allowAnalytics").notNull().default(true),
  allowModelImprovement: boolean("allowModelImprovement")
    .notNull()
    .default(false),
  appearance: varchar("appearance", {
    enum: ["light", "dark", "system"],
  })
    .notNull()
    .default("system"),
  avatarUrl: text("avatarUrl").notNull().default(""),
  bio: varchar("bio", { length: 280 }).notNull().default(""),
  displayName: varchar("displayName", { length: 80 }).notNull().default(""),
  instructions: text("instructions").notNull().default(""),
  nickname: varchar("nickname", { length: 80 }).notNull().default(""),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  userId: uuid("userId")
    .primaryKey()
    .notNull()
    .references(() => user.id),
  webResearchEnabled: boolean("webResearchEnabled").notNull().default(true),
});

export type UserSetting = InferSelectModel<typeof userSetting>;
export type NewUserSetting = InferInsertModel<typeof userSetting>;

export const team = pgTable("Team", {
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull(),
  ownerId: uuid("ownerId")
    .notNull()
    .references(() => user.id),
});

export type Team = InferSelectModel<typeof team>;

export const teamMember = pgTable(
  "TeamMember",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    role: varchar("role", { enum: ["owner", "admin", "member"] })
      .notNull()
      .default("member"),
    teamId: uuid("teamId")
      .notNull()
      .references(() => team.id),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teamId, table.userId] }),
    userIdIdx: index("TeamMember_userId_idx").on(table.userId),
  })
);

export type TeamMember = InferSelectModel<typeof teamMember>;

export const apiKey = pgTable(
  "ApiKey",
  {
    createdAt: timestamp("createdAt").notNull().defaultNow(),
    id: uuid("id").primaryKey().notNull().defaultRandom(),
    keyHash: varchar("keyHash", { length: 64 }).notNull().unique(),
    keyPrefix: varchar("keyPrefix", { length: 16 }).notNull(),
    lastUsedAt: timestamp("lastUsedAt"),
    name: varchar("name", { length: 80 }).notNull(),
    revokedAt: timestamp("revokedAt"),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    userIdIdx: index("ApiKey_userId_idx").on(table.userId),
  })
);

export type ApiKey = InferSelectModel<typeof apiKey>;

export const chat = pgTable("Chat", {
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  title: text("title").notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  visibility: varchar("visibility", { enum: ["public", "private"] })
    .notNull()
    .default("private"),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = pgTable("Message_v2", {
  attachments: json("attachments").notNull(),
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  createdAt: timestamp("createdAt").notNull(),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  parts: json("parts").notNull(),
  role: varchar("role").notNull(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const vote = pgTable(
  "Vote_v2",
  {
    chatId: uuid("chatId")
      .notNull()
      .references(() => chat.id),
    isUpvoted: boolean("isUpvoted").notNull(),
    messageId: uuid("messageId")
      .notNull()
      .references(() => message.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.chatId, table.messageId] }),
  })
);

export type Vote = InferSelectModel<typeof vote>;

export const aiUsage = pgTable("AIUsage", {
  chatId: uuid("chatId")
    .notNull()
    .references(() => chat.id),
  complexity: varchar("complexity", {
    enum: ["simple", "standard", "complex", "expert"],
  }).notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  creditCost: integer("creditCost").notNull(),
  error: text("error"),
  hasImageInput: boolean("hasImageInput").notNull().default(false),
  id: uuid("id").primaryKey().notNull().defaultRandom(),
  isAutoSelection: boolean("isAutoSelection").notNull().default(false),
  messageId: uuid("messageId"),
  modelId: text("modelId").notNull(),
  promptChars: integer("promptChars").notNull().default(0),
  promptTokens: integer("promptTokens"),
  completionTokens: integer("completionTokens"),
  totalTokens: integer("totalTokens"),
  providerCostUsdMicros: integer("providerCostUsdMicros"),
  routeReason: text("routeReason"),
  selectedModelId: text("selectedModelId").notNull(),
  status: varchar("status", {
    enum: ["completed", "errored", "aborted"],
  })
    .notNull()
    .default("completed"),
  task: varchar("task", {
    enum: ["general", "code", "image", "reasoning", "vision"],
  }).notNull(),
  userId: uuid("userId")
    .notNull()
    .references(() => user.id),
  userPlan: varchar("userPlan", { enum: ["free", "pro", "elite"] }).notNull(),
});

export type AIUsage = InferSelectModel<typeof aiUsage>;
export type NewAIUsage = InferInsertModel<typeof aiUsage>;

export const document = pgTable(
  "Document",
  {
    content: text("content"),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    kind: varchar("text", { enum: ["text", "code", "image", "sheet"] })
      .notNull()
      .default("text"),
    title: text("title").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id, table.createdAt] }),
  })
);

export type Document = InferSelectModel<typeof document>;

export const suggestion = pgTable(
  "Suggestion",
  {
    createdAt: timestamp("createdAt").notNull(),
    description: text("description"),
    documentCreatedAt: timestamp("documentCreatedAt").notNull(),
    documentId: uuid("documentId").notNull(),
    id: uuid("id").notNull().defaultRandom(),
    isResolved: boolean("isResolved").notNull().default(false),
    originalText: text("originalText").notNull(),
    suggestedText: text("suggestedText").notNull(),
    userId: uuid("userId")
      .notNull()
      .references(() => user.id),
  },
  (table) => ({
    documentRef: foreignKey({
      columns: [table.documentId, table.documentCreatedAt],
      foreignColumns: [document.id, document.createdAt],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Suggestion = InferSelectModel<typeof suggestion>;

export const stream = pgTable(
  "Stream",
  {
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
    id: uuid("id").notNull().defaultRandom(),
  },
  (table) => ({
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
    pk: primaryKey({ columns: [table.id] }),
  })
);

export type Stream = InferSelectModel<typeof stream>;
