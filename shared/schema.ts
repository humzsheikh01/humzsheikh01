import { pgTable, text, serial, timestamp, json, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User model with more strict validation
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isSubscribed: boolean("is_subscribed").default(false).notNull(),
  stripeCustomerId: text("stripe_customer_id").notNull().default(''),
  stripeSubscriptionId: text("stripe_subscription_id").notNull().default(''),
  subscriptionEndDate: timestamp("subscription_end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscription plans with stricter validation
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  features: json("features").$type<string[]>().notNull(),
  stripePriceId: text("stripe_price_id").notNull(),
});

// Code snippets with improved schema
export const snippets = pgTable("snippets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  code: text("code").notNull(),
  language: text("language").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat conversations with message type safety
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  messages: json("messages").$type<Array<{ role: 'user' | 'assistant'; content: string }>>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI models with type safety
export const aiModels = pgTable("ai_models", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // "code", "chat", "image-to-code"
  isDefault: boolean("is_default").default(false).notNull(),
  requiresSubscription: boolean("requires_subscription").default(false).notNull(),
});

// Define relations without explicit RelationBuilder type
export const usersRelations = relations(users, ({ many }) => ({
  snippets: many(snippets),
  conversations: many(conversations),
}));

export const snippetsRelations = relations(snippets, ({ one }) => ({
  user: one(users, {
    fields: [snippets.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

// Create insert schemas with validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
});

export const insertPlanSchema = createInsertSchema(plans, {
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  features: z.array(z.string()),
  stripePriceId: z.string().min(1),
});

export const insertSnippetSchema = createInsertSchema(snippets, {
  userId: z.number().positive(),
  title: z.string().min(1),
  code: z.string().min(1),
  language: z.string().min(1),
});

export const insertConversationSchema = createInsertSchema(conversations, {
  userId: z.number().positive(),
  title: z.string().min(1),
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1),
    })
  ),
});

export const insertAIModelSchema = createInsertSchema(aiModels, {
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['code', 'chat', 'image-to-code']),
  isDefault: z.boolean(),
  requiresSubscription: z.boolean(),
});

// Define types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

export type InsertSnippet = z.infer<typeof insertSnippetSchema>;
export type Snippet = typeof snippets.$inferSelect;

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertAIModel = z.infer<typeof insertAIModelSchema>;
export type AIModel = typeof aiModels.$inferSelect;
