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
}

function getUserIdFromCookie(req) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/userId=([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

initDatabase().then(() => {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    if (req.method === 'GET' && pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('Whisper backend is running.');
      return;
    }

    if (pathname === '/api/daily-question' && req.method === 'GET') {
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

    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log('Server is running on port', PORT);
  });
});
