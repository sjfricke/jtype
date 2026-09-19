const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const FRONT = path.join(ROOT, 'front');
const DECK_DIR = path.join(ROOT, 'decks');
const AUDIO_DIR = path.join(DECK_DIR, 'audio');

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.mp3': 'audio/mpeg',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.webmanifest': 'application/manifest+json',
};

// Decks are small enough to hold in memory and never change while running.
const decks = new Map();
for (const file of fs.readdirSync(DECK_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('FIX_')) continue;
    const deck = JSON.parse(fs.readFileSync(path.join(DECK_DIR, file), 'utf8'));
    if (deck.version !== 1) throw new Error(`${file}: unsupported version ${deck.version}`);
    if (decks.has(deck.name)) throw new Error(`duplicate deck name ${deck.name}`);
    deck.hasAudio = fs.existsSync(path.join(AUDIO_DIR, deck.name));
    decks.set(deck.name, deck);
}

const deckIndex = JSON.stringify([...decks.values()]
    .map((d) => ({ name: d.name, cardCount: d.cards.length, hasAudio: d.hasAudio }))
    .sort((a, b) => a.name.localeCompare(b.name)));

function send(res, status, body, type) {
    res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
    res.end(body);
}

// Resolve a URL path under base, refusing anything that escapes it.
function safeJoin(base, urlPath) {
    const resolved = path.resolve(base, '.' + decodeURIComponent(urlPath));
    return resolved.startsWith(base + path.sep) ? resolved : null;
}

function sendFile(res, file) {
    fs.stat(file, (err, stat) => {
        if (err || !stat.isFile()) return send(res, 404, 'not found', 'text/plain');
        res.writeHead(200, {
            'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
            'Content-Length': stat.size,
        });
        fs.createReadStream(file).pipe(res);
    });
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const route = url.pathname;

    if (route === '/api/decks') {
        return send(res, 200, deckIndex, MIME['.json']);
    }

    if (route.startsWith('/api/decks/')) {
        const deck = decks.get(decodeURIComponent(route.slice('/api/decks/'.length)));
        if (!deck) return send(res, 404, '{"error":"no such deck"}', MIME['.json']);
        return send(res, 200, JSON.stringify(deck), MIME['.json']);
    }

    // Audio lives outside front/ so decks stay self-contained on disk.
    if (route.startsWith('/audio/')) {
        const file = safeJoin(AUDIO_DIR, route.slice('/audio'.length));
        if (!file) return send(res, 400, 'bad path', 'text/plain');
        return sendFile(res, file);
    }

    const file = safeJoin(FRONT, route === '/' ? '/index.html' : route);
    if (!file) return send(res, 400, 'bad path', 'text/plain');
    sendFile(res, file);
});

const port = Number(process.env.PORT) || 8000;
server.listen(port, () => {
    console.log(`jtype: ${decks.size} decks on http://localhost:${port}`);
});
