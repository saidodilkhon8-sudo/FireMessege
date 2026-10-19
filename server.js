import express from "express";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3e3;
const distPath = path.resolve(__dirname, "dist");
app.get(["/healthz", "/api/health"], (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});
app.use(express.static(distPath, { maxAge: "1d" }));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});
app.listen(PORT, () => {
  console.log(`[FireMessage] Server running in production on port ${PORT}`);
});
