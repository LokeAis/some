import express from "express";
import { registerApiRoutes } from "./routes.js";

const app = express();

// All /api/* routes (shared with the Cloud Run / local entrypoint in server.ts)
registerApiRoutes(app);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Unhandled Error] ${req.method} ${req.url}:`, err);
  res.status(500).json({ error: "Ein uventa feil oppstod på serveren." });
});

export default app;
