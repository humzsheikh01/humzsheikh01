import { 
  InsertSnippet, 
  Snippet, 
  InsertConversation, 
  Conversation,
  InsertUser,
  User,
  AIModel,
  InsertAIModel,
  Plan,
  InsertPlan,
  users,
  snippets,
  conversations,
  aiModels,
  plans
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

// PostgreSQL Session Store with proper configuration
const PostgresSessionStore = connectPg(session);
const sessionStore = new PostgresSessionStore({
  pool,
  tableName: 'session', // Default table name
  createTableIfMissing: true,
  pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 minutes
  errorLog: (err: Error) => console.error('Session store error:', err),
  conObject: {
    connectionTimeoutMillis: 5000, // 5 seconds timeout
    query_timeout: 10000 // 10 seconds query timeout
  }
});

// Handle session store errors
sessionStore.on('error', (error: Error) => {
  console.error('Session store error:', error);
  // Don't crash the server on session store errors
});

// Handle connection errors
pool.on('error', (err: Error) => {
  console.error('Session database connection error:', err);
  // Connection errors are already handled in db.ts
});

export interface IStorage {
  // User methods
  createUser(user: InsertUser): Promise<User>;
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  updateStripeInfo(userId: number, customerId: string, subscriptionId: string): Promise<void>;
  updateUserSubscription(userId: number, isSubscribed: boolean, endDate?: Date): Promise<void>;

  // Snippet methods
  createSnippet(snippet: InsertSnippet): Promise<Snippet>;
  getSnippet(id: number): Promise<Snippet | undefined>;
  getAllSnippets(): Promise<Snippet[]>;

  // Conversation methods
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversation(id: number): Promise<Conversation | undefined>;
  getAllConversations(): Promise<Conversation[]>;

  // AI Models methods
  createAIModel(model: InsertAIModel): Promise<AIModel>;
  getAIModel(id: number): Promise<AIModel | undefined>;
  getAIModelsByType(type: string): Promise<AIModel[]>;
  getAllAIModels(): Promise<AIModel[]>;

  // Subscription Plan methods
  createPlan(plan: InsertPlan): Promise<Plan>;
  getPlan(id: number): Promise<Plan | undefined>;
  getAllPlans(): Promise<Plan[]>;

  // Session store
  sessionStore: typeof sessionStore;
}

export class DatabaseStorage implements IStorage {
  sessionStore = sessionStore;

  // User methods with improved error handling
  async createUser(user: InsertUser): Promise<User> {
    try {
      const [newUser] = await db.insert(users).values(user).returning();
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.username, username));
      return user;
    } catch (error) {
      console.error('Error fetching user by username:', error);
      throw new Error('Failed to fetch user by username');
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user by email');
    }
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.stripeSubscriptionId, subscriptionId));
      return user;
    } catch (error) {
      console.error('Error fetching user by subscription ID:', error);
      throw new Error('Failed to fetch user by subscription ID');
    }
  }

  async updateStripeInfo(
    userId: number,
    customerId: string,
    subscriptionId: string
  ): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating stripe info:', error);
      throw new Error('Failed to update stripe information');
    }
  }

  async updateUserSubscription(
    userId: number,
    isSubscribed: boolean,
    endDate?: Date
  ): Promise<void> {
    try {
      const updateData: Partial<User> = {
        isSubscribed,
        ...(endDate && { subscriptionEndDate: endDate }),
      };
      await db.update(users).set(updateData).where(eq(users.id, userId));
    } catch (error) {
      console.error('Error updating user subscription:', error);
      throw new Error('Failed to update user subscription');
    }
  }

  // Snippets methods with improved error handling
  async createSnippet(snippet: InsertSnippet): Promise<Snippet> {
    try {
      const [newSnippet] = await db.insert(snippets).values(snippet).returning();
      return newSnippet;
    } catch (error) {
      console.error('Error creating snippet:', error);
      throw new Error('Failed to create snippet');
    }
  }

  async getSnippet(id: number): Promise<Snippet | undefined> {
    try {
      const [snippet] = await db.select().from(snippets).where(eq(snippets.id, id));
      return snippet;
    } catch (error) {
      console.error('Error fetching snippet:', error);
      throw new Error('Failed to fetch snippet');
    }
  }

  async getAllSnippets(): Promise<Snippet[]> {
    try {
      return await db.select().from(snippets).orderBy(desc(snippets.createdAt));
    } catch (error) {
      console.error('Error fetching all snippets:', error);
      throw new Error('Failed to fetch snippets');
    }
  }

  // Conversations methods with improved error handling
  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    try {
      const [newConversation] = await db
        .insert(conversations)
        .values(conversation)
        .returning();
      return newConversation;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  async getConversation(id: number): Promise<Conversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id));
      return conversation;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw new Error('Failed to fetch conversation');
    }
  }

  async getAllConversations(): Promise<Conversation[]> {
    try {
      return await db
        .select()
        .from(conversations)
        .orderBy(desc(conversations.createdAt));
    } catch (error) {
      console.error('Error fetching all conversations:', error);
      throw new Error('Failed to fetch conversations');
    }
  }

  // AI Models methods with improved error handling
  async createAIModel(model: InsertAIModel): Promise<AIModel> {
    try {
      const [newModel] = await db.insert(aiModels).values(model).returning();
      return newModel;
    } catch (error) {
      console.error('Error creating AI model:', error);
      throw new Error('Failed to create AI model');
    }
  }

  async getAIModel(id: number): Promise<AIModel | undefined> {
    try {
      const [model] = await db.select().from(aiModels).where(eq(aiModels.id, id));
      return model;
    } catch (error) {
      console.error('Error fetching AI model:', error);
      throw new Error('Failed to fetch AI model');
    }
  }

  async getAIModelsByType(type: string): Promise<AIModel[]> {
    try {
      return await db.select().from(aiModels).where(eq(aiModels.type, type));
    } catch (error) {
      console.error('Error fetching AI models by type:', error);
      throw new Error('Failed to fetch AI models by type');
    }
  }

  async getAllAIModels(): Promise<AIModel[]> {
    try {
      return await db.select().from(aiModels);
    } catch (error) {
      console.error('Error fetching all AI models:', error);
      throw new Error('Failed to fetch AI models');
    }
  }

  // Subscription plans methods with improved error handling
  async createPlan(plan: InsertPlan): Promise<Plan> {
    try {
      const [newPlan] = await db.insert(plans).values(plan).returning();
      return newPlan;
    } catch (error) {
      console.error('Error creating plan:', error);
      throw new Error('Failed to create subscription plan');
    }
  }

  async getPlan(id: number): Promise<Plan | undefined> {
    try {
      const [plan] = await db.select().from(plans).where(eq(plans.id, id));
      return plan;
    } catch (error) {
      console.error('Error fetching plan:', error);
      throw new Error('Failed to fetch subscription plan');
    }
  }

  async getAllPlans(): Promise<Plan[]> {
    try {
      return await db.select().from(plans);
    } catch (error) {
      console.error('Error fetching all plans:', error);
      throw new Error('Failed to fetch subscription plans');
    }
  }
}

export const storage = new DatabaseStorage();
