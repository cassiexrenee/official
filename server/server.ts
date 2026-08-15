import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { app } from "./app";
import { initDb } from "./db";

async function startServer() {
  const PORT = 3000;

  try {
    await initDb();
    console.log("Database initialized successfully.");
  } catch (err) {
    console.warn("Database initialization deferred/warning:", err);
  }

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Dragon Council server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
