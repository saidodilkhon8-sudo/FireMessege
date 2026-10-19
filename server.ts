import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = path.resolve(__dirname, 'dist');

// Healthcheck endpoint for Render / Cloud Run / Kubernetes
app.get(['/healthz', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Serve static assets from production build
app.use(express.static(distPath, { maxAge: '1d' }));

// SPA fallback: any non-static request gets index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[FireMessage] Server running in production on port ${PORT}`);
});
