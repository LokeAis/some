import express from "express";
import path from "path";
import dotenv from "dotenv";
import { registerApiRoutes } from "./api/routes.js";

dotenv.config();

export async function createApp() {
  const app = express();

  // All /api/* routes (shared with the Vercel entrypoint in api/index.ts)
  registerApiRoutes(app);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test" && !process.env.VITEST) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (process.env.NODE_ENV === "production") {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath, {
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        }
      }
    }));
    app.get("*", (req, res, next) => {
      if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|tsx|ts)$/)) {
        return res.status(404).send('Not found');
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);
    res.status(500).json({ error: "Ein uventa feil oppstod på serveren." });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  createApp().then((app) => {
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }).catch(err => {
    console.error("Failed to start server:", err);
    process.exit(1);
  });
}
