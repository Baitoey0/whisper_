// Updated Node.js backend with cookie-based login and /api/me support
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
let encouragementsCol;
let savedEncouragementsCol;
let questionAnswersCol;

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
  encouragementsCol = db.collection('encouragements');
  savedEncouragementsCol = db.collection('savedEncouragements');
  questionAnswersCol = db.collection('questionAnswers');
  
  } else if (pathname === '/api/daily-question' && req.method === 'GET') {
    const userId = getUserIdFromCookie(req);
    if (!userId) return sendJson(res, 401, { error: 'Not logged in' });

    const today = new Date().toISOString().slice(0, 10);
    const existing = await questionAnswersCol.findOne({ userId, date: today });
    if (existing) return sendJson(res, 200, { question: null });

    const questions = [
      { type: "choice", text: "วันนี้คุณรู้สึกใกล้เคียงกับคำไหนมากที่สุด?", options: ["ทะเล", "ภูเขา", "ดวงดาว", "สายลม", "อื่น ๆ"] },
      { type: "text", text: "อะไรคือสิ่งเล็ก ๆ ที่ทำให้คุณรู้สึกดีในวันนี้?" },
      { type: "choice", text: "ถ้าอารมณ์ตอนนี้เป็นสภาพอากาศ จะเป็นแบบไหน?", options: ["แดดอ่อน ๆ", "ฝนตกเบา ๆ", "ลมแรง", "พายุ", "เมฆครึ้ม", "อื่น ๆ"] },
      { type: "text", text: "วันนี้คุณอยากวาดภาพอะไรเพื่อแทนความรู้สึกของตัวเอง?" },
      { type: "text", text: "อะไรคือสิ่งเล็ก ๆ ที่คุณรู้สึกขอบคุณในวันนี้?" },
      { type: "choice", text: "วันนี้คุณต้องการกอดอะไรสักอย่าง คุณจะเลือกอะไร?", options: ["ตุ๊กตา", "หนังสือ", "ใครสักคน", "ตัวเอง", "หมอนนุ่ม ๆ", "อื่น ๆ"] },
      { type: "text", text: "ถ้าเปิดประตูได้หนึ่งบานตอนนี้ คุณอยากไปที่ไหน?" }
    ];
    const question = questions[Math.floor(Math.random() * questions.length)];
    question._id = new ObjectId().toString();
    return sendJson(res, 200, { question });

  } else if (pathname === '/api/submit-question-answer' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      const { questionId, answer } = JSON.parse(body || '{}');
      const userId = getUserIdFromCookie(req);
      if (!userId || !questionId || !answer) return sendJson(res, 400, { error: 'Missing fields' });

      const today = new Date().toISOString().slice(0, 10);
      await questionAnswersCol.insertOne({ userId, questionId, answer, date: today });

      let msg = "ขอบคุณที่แบ่งปันความรู้สึกของคุณนะ";
      if (answer.includes("เหงา")) msg = "แม้วันนี้จะเงียบ แต่คุณไม่ได้อยู่คนเดียวเลยนะ";
      else if (answer.includes("ขอบคุณ")) msg = "คุณเก่งมากที่เห็นคุณค่าของตัวเอง";
      else if (answer.includes("เหนื่อย")) msg = "พักได้นะ ไม่ผิดเลยที่จะรู้สึกแบบนั้น";

      sendJson(res, 200, { message: msg });
    });

  } else if (pathname === '/api/my-question-answers' && req.method === 'GET') {
    const userId = getUserIdFromCookie(req);
    if (!userId) return sendJson(res, 401, { error: 'Not logged in' });

    const records = await questionAnswersCol.find({ userId }).sort({ date: -1 }).limit(30).toArray();
    const answers = records.map(r => ({
      questionId: r.questionId,
      questionText: r.questionText || "คำถามนี้ไม่มีชื่อ",
      answer: r.answer,
      date: r.date
    }));

    return sendJson(res, 200, { answers });

// Seed default encouragement messages if none exist.  These help
  // populate the encouragement pool for new users so that the
  // random message feature always has some entries to choose from.
  const count = await encouragementsCol.countDocuments();
  if (count === 0) {
    const baseMessages = [
      'คุณทำได้ดีมากแล้ว อย่ายอมแพ้',
      'ทุกความพยายามมีความหมาย',
      'คุณไม่จำเป็นต้องสมบูรณ์แบบ แค่เป็นตัวเองก็พอ',
      'วันนี้อาจยาก แต่พรุ่งนี้จะดีกว่า',
      'แม้จะเหนื่อย ก็พักได้ อย่าหยุดที่จะเดินต่อ',
      'รอยยิ้มของคุณสำคัญกับคนรอบตัว',
      'คุณมีค่ามากกว่าในสิ่งที่คุณคิด',
      'ขอบคุณที่เข้มแข็งมาตลอด',
      'คุณไม่โดดเดี่ยว ยังมีคนที่ห่วงใยคุณ',
      'เมื่อผ่านพ้นพายุ ฝนก็จะหยุดตกเสมอ',
      'ทุกปัญหามีทางออกเสมอ',
      'จงภูมิใจในความก้าวหน้าของตัวเอง',
      'ให้เวลากับตัวเองบ้าง คุณคู่ควรกับความสุข',
      'คุณคือแรงบันดาลใจให้คนอื่น',
      'อย่าลืมหายใจลึก ๆ แล้วค่อย ๆ ปล่อยความกังวลออกไป'
    ];
    await encouragementsCol.insertMany(baseMessages.map(t => ({ text: t, timestamp: new Date().toISOString() })));
    console.log('Seeded encouragement messages');
  }
  console.log('Connected to MongoDB');
}

