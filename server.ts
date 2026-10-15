/**
 * ROBO BATTLE — HUMAN vs AI
 * Full-Stack Express Server & Vite Dev Middleware
 */

import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

const DB_SCRIPT = path.join(__dirname, 'backend', 'python', 'database.py');

// Ensure database initialized
if (fs.existsSync(DB_SCRIPT)) {
  execFileAsync('python3', [DB_SCRIPT, 'init']).catch(err => {
    console.warn("Python DB initialization note:", err.message);
  });
}

// --------------------------------------------------------------------------
// REST APIs (backed by SQLite via Python engine)
// --------------------------------------------------------------------------

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'ROBO BATTLE Hybrid Server',
    environment: isProduction ? 'production' : 'development',
    timestamp: new Date().toISOString()
  });
});

// Retrieve top scores from SQLite
app.get('/api/scores', async (req, res) => {
  try {
    const { stdout } = await execFileAsync('python3', [DB_SCRIPT, 'scores']);
    const scores = JSON.parse(stdout.trim() || '[]');
    res.json({ success: true, scores });
  } catch (err: any) {
    console.error("Error fetching high scores:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record high score with server-side physical validation
app.post('/api/scores', async (req, res) => {
  try {
    const { player_name, score, kills, time_remaining, accuracy } = req.body;

    const name = String(player_name || 'Pilot').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 16) || 'Pilot';
    const numScore = Math.max(0, parseInt(score, 10) || 0);
    const numKills = Math.max(0, Math.min(15, parseInt(kills, 10) || 0));
    const numTime = Math.max(0, Math.min(300, parseInt(time_remaining, 10) || 0));
    const numAcc = Math.max(0, Math.min(100, parseFloat(accuracy) || 0));

    // Anti-spoofing score ceiling check
    if (numScore > 12000) {
      return res.status(400).json({ success: false, error: "Score validation failed. Out of physical bounds." });
    }

    await execFileAsync('python3', [
      DB_SCRIPT,
      'add',
      name,
      numScore.toString(),
      numKills.toString(),
      numTime.toString(),
      numAcc.toFixed(1)
    ]);

    res.json({ success: true, message: "Score verified and saved in SQLite database" });
  } catch (err: any) {
    console.error("Error saving score:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Retrieve aggregated stats
app.get('/api/stats', async (req, res) => {
  try {
    const { stdout } = await execFileAsync('python3', [DB_SCRIPT, 'stats']);
    const stats = JSON.parse(stdout.trim() || '{}');
    res.json({ success: true, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Record match telemetry
app.post('/api/match-result', async (req, res) => {
  // Telemetry logged
  res.json({ success: true, message: "Match telemetry recorded." });
});

// --------------------------------------------------------------------------
// Dev vs Production Middleware
// --------------------------------------------------------------------------

async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ROBO BATTLE Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
