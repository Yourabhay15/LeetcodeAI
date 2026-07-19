import http from 'http';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Logger from '../utils/Logger.js';
import LeetcoderSolver from './LeetcoderSolver.js';
import LeetcoderAuthenticator from './LeetcoderAuthenticator.js';
import FileManager from '../managers/FileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LeetcoderDashboard {
  static sseClients = [];
  static server = null;

  static start(port = 3000) {
    if (this.server) {
      Logger.warn(`Dashboard server already running on port ${port}`);
      return;
    }

    // Subscribe to Logger events to stream logs to GUI in real-time
    Logger.subscribe((logItem) => {
      this.broadcastLog(logItem);
    });

    this.server = http.createServer(async (req, res) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const method = req.method.toUpperCase();

      // Serve static HTML page
      if (url.pathname === '/' || url.pathname === '/index.html') {
        try {
          const htmlPath = path.join(__dirname, 'dashboard.html');
          const html = await fs.readFile(htmlPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Failed to load dashboard HTML page.');
        }
        return;
      }

      // Server-Sent Events for real-time logs
      if (url.pathname === '/api/stream-logs') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });
        
        // Send existing logs buffer first
        const pastLogs = Logger.getLogs();
        for (const logItem of pastLogs) {
          res.write(`data: ${JSON.stringify(logItem)}\n\n`);
        }

        this.sseClients.push(res);
        
        req.on('close', () => {
          this.sseClients = this.sseClients.filter(client => client !== res);
        });
        return;
      }

      // REST API: GET status
      if (url.pathname === '/api/status' && method === 'GET') {
        let totalCount = 0;
        let solvedCount = 0;
        try {
          const solvedSet = await FileManager.getSolvedProblemSet();
          solvedCount = solvedSet.size;
          const problemsList = await FileManager.getAllProblemsNames();
          totalCount = problemsList.length;
        } catch (_) {}

        const statusObj = {
          status: LeetcoderSolver.status,
          isRunning: LeetcoderSolver.isRunning,
          currentProblem: LeetcoderSolver.currentProblem,
          solvedCount,
          totalCount
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(statusObj));
        return;
      }

      // REST API: GET config settings
      if (url.pathname === '/api/config' && method === 'GET') {
        const configObj = {
          GROQ_API_KEY: process.env.GROQ_API_KEY || "",
          GROQ_MODEL: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          PROBLEM_PICK_MODE: process.env.PROBLEM_PICK_MODE || "random",
          SINGLE_PROBLEM_NAME: process.env.SINGLE_PROBLEM_NAME || ""
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(configObj));
        return;
      }

      // REST API: POST config settings
      if (url.pathname === '/api/config' && method === 'POST') {
        try {
          const body = await this.getPostBody(req);
          const data = JSON.parse(body);

          // Update process.env runtime variables
          if (data.GROQ_API_KEY !== undefined) process.env.GROQ_API_KEY = data.GROQ_API_KEY;
          if (data.GROQ_MODEL !== undefined) process.env.GROQ_MODEL = data.GROQ_MODEL;
          if (data.PROBLEM_PICK_MODE !== undefined) process.env.PROBLEM_PICK_MODE = data.PROBLEM_PICK_MODE;
          if (data.SINGLE_PROBLEM_NAME !== undefined) process.env.SINGLE_PROBLEM_NAME = data.SINGLE_PROBLEM_NAME;

          // Re-write back to .env file to persist configurations
          const envPath = path.resolve(process.cwd(), '.env');
          let envContent = '';
          try {
            envContent = await fs.readFile(envPath, 'utf-8');
          } catch (_) {}

          const lines = envContent.split(/\r?\n/);
          const newLines = [];
          const keysToUpdate = ['GROQ_API_KEY', 'GROQ_MODEL', 'PROBLEM_PICK_MODE', 'SINGLE_PROBLEM_NAME'];

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('#') || !trimmed) {
              newLines.push(line);
              continue;
            }
            const parts = trimmed.split('=');
            const key = parts[0].trim();
            if (keysToUpdate.includes(key)) {
              continue; // We will append updated values at the end of the file
            }
            newLines.push(line);
          }

          // Append updated values at the end of .env
          newLines.push(`GROQ_API_KEY=${data.GROQ_API_KEY || ''}`);
          newLines.push(`GROQ_MODEL=${data.GROQ_MODEL || 'llama-3.3-70b-versatile'}`);
          newLines.push(`PROBLEM_PICK_MODE=${data.PROBLEM_PICK_MODE || 'random'}`);
          newLines.push(`SINGLE_PROBLEM_NAME=${data.SINGLE_PROBLEM_NAME || ''}`);

          await fs.writeFile(envPath, newLines.join('\n'));
          dotenv.config(); // Reload env

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
        return;
      }

      // REST API: Start Solver Action
      if (url.pathname === '/api/action/start' && method === 'POST') {
        if (LeetcoderSolver.isRunning) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'Solver is already running.' }));
          return;
        }

        // Trigger Solver in background to avoid blocking HTTP response
        (async () => {
          try {
            LeetcoderSolver.status = "authenticating";
            await LeetcoderAuthenticator.loginUser();
            await LeetcoderSolver.solve();
          } catch (err) {
            Logger.error("Error running solver via dashboard:", err);
          } finally {
            LeetcoderSolver.stop();
          }
        })();

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // REST API: Stop Solver Action
      if (url.pathname === '/api/action/stop' && method === 'POST') {
        LeetcoderSolver.stop();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // Default 404 Route
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    this.server.listen(port, () => {
      Logger.success(`===================================================`);
      Logger.success(`📊 Leetcoder Dashboard GUI is live at:`);
      Logger.success(`   👉 http://localhost:${port}`);
      Logger.success(`===================================================`);
    });
  }

  static getPostBody(req) {
    return new Promise((resolve, reject) => {
      let body = "";
      req.on("data", chunk => {
        body += chunk.toString();
      });
      req.on("end", () => {
        resolve(body);
      });
      req.on("error", err => reject(err));
    });
  }

  static broadcastLog(logItem) {
    const dataString = `data: ${JSON.stringify(logItem)}\n\n`;
    for (const client of this.sseClients) {
      try {
        client.write(dataString);
      } catch (_) {}
    }
  }
}

export default LeetcoderDashboard;
