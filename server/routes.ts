import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateCodeWithAI } from "../client/src/lib/ai-models";
import { insertSnippetSchema, insertAIModelSchema, insertPlanSchema } from "@shared/schema";
import { z } from "zod";
import { setupAuth } from "./auth";
import aiRouter from './aiRoutes';

console.log("Subscription features disabled for development.");

// Set up multer for file uploads
const storage_upload = multer.memoryStorage();
const upload = multer({
  storage: storage_upload,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Middleware to check authentication
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // API Routes
  app.use('/api', aiRouter); // Use the new AI router

  app.post("/api/image-to-code", upload.single("image"), async (req, res) => {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const language = req.body.language || "html";

      // In a real application, we would:
      // 1. Process the image using computer vision
      // 2. Call an AI model to generate code from the image
      // 3. Return the generated code

      // For now, return sample code based on language
      let generatedCode = "";
      switch (language) {
        case "html":
          generatedCode = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page from Image</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 0;
      border-bottom: 1px solid #eee;
    }
    .container {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 40px;
    }
    .card {
      border: 1px solid #eee;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
  </style>
</head>
<body>
  <header>
    <div class="logo">
      <h1>Website Title</h1>
    </div>
    <nav>
      <ul style="display: flex; list-style: none; gap: 20px;">
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Services</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </nav>
  </header>

  <div class="hero" style="margin-top: 40px; text-align: center;">
    <h2>Welcome to our website</h2>
    <p>This layout was generated from your image</p>
  </div>

  <div class="container">
    <div class="card">
      <h3>Feature 1</h3>
      <p>Description of feature 1 goes here.</p>
    </div>
    <div class="card">
      <h3>Feature 2</h3>
      <p>Description of feature 2 goes here.</p>
    </div>
    <div class="card">
      <h3>Feature 3</h3>
      <p>Description of feature 3 goes here.</p>
    </div>
  </div>
</body>
</html>`;
          break;

        case "jsx":
          generatedCode = `import React from 'react';

function GeneratedComponent() {
  return (
    <div className="container">
      <header className="header">
        <div className="logo">
          <h1>Website Title</h1>
        </div>
        <nav>
          <ul className="nav-links">
            <li><a href="#">Home</a></li>
            <li><a href="#">About</a></li>
            <li><a href="#">Services</a></li>
            <li><a href="#">Contact</a></li>
          </ul>
        </nav>
      </header>

      <div className="hero">
        <h2>Welcome to our website</h2>
        <p>This React component was generated from your image</p>
      </div>

      <div className="feature-grid">
        <div className="feature-card">
          <h3>Feature 1</h3>
          <p>Description of feature 1 goes here.</p>
        </div>
        <div className="feature-card">
          <h3>Feature 2</h3>
          <p>Description of feature 2 goes here.</p>
        </div>
        <div className="feature-card">
          <h3>Feature 3</h3>
          <p>Description of feature 3 goes here.</p>
        </div>
      </div>
    </div>
  );
}

export default GeneratedComponent;`;
          break;

        case "css":
          generatedCode = `/* Generated CSS from the uploaded image */
body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  margin: 0;
  padding: 0;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid #eee;
}

.logo h1 {
  margin: 0;
  color: #333;
}

.nav-links {
  display: flex;
  list-style: none;
  gap: 20px;
}

.nav-links a {
  text-decoration: none;
  color: #555;
  transition: color 0.3s ease;
}

.nav-links a:hover {
  color: #007bff;
}

.hero {
  text-align: center;
  margin: 40px 0;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.feature-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

@media (max-width: 768px) {
  header {
    flex-direction: column;
    text-align: center;
  }
  
  .nav-links {
    margin-top: 15px;
  }
  
  .feature-grid {
    grid-template-columns: 1fr;
  }
}`;
          break;

        default:
          generatedCode = `// Generated code for ${language}\n// This is a placeholder for the actual image-to-code generation.`;
      }

      res.json({
        code: generatedCode,
        language: language
      });
    } catch (error) {
      console.error("Error generating code from image:", error);
      res.status(500).json({ message: "Error processing image" });
    }
  });

  // User routes
  app.get("/api/user", requireAuth, (req, res) => {
    // User is already added to request by Passport
    res.json({ user: req.user });
  });

  // AI Model routes
  app.get("/api/ai-models", async (req, res) => {
    try {
      const models = await storage.getAllAIModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ error: "Failed to fetch AI models" });
    }
  });

  // Initialize predefined AI models
  app.post("/api/init-models", async (req, res) => {
    try {
      // Check if models already exist
      const existingModels = await storage.getAllAIModels();
      
      if (existingModels.length === 0) {
        // Define default models
        await storage.createAIModel(insertAIModelSchema.parse({
          name: "GPT-4o",
          provider: "openai",
          modelId: "gpt-4o",
          description: "OpenAI's GPT-4o model - most capable model for code generation",
          maxTokens: 4000,
          temperature: 0.7,
          tags: ["general", "code", "premium"],
        }));
        
        await storage.createAIModel(insertAIModelSchema.parse({
          name: "Claude 3 Opus",
          provider: "anthropic",
          modelId: "claude-3-opus-20240229",
          description: "Anthropic's Claude 3 Opus - advanced reasoning and code generation",
          maxTokens: 4000,
          temperature: 0.7,
          tags: ["general", "code", "premium"],
        }));
        
        await storage.createAIModel(insertAIModelSchema.parse({
          name: "Claude 3 Sonnet",
          provider: "anthropic",
          modelId: "claude-3-sonnet-20240229",
          description: "Anthropic's Claude 3 Sonnet - balanced performance and cost",
          maxTokens: 4000,
          temperature: 0.7,
          tags: ["general", "code"],
        }));
        
        await storage.createAIModel(insertAIModelSchema.parse({
          name: "Mistral Large",
          provider: "mistral",
          modelId: "mistral-large-latest",
          description: "Mistral's flagship model for code and general tasks",
          maxTokens: 4000,
          temperature: 0.7,
          tags: ["general", "code"],
        }));
        
        await storage.createAIModel(insertAIModelSchema.parse({
          name: "Mistral Small",
          provider: "mistral",
          modelId: "mistral-small-latest",
          description: "Mistral's efficient model for code and general tasks",
          maxTokens: 4000,
          temperature: 0.7,
          tags: ["general", "code", "free"],
        }));
        
        res.json({ message: "AI models initialized successfully" });
      } else {
        res.json({ message: "AI models already exist" });
      }
    } catch (error) {
      console.error("Error initializing AI models:", error);
      res.status(500).json({ error: "Failed to initialize AI models" });
    }
  });

  // Add sample mock plans
  app.post("/api/init-plans", async (req, res) => {
    try {
      // Check if plans already exist
      const existingPlans = await storage.getAllPlans();
      
      if (existingPlans.length === 0) {
        // Create plans without Stripe
        await storage.createPlan(insertPlanSchema.parse({
          name: "Basic",
          description: "Basic plan for occasional users",
          price: 0, // Free plan
          features: ["Access to basic models", "Limited to 50 requests per day", "Standard support"],
          stripePriceId: "free_plan",
        }));
        
        await storage.createPlan(insertPlanSchema.parse({
          name: "Pro",
          description: "Pro plan for professional developers",
          price: 29.99,
          features: ["Access to all models", "Unlimited requests", "Priority support", "Custom instructions"],
          stripePriceId: "pro_plan",
        }));
        
        res.json({ message: "Plans initialized successfully" });
      } else {
        res.json({ message: "Plans already exist" });
      }
    } catch (error) {
      console.error("Error initializing plans:", error);
      res.status(500).json({ error: "Failed to initialize plans" });
    }
  });

  // Modify subscription endpoint to work without Stripe
  app.post("/api/subscribe", requireAuth, async (req, res) => {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: "User not found" });
      }
      
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ error: "Plan ID is required" });
      }
      
      const plan = await storage.getPlan(Number(planId));
      
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }
      
      // Mock subscription process
      await storage.updateUserSubscription(user.id, true);
      
      res.json({ 
        message: "Subscription updated successfully",
        user: {
          ...user,
          isSubscribed: true
        }
      });
    } catch (error) {
      console.error("Error updating subscription:", error);
      res.status(500).json({ error: "Failed to update subscription" });
    }
  });

  // Create http server
  const server = createServer(app);
  
  return server;
}