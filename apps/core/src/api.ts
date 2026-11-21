import { createServer } from 'node:http';
import { db } from './db.js';

const port = Number(process.env.PORT ?? 3000);
createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'GET' && req.url === '/health/ready') {
    try {
      await db.query('SELECT 1');
      res.writeHead(200).end(JSON.stringify({ status: 'ok', database: 'ok' }));
    } catch {
      res.writeHead(503).end(JSON.stringify({ status: 'unavailable', database: 'unavailable' }));
    }
    return;
  }
  res.writeHead(404).end(JSON.stringify({ error: 'not_found' }));
}).listen(port, '0.0.0.0', () => console.log(`Core API listening on ${port}`));
