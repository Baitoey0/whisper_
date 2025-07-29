const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcrypt');

/*
 * Simple Node.js web server for Whisper without Express.  This server
 * handles user registration and login using MongoDB for persistence,
 * hashes passwords with bcrypt, and provides endpoints for submitting
 * moods, journal entries, and calendar events.  It also serves static
 * files from the ../frontend directory so that the same server can host
 * both the API and the client application.  All MongoDB credentials
 * should be provided via the MONGODB_URI environment variable.
 */

// Read MongoDB connection string from environment.  On Render, set
// Environment Variable MONGODB_URI to your cluster URI, for example:
// mongodb+srv://<user>:<password>@cluster0.mongodb.net/whisper?retryWrites=true&w=majority
const mongoUri = process.env.MONGODB_URI;

// Database and collection handles
let db;
let usersCol;
let moodsCol;
let journalsCol;
let eventsCol;

// Connect to MongoDB on startup
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

// Utility to send JSON responses
function sendJSON(res, statusCode, obj) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

// Utility to parse request body as JSON
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (e) {
        resolve({});
      }
    });
  });
}

// Serve static files from the frontend directory
function serveStatic(req, res, pathname) {
  let filePath = path.join(__dirname, '../frontend', pathname);
  // If the path is a directory, default to index.html
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

// Main request handler
async function handleRequest(req, res) {
  const { pathname } = url.parse(req.url);
  // Registration
  if (pathname === '/register' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, password } = body;
    if (!username || !password) {
      return sendJSON(res, 400, { error: 'Username and password are required' });
    }
    const existing = await usersCol.findOne({ username });
    if (existing) {
      return sendJSON(res, 400, { error: 'Username already exists' });
    }
    const hash = await bcrypt.hash(password, 10);
    const result = await usersCol.insertOne({ username, passwordHash: hash });
    return sendJSON(res, 200, { success: true, userId: result.insertedId.toString(), username });
  }
  // Login
  if (pathname === '/login' && req.method === 'POST') {
    const body = await parseBody(req);
    const { username, password } = body;
    if (!username || !password) {
      return sendJSON(res, 400, { error: 'Username and password are required' });
    }
    const user = await usersCol.findOne({ username });
    if (!user) {
      return sendJSON(res, 400, { error: 'Invalid credentials' });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return sendJSON(res, 400, { error: 'Invalid credentials' });
    }
    return sendJSON(res, 200, { success: true, userId: user._id.toString(), username });
  }
  // Submit mood entry
  if (pathname === '/submit-mood' && req.method === 'POST') {
    const body = await parseBody(req);
    const { userId, mood, text } = body;
    if (!userId || !mood) {
      return sendJSON(res, 400, { error: 'userId and mood are required' });
    }
    await moodsCol.insertOne({
      userId: new ObjectId(userId),
      mood,
      text: text || '',
      timestamp: new Date().toISOString()
    });
    return sendJSON(res, 200, { success: true });
  }
  // Submit journal entry (a note with mood and text)
  if (pathname === '/submit-journal' && req.method === 'POST') {
    const body = await parseBody(req);
    const { userId, mood, text } = body;
    if (!userId || !mood || !text) {
      return sendJSON(res, 400, { error: 'userId, mood and text are required' });
    }
    await journalsCol.insertOne({
      userId: new ObjectId(userId),
      mood,
      text: text.trim(),
      timestamp: new Date().toISOString()
    });
    return sendJSON(res, 200, { success: true });
  }
  // Submit calendar event
  if (pathname === '/submit-event' && req.method === 'POST') {
    const body = await parseBody(req);
    const { userId, title, date, note } = body;
    if (!userId || !title || !date) {
      return sendJSON(res, 400, { error: 'userId, title and date are required' });
    }
    await eventsCol.insertOne({
      userId: new ObjectId(userId),
      title,
      date,
      note: note || ''
    });
    return sendJSON(res, 200, { success: true });
  }
  // Create or update a calendar task via /api/tasks (POST).  If an id is
  // provided in the request body, the existing task will be updated.
  // Otherwise, a new task is created.  All tasks are scoped to a
  // specific userId.  This route is used by the calendar page to
  // persist events.
  if (pathname === '/api/tasks' && req.method === 'POST') {
    const body = await parseBody(req);
    const { userId, title, date, note, id } = body;
    if (!userId || !title || !date) {
      return sendJSON(res, 400, { error: 'userId, title and date are required' });
    }
    if (id) {
      // Update existing task only if it belongs to the user
      await eventsCol.updateOne({ _id: new ObjectId(id), userId: new ObjectId(userId) }, { $set: { title, date, note: note || '' } });
    } else {
      await eventsCol.insertOne({ userId: new ObjectId(userId), title, date, note: note || '' });
    }
    return sendJSON(res, 200, { success: true });
  }
  // Delete a task by id via /api/tasks/:id.  Does not require
  // userId in the query; the id itself identifies the document.  This
  // endpoint is used by the calendar page when removing tasks.
  if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    const parts = pathname.split('/');
    const id = parts[parts.length - 1];
    try {
      await eventsCol.deleteOne({ _id: new ObjectId(id) });
      return sendJSON(res, 200, { success: true });
    } catch (e) {
      return sendJSON(res, 400, { error: 'Invalid id' });
    }
  }
  // Get moods for a user
  if (pathname === '/api/moods' && req.method === 'GET') {
    const query = url.parse(req.url, true).query;
    const userId = query.userId;
    if (!userId) {
      return sendJSON(res, 400, { error: 'userId is required' });
    }
    const moods = await moodsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, moods.map(m => ({
      id: m._id.toString(),
      mood: m.mood,
      text: m.text,
      timestamp: m.timestamp
    })));
  }
  // Get journal notes for a user
  if (pathname === '/api/notes' && req.method === 'GET') {
    const query = url.parse(req.url, true).query;
    const userId = query.userId;
    if (!userId) {
      return sendJSON(res, 400, { error: 'userId is required' });
    }
    const notes = await journalsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, notes.map(n => ({
      id: n._id.toString(),
      mood: n.mood,
      text: n.text,
      timestamp: n.timestamp
    })));
  }
  // Get events for a user
  if (pathname === '/api/tasks' && req.method === 'GET') {
    const query = url.parse(req.url, true).query;
    const userId = query.userId;
    if (!userId) {
      return sendJSON(res, 400, { error: 'userId is required' });
    }
    const events = await eventsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, events.map(e => ({
      id: e._id.toString(),
      title: e.title,
      date: e.date,
      note: e.note
    })));
  }
  // Fallback to serving static files.  Strip leading slash.
  serveStatic(req, res, pathname.replace(/^\//, ''));
}

// Start server after database is ready
initDatabase().then(() => {
  const port = process.env.PORT || 3000;
  http.createServer((req, res) => {
    // Wrap handler in async context and catch errors
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