function sendJSON(res, statusCode, obj, origin = '*', allowedOrigin) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': origin
  });
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
      '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
      '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
    };
    const mime = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(content);
  });
}

async function handleRequest(req, res) {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  const allowedOrigin = 'https://whisper-1uoc.onrender.com';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end();
    return;
  }



  if (pathname === '/register' && req.method === 'POST') {
    const { username, password } = await parseBody(req);
    if (!username || !password) return sendJSON(res, 400, { error: 'Username and password are required' }, allowedOrigin);
    if (await usersCol.findOne({ username })) return sendJSON(res, 400, { error: 'Username already exists' }, allowedOrigin);
    const hash = await bcrypt.hash(password, 10);
    const result = await usersCol.insertOne({ username, passwordHash: hash });
    return sendJSON(res, 200, { success: true, userId: result.insertedId.toString(), username }, allowedOrigin);
  }

  if (pathname === '/login' && req.method === 'POST') {
    const { username, password } = await parseBody(req);
    const user = await usersCol.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return sendJSON(res, 400, { error: 'Invalid credentials' }, allowedOrigin);
    }
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Set-Cookie': `userId=${user._id.toString()}; Path=/; HttpOnly; SameSite=Lax`,
      'Access-Control-Allow-Credentials': 'true'
    });
    res.end(JSON.stringify({ success: true, userId: user._id.toString(), username }));
    return;
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    const cookies = req.headers.cookie || '';
    const userId = cookies.split(';').find(c => c.trim().startsWith('userId='))?.split('=')[1];
    if (userId) {
      try {
        const user = await usersCol.findOne({ _id: new ObjectId(userId) });
        if (user) {
          return sendJSON(res, 200, { user: { username: user.username, userId: user._id.toString() } }, allowedOrigin);
        }
      } catch (err) {
        return sendJSON(res, 400, { error: 'Invalid userId' }, allowedOrigin);
      }
    }
    return sendJSON(res, 200, { user: null }, allowedOrigin);
  }

  if (pathname === '/submit-mood' && req.method === 'POST') {
    const { userId, mood, text } = await parseBody(req);
    if (!userId || !mood) return sendJSON(res, 400, { error: 'userId and mood are required' }, allowedOrigin);
    await moodsCol.insertOne({ userId: new ObjectId(userId), mood, text: text || '', timestamp: new Date().toISOString() });
    return sendJSON(res, 200, { success: true }, allowedOrigin);
  }

  if (pathname === '/submit-journal' && req.method === 'POST') {
    const { userId, mood, text } = await parseBody(req);
    if (!userId || !mood || !text) return sendJSON(res, 400, { error: 'userId, mood and text are required' }, allowedOrigin);
    await journalsCol.insertOne({ userId: new ObjectId(userId), mood, text: text.trim(), timestamp: new Date().toISOString() });
    return sendJSON(res, 200, { success: true }, allowedOrigin);
  }

  if (pathname === '/submit-event' && req.method === 'POST') {
    const { userId, title, date, note } = await parseBody(req);
    if (!userId || !title || !date) return sendJSON(res, 400, { error: 'userId, title and date are required' }, allowedOrigin);
    await eventsCol.insertOne({ userId: new ObjectId(userId), title, date, note: note || '' });
    return sendJSON(res, 200, { success: true }, allowedOrigin);
  }

  if (pathname === '/api/tasks' && req.method === 'POST') {
    const { userId, title, date, note, id } = await parseBody(req);
    if (!userId || !title || !date) return sendJSON(res, 400, { error: 'userId, title and date are required' });
    if (id) {
      await eventsCol.updateOne({ _id: new ObjectId(id), userId: new ObjectId(userId) }, { $set: { title, date, note: note || '' } });
    } else {
      await eventsCol.insertOne({ userId: new ObjectId(userId), title, date, note: note || '' });
    }
    return sendJSON(res, 200, { success: true }, allowedOrigin);
  }

  if (pathname.startsWith('/api/tasks/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    try {
      await eventsCol.deleteOne({ _id: new ObjectId(id) });
      return sendJSON(res, 200, { success: true }, allowedOrigin);
    } catch {
      return sendJSON(res, 400, { error: 'Invalid id' }, allowedOrigin);
    }
  }

  if (pathname === '/api/moods' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' }, allowedOrigin);
    const moods = await moodsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, moods.map(m => ({ id: m._id.toString(), mood: m.mood, text: m.text, timestamp: m.timestamp })), allowedOrigin);
  }

  if (pathname === '/api/notes' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' }, allowedOrigin);
    const notes = await journalsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, notes.map(n => ({ id: n._id.toString(), mood: n.mood, text: n.text, timestamp: n.timestamp })), allowedOrigin);
  }

  if (pathname === '/api/tasks' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' }, allowedOrigin);
    const events = await eventsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, events.map(e => ({ id: e._id.toString(), title: e.title, date: e.date, note: e.note })), allowedOrigin);
  }

  // Create a new encouragement message.  These messages are stored in a
  // global pool so that any user can receive them randomly.  The userId
  // is optional here but can be provided for reference.
  if (pathname === '/api/encouragements' && req.method === 'POST') {
    const { userId, text } = await parseBody(req);
    if (!text || text.trim() === '') {
      return sendJSON(res, 400, { error: 'text is required' }, allowedOrigin);
    }
    await encouragementsCol.insertOne({ text: text.trim(), userId: userId ? new ObjectId(userId) : null, timestamp: new Date().toISOString() });
    return sendJSON(res, 200, { success: true }, allowedOrigin);
  }

  // Retrieve a random encouragement message.  Chooses a random document
  // from the encouragements collection.  Returns null if none exist.
  if (pathname === '/api/encouragements/random' && req.method === 'GET') {
    const msgs = await encouragementsCol.aggregate([{ $sample: { size: 1 } }]).toArray();
    if (msgs.length === 0) {
      return sendJSON(res, 200, null, allowedOrigin);
    }
    const msg = msgs[0];
    return sendJSON(res, 200, { id: msg._id.toString(), text: msg.text }, allowedOrigin);
  }

  // Save an encouragement for a specific user.  Stores the message text
  // along with the userId and a liked flag (default false).
  if (pathname === '/api/saved-encouragements' && req.method === 'POST') {
    const { userId, text } = await parseBody(req);
    if (!userId || !text) return sendJSON(res, 400, { error: 'userId and text are required' }, allowedOrigin);
    const result = await savedEncouragementsCol.insertOne({ userId: new ObjectId(userId), text: text.trim(), liked: false, timestamp: new Date().toISOString() });
    return sendJSON(res, 200, { success: true, id: result.insertedId.toString() }, allowedOrigin);
  }

  // Get all saved encouragements for a user
  if (pathname === '/api/saved-encouragements' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' }, allowedOrigin);
    const items = await savedEncouragementsCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, items.map(e => ({ id: e._id.toString(), text: e.text, liked: !!e.liked, timestamp: e.timestamp })), allowedOrigin);
  }

  // Update liked flag of a saved encouragement (toggle like).  Expects
  // JSON body with id and liked boolean.
  if (pathname === '/api/saved-encouragements/like' && req.method === 'POST') {
    const { id, liked } = await parseBody(req);
    if (!id || typeof liked !== 'boolean') return sendJSON(res, 400, { error: 'id and liked are required' }, allowedOrigin);
    await savedEncouragementsCol.updateOne({ _id: new ObjectId(id) }, { $set: { liked } });
    return sendJSON(res, 200, { success: true }, allowedOrigin);
  }

  // Delete a saved encouragement by id
  if (pathname.startsWith('/api/saved-encouragements/') && req.method === 'DELETE') {
    const id = pathname.split('/').pop();
    try {
      await savedEncouragementsCol.deleteOne({ _id: new ObjectId(id) });
      return sendJSON(res, 200, { success: true }, allowedOrigin);
    } catch {
      return sendJSON(res, 400, { error: 'Invalid id' }, allowedOrigin);
    }
  }
  if (pathname === '/submit-daily-question' && req.method === 'POST') {
  const { userId, question, answer } = await parseBody(req);
  if (!userId || !question || !answer) {
    return sendJSON(res, 400, { error: 'userId, question, and answer are required' }, allowedOrigin);
  }

  await questionAnswersCol.insertOne({
    userId: new ObjectId(userId),
    question,
    answer,
    timestamp: new Date().toISOString()
  });

  return sendJSON(res, 200, { success: true }, allowedOrigin);
}
  if (pathname === '/api/question-answers' && req.method === 'GET') {
    const { userId } = parsed.query;
    if (!userId) return sendJSON(res, 400, { error: 'userId is required' }, allowedOrigin);
    const answers = await questionAnswersCol.find({ userId: new ObjectId(userId) }).toArray();
    return sendJSON(res, 200, answers.map(a => ({
      id: a._id.toString(),
      question: a.question,
      answer: a.answer,
      timestamp: a.timestamp
    })), allowedOrigin);
  }



  // Default: serve frontend
  serveStatic(req, res, pathname.replace(/^\//, ''));
}

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
