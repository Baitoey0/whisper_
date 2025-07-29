const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

let db;
let usersCol;
let moodsCol;
let journalsCol;
let eventsCol;

async function initDatabase() {
  if (!mongoUri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }
  const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
  await client.connect();
  db = client.db();
  usersCol = db.collection('users');
  moodsCol = db.collection('moods');
  journalsCol = db.collection('journals');
  eventsCol = db.collection('events');
  console.log('Connected to MongoDB');
}

function sendJSON(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        resolve({});
      }
    });
  });
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(__dirname, '../frontend', pathname || '');
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon'
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  });
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  if (pathname === '/register' && req.method === 'POST') {
    const { username, password } = await parseBody(req);
    if (!username || !password) return sendJSON(res, 400, { error: 'Username and password are required' });
    if (await usersCol.findOne({ username })) return sendJSON(res, 400, { error: 'Username already exists' });
    const hash = await bcrypt.hash(password, 10);
    const result = await usersCol.insertOne({ username, passwordHash: hash });
    return sendJSON(res, 200, { success: true, userId: result.insertedId.toString(), username });
  }

  if (pathname === '/login' && req.method === 'POST') {
    const { username, password } = await parseBody(req);
    const user = await usersCol.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return sendJSON(res, 400, { error: 'Invalid credentials' });
    return sendJSON(res, 200, { success: true, userId: user._id.toString(), username });
  }

  if (pathname === '/submit-mood' && req.method === 'POST') {
    const { userId, mood, text } = await parseBody(req);
    if (!userId || !mood) return sendJSON(res, 400, { error: 'userId and mood are required' });
    await moodsCol.insertOne({ userId: new ObjectId(userId), mood, text: text || '', timestamp: new Date().toISOString() });
    return sendJSON(res, 200, { success: true });
  }

  if (pathname === '/submit-journal' && req.method === 'POST') {
    const { userId, mood, text } = await parseBody(req);
    if (!userId || !mood || !text) return sendJSON(res, 400, { error: 'userId, mood and text are required' });
    await journalsCol.insertOne({ userId: new ObjectId(userId), mood, text: text.trim(), timestamp: new Date().toISOString() });
    return sendJSON(res, 200, { success: true });
  }

  if (pathname === '/submit-event' && req.method === 'POST') {
    const { userId, title, date, note } = await parseBody(req);
    if (!userId || !title || !date) return sendJSON(res, 400, { error: 'userId, title and date are required' });
    await eventsCol.insertOne({ userId: new ObjectId(userId), title, date, note: note || '' });
    return sendJSON(res, 200, { success: true });
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    const { userId, title, date, note, id } = await parseBody(req);
    if (!userId || !title || !date) return sendJSON(res, 400, { error: 'userId, title and date are required' });
    if (id) {
      await eventsCol.updateOne({ _id: new ObjectId(id), userId: new ObjectId(userId) }, { $set: { title, date, note: note || '' } });
    } else {
      await eventsCol.insertOne({ userId: new ObjectId(userId), title, date, note: note || '' });
    }
    return sendJSON(res, 200, { success: true });
  }

  if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    try {
      await eventsCol.deleteOne({ _id: new ObjectId(id) });
      return sendJSON(res, 200, { success: true });
    } catch {
      return sendJSON(res, 400, { error: 'Invalid id' });
    }
  }

  if (pathname === '/api/moods' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' });
    const moods = await moodsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, moods.map(m => ({ id: m._id.toString(), mood: m.mood, text: m.text, timestamp: m.timestamp })));
  }

  if (pathname === '/api/notes' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' });
    const notes = await journalsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, notes.map(n => ({ id: n._id.toString(), mood: n.mood, text: n.text, timestamp: n.timestamp })));
  }

  if (pathname === '/api/tasks' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' });
    const events = await eventsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, events.map(e => ({ id: e._id.toString(), title: e.title, date: e.date, note: e.note })));
  }

  // Default: serve frontend
  serveStatic(req, res, pathname.replace(/^\//, ''));
}

// Start server
initDatabase().then(() => {
  const port = process.env.PORT || 3000;
  http.createServer((req, res) => {
    handleRequest(req, res).catch(err => {
      console.error(err);
      res.writeHead(500);
      res.end('Internal Server Error');
    });
  }).listen(port, () => {
    console.log(`Whisper server listening on port ${port}`);
  });
}).catch(err => {
  console.error('Failed to initialize database', err);
  process.exit(1);
});
