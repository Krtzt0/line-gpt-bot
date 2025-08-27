require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { replyToLine } = require('./utils');
const { fetchChatResponse, getEmbedding } = require('./openai');
const { storeMemory, queryMemories } = require('./supabase');
const { webSearch } = require('./search');
const { getRandomMood } = require('./mood');

const PORT = process.env.PORT || 3000;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

const app = express();
app.use(bodyParser.json());

function verifyLineSignature(req) {
  const signature = req.headers['x-line-signature'];
  if (!signature) return false;
  const body = JSON.stringify(req.body);
  const hash = crypto.createHmac('sha256', LINE_CHANNEL_SECRET).update(body).digest('base64');
  return hash === signature;
}

app.post('/webhook', async (req, res) => {
  try {
    if (!verifyLineSignature(req)) return res.status(401).send('Invalid signature');

    const events = req.body.events || [];
    for (const ev of events) {
      if (ev.type !== 'message' || ev.message.type !== 'text') continue;

      const userId = ev.source.userId;
      const userMessage = ev.message.text.trim();
      const replyToken = ev.replyToken;

      // 1) Embedding + memory
      const queryEmbedding = await getEmbedding(userMessage);
      let memResults = [];
      if (queryEmbedding) {
        try {
          memResults = await queryMemories(queryEmbedding, 5, userId);
        } catch (err) {
          console.error('queryMemories error', err);
          memResults = [];
        }
      }

      // 2) Web search heuristic
      let searchSnippets = [];
      const needsSearch = /ข่าว|ล่าสุด|ราคา|สถิติ|อัพเดต|อัปเดต|วันนี้|เมื่อวาน|ล่าสุดของ/i.test(userMessage);
      if (needsSearch) {
        const searchRes = await webSearch(userMessage);
        searchSnippets = searchRes.slice(0, 5).map(s => `- ${s.title}\n${s.snippet}\n(${s.link})`);
      }

      // 3) System prompt น่ารัก ขี้เล่น
   // 3) System prompt น่ารัก ขี้เล่น
const randomMood = getRandomMood();

const persona = `
คุณคือตัวละครชื่อ "Mochi" บอทน่ารัก ขี้เล่น พูดไทยแบบกันเอง
ชอบใส่อีโมจิ 😆🥰 ตอบคำถามกระชับ เข้าใจง่าย
บางครั้งใส่มุกสั้น ๆ หรือคำพูดน่ารัก ๆ เพื่อให้ผู้ใช้ยิ้ม
`;

const memoryText = memResults.length
  ? memResults.map(m => `* ${m.content}`).join('\n')
  : '- ไม่มีความจำที่เกี่ยวข้อง';

const searchText = searchSnippets.length
  ? `ผลการค้นหา:\n${searchSnippets.join('\n\n')}`
  : '';

const systemPrompt = `
${persona}

ข้อมูลความจำที่เกี่ยวข้อง:
${memoryText}

${searchText}

คำตอบที่บอทให้:
- ตอบเป็นภาษาไทย
- ถ้าไม่แน่ใจ ลองถามคำถามสั้น ๆ เพื่อขอข้อมูลเพิ่มเติม
- ตอบแบบน่ารัก ขี้เล่น บางครั้งใส่อีโมจิหรือมุกสั้น ๆ
- กระชับ เข้าใจง่าย 😄
- บทสนทนาอาจมีมุกสุ่ม/อีโมจิ: ${randomMood}
`;

      // 4) เรียก OpenAI Chat
      const openaiResp = await fetchChatResponse(systemPrompt, userMessage);

      // 5) ตอบกลับ LINE
      await replyToLine(replyToken, openaiResp, LINE_CHANNEL_ACCESS_TOKEN);

      // 6) บันทึก memory
      if (queryEmbedding) {
        await storeMemory(userId, userMessage, queryEmbedding, { source: 'user-msg' });
      }
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error', err);
    res.status(500).send('Server error');
  }
});

app.get('/', (req, res) => res.send('LINE-GPT-BOT (Mochi) is running 😆'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
