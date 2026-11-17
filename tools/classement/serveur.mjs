// Serveur local pour essayer les classements sans Cloudflare : sert le site construit (dist/ par défaut)
// et l'API de functions/api/ avec une base SQLite locale.
//   npm run build && node tools/classement/serveur.mjs [dossier] [port]   → http://localhost:8788
// (Avec Cloudflare installé, `npx wrangler pages dev dist --d1 DB=…` fait la même chose avec une vraie D1 locale.)
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { d1Local } from './d1-local.mjs';
import { onRequest } from '../../classement/api.js';

const racine = process.argv[2] || 'dist';
const port = Number(process.argv[3] || 8788);
const env = { DB: d1Local(process.env.BASE || ':memory:'), ADMIN_KEY: 'local' };
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.mp4': 'video/mp4', '.json': 'application/json', '.woff2': 'font/woff2' };

http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    if (url.pathname.startsWith('/api/')) {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const body = ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks);
        const r = await onRequest({ request: new Request(url, { method: req.method, headers: req.headers, body }), env });
        res.writeHead(r.status, Object.fromEntries(r.headers));
        res.end(Buffer.from(await r.arrayBuffer()));
        return;
    }
    let fichier = normalize(join(racine, decodeURIComponent(url.pathname)));
    try {
        if ((await stat(fichier)).isDirectory()) fichier = join(fichier, 'index.html');
    } catch {
        fichier = join(racine, 'index.html'); // application d'une seule page
    }
    try {
        const data = await readFile(fichier);
        res.writeHead(200, { 'Content-Type': TYPES[extname(fichier)] || 'application/octet-stream' });
        res.end(data);
    } catch {
        res.writeHead(404); res.end();
    }
}).listen(port, () => console.log(`Site + classements : http://localhost:${port}`));
