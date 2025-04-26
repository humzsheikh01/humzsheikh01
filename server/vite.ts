import express, { type Express, Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { type Server } from "node:http";
import { fileURLToPath } from "node:url";

interface ViteLoggerOptions {
  clear?: boolean;
}

// Custom logger for development
const viteLogger = {
  hasWarned: false,
  hasErrorLogged: false,
  info: (msg: string) => console.log(`[vite] ${msg}`),
  warn: (msg: string, options?: ViteLoggerOptions) => {
    if (options?.clear) {
      viteLogger.hasWarned = false;
    }
    if (!viteLogger.hasWarned) {
      console.warn(`[vite] ${msg}`);
      viteLogger.hasWarned = true;
    }
  },
  error: (msg: string, options?: ViteLoggerOptions) => {
    if (options?.clear) {
      viteLogger.hasErrorLogged = false;
    }
    if (!viteLogger.hasErrorLogged) {
      console.error(`[vite] ${msg}`);
      viteLogger.hasErrorLogged = true;
    }
  },
  clearScreen: () => {
    process.stdout.write('\x1Bc');
  }
};

// Load Vite config
const viteConfig = {
  root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "client"),
  logLevel: "info",
  server: {
    middlewareMode: true as const,
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  appType: "spa" as const,
};

// Configure and start Vite development server
export async function setupVite(app: Express, server: Server): Promise<ViteDevServer> {
  try {
    const serverOptions = {
      middlewareMode: true as const,
      hmr: { server },
      allowedHosts: true,
    };

    // Dynamic import of Vite to avoid direct dependency
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      ...viteConfig,
      configFile: false,
      customLogger: {
        ...viteLogger,
        error: (msg: string, options?: ViteLoggerOptions) => {
          viteLogger.error(msg, options);
          // Don't exit on compilation errors in development
          if (msg.includes('Could not resolve') || 
              msg.includes('Failed to compile') || 
              msg.includes('syntax error') || 
              msg.includes('module not found')) {
            return;
          }
          // For critical errors, log but don't terminate the process
          console.error(`Critical Vite error: ${msg}`);
        },
      },
      server: serverOptions,
      appType: "custom" as const,
    });

    app.use(vite.middlewares);

    // Handle all routes for SPA
    app.use("*", async (req: Request, res: Response, next: NextFunction) => {
      const url = req.originalUrl;

      try {
        // Get the template
        const templatePath = path.resolve(
          path.dirname(fileURLToPath(import.meta.url)),
          "..",
          "client",
          "index.html",
        );

        // Check if template exists
        if (!fs.existsSync(templatePath)) {
          throw new Error(`Template file not found at ${templatePath}`);
        }

        try {
          // Read and transform template
          let template = await fs.promises.readFile(templatePath, "utf-8");
          template = await vite.transformIndexHtml(url, template);

          res.status(200).set({ "Content-Type": "text/html" }).end(template);
        } catch (readError) {
          vite.ssrFixStacktrace(readError as Error);
          console.error('Vite template processing error:', readError);
          next(readError);
        }
      } catch (error) {
        console.error('Vite template path error:', error);
        res.status(500).send('Error loading application template');
      }
    });

    return vite;
  } catch (error) {
    console.error('Vite setup error:', error);
    throw error;
  }
}

// Serve static files in production
export function serveStatic(app: Express) {
  const clientDist = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "client",
    "dist",
  );

  if (!fs.existsSync(clientDist)) {
    throw new Error(
      "Client build not found. Run 'npm run build' before starting production server.",
    );
  }

  app.use(express.static(clientDist));
  
  // Serve index.html for all routes (SPA)
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    try {
      const indexPath = path.join(clientDist, "index.html");
      if (!fs.existsSync(indexPath)) {
        throw new Error(`Index file not found at ${indexPath}`);
      }
      res.sendFile(indexPath, (err) => {
        if (err) {
          console.error('Error serving static file:', err);
          next(err); // Pass to error handler
        }
      });
    } catch (error) {
      console.error('Error serving static file:', error);
      res.status(500).send('Error serving application');
    }
  });
}

// Logger utility for consistent logging
export function log(message: string) {
  console.log(`[server] ${message}`);
}
