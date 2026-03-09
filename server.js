const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');

const rooms = new Map();
const clients = new Map();
let clientCounter = 1;
let msgCounter = 1;

function randomRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i += 1) id += alphabet[Math.floor(Math.random() * alphabet.length)];
  return id;
}

function makeRoom() {
  let id = randomRoomId();
  while (rooms.has(id)) id = randomRoomId();
  const room = { id, clients: [], fighters: {}, createdAt: Date.now() };
  rooms.set(id, room);
  return room;
}

function nextClientId() {
  return `c${clientCounter++}`;
}

function pushMessage(clientId, payload) {
  const info = clients.get(clientId);
  if (!info) return;
  info.messages.push({ id: msgCounter++, ...payload });
  if (info.messages.length > 200) info.messages.splice(0, info.messages.length - 200);
}

function broadcastRoomState(room) {
  const payload = {
    type: 'room-state',
    roomId: room.id,
    players: room.clients.map((clientId, idx) => ({
      clientId,
      slot: idx === 0 ? 'host' : 'guest',
      fighter: room.fighters[clientId] || null
    }))
  };
  room.clients.forEach((cid) => pushMessage(cid, payload));
}

function leaveRoom(clientId) {
  const client = clients.get(clientId);
  if (!client || !client.roomId) return;
  const room = rooms.get(client.roomId);
  if (!room) return;
  room.clients = room.clients.filter((id) => id !== clientId);
  delete room.fighters[clientId];
  client.roomId = null;

  if (room.clients.length === 0) {
    rooms.delete(room.id);
  } else {
    pushMessage(room.clients[0], { type: 'peer-left' });
    broadcastRoomState(room);
  }
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, code, payload) {
  const data = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data),
    'Cache-Control': 'no-store'
  });
  res.end(data);
}

function serveStatic(urlPath, res) {
  let reqPath = decodeURIComponent(urlPath.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(publicDir, reqPath);

  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found'); return;
    }
    const ext = path.extname(filePath);
    const mime = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

async function handleApi(req, res, pathname, urlObj) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  if (pathname === '/api/session' && req.method === 'POST') {
    const clientId = nextClientId();
    clients.set(clientId, { roomId: null, messages: [] });
    sendJson(res, 200, { clientId });
    return;
  }

  if (pathname === '/api/create-room' && req.method === 'POST') {
    const body = await parseBody(req);
    const client = clients.get(body.clientId);
    if (!client) return sendJson(res, 400, { error: 'Invalid session.' });
    leaveRoom(body.clientId);

    const room = makeRoom();
    room.clients.push(body.clientId);
    room.fighters[body.clientId] = body.fighter;
    client.roomId = room.id;

    pushMessage(body.clientId, { type: 'room-created', roomId: room.id, role: 'host' });
    broadcastRoomState(room);
    return sendJson(res, 200, { ok: true, roomId: room.id });
  }

  if (pathname === '/api/join-room' && req.method === 'POST') {
    const body = await parseBody(req);
    const client = clients.get(body.clientId);
    if (!client) return sendJson(res, 400, { error: 'Invalid session.' });

    const room = rooms.get((body.roomId || '').toUpperCase());
    if (!room) return sendJson(res, 404, { error: 'Room not found.' });
    if (room.clients.length >= 2) return sendJson(res, 409, { error: 'Room is full.' });

    leaveRoom(body.clientId);
    room.clients.push(body.clientId);
    room.fighters[body.clientId] = body.fighter;
    client.roomId = room.id;

    pushMessage(body.clientId, { type: 'room-joined', roomId: room.id, role: 'guest' });
    broadcastRoomState(room);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/update-fighter' && req.method === 'POST') {
    const body = await parseBody(req);
    const client = clients.get(body.clientId);
    if (!client || !client.roomId) return sendJson(res, 400, { error: 'Not in room.' });

    const room = rooms.get(client.roomId);
    if (!room) return sendJson(res, 404, { error: 'Room not found.' });
    room.fighters[body.clientId] = body.fighter;
    broadcastRoomState(room);
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/send-signal' && req.method === 'POST') {
    const body = await parseBody(req);
    const client = clients.get(body.clientId);
    if (!client || !client.roomId) return sendJson(res, 400, { error: 'Not in room.' });

    const room = rooms.get(client.roomId);
    if (!room) return sendJson(res, 404, { error: 'Room not found.' });

    const peerId = room.clients.find((id) => id !== body.clientId);
    if (peerId) pushMessage(peerId, { type: 'signal', signal: body.signal, from: body.clientId });
    return sendJson(res, 200, { ok: true });
  }

  if (pathname === '/api/poll' && req.method === 'GET') {
    const clientId = urlObj.searchParams.get('clientId');
    const since = Number(urlObj.searchParams.get('since') || '0');
    const client = clients.get(clientId);
    if (!client) return sendJson(res, 400, { error: 'Invalid session.' });

    const updates = client.messages.filter((msg) => msg.id > since);
    return sendJson(res, 200, { updates });
  }

  if (pathname === '/api/leave' && req.method === 'POST') {
    const body = await parseBody(req);
    leaveRoom(body.clientId);
    clients.delete(body.clientId);
    return sendJson(res, 200, { ok: true });
  }

  sendJson(res, 404, { error: 'Unknown API route.' });
}

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  if (urlObj.pathname.startsWith('/api/')) {
    return handleApi(req, res, urlObj.pathname, urlObj);
  }
  serveStatic(urlObj.pathname, res);
});

setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    if (room.clients.length === 0 || now - room.createdAt > 1000 * 60 * 60 * 4) rooms.delete(room.id);
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`Best Fighting server started on http://localhost:${PORT}`);
});
