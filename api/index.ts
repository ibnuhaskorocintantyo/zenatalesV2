import express from "express";
import serverless from "serverless-http";
import { registerRoutes } from "./helpers/routes";
import { setupVite, serveStatic, log } from "./helpers/vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Jalankan server di semua mode
  server.listen(
  {
    port: Number(process.env.PORT) || 5000,  // Default ke 5000 jika PORT tidak ada
    host: "0.0.0.0",
    reusePort: true,
  },
  () => {
    log(`🚀 Server berjalan di port ${process.env.PORT || 5000} [${app.get("env")}]`);
  }
);

})();

// Export untuk Vercel
export const handler = serverless(app);
