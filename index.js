require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const { replyToLine } = require('./utils');
const { fetchChatResponse, getEmbedding } = require('./openai');
const { storeMemory, queryMemories } = require('./supabase');
const { webSearch } = require('./search');

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
    if (!verifyLineSignature(req)) {
      return res.status(401).send('Invalid signature');
    }
    const events = req.body.events || [];
    for (const ev of events) {
      if (ev.type !== 'message' || ev.message.type !== 'text') {
        // คุณอาจจะรองรับ postback, imagemap, sticker เพิ่มได้
        continue;
      }
      const userId = ev.source.userId;
      const userMessage = ev.message.text.trim();
      const replyToken = ev.replyToken;

      // 1) ค้นหา memory ที่เกี่ยวข้อง (vector search)
      const queryEmbedding = await getEmbedding(userMessage);
      const memResults = await queryMemories(queryEmbedding, 5, userId);

      // 2) ถ้าคำถามมีลักษณะ "ค้นเว็บ" (heuristic) ให้เรียก SerpAPI
      let searchSnippets = [];
      const needsSearch = /ข่าว|ล่าสุด|ราคา|สถิติ|อัพเดต|อัปเดต|วันนี้|เมื่อวาน|ล่าสุดของ/i.test(userMessage);
      if (needsSearch) {
        const searchRes = await webSearch(userMessage);
        searchSnippets = searchRes.slice(0, 5).map(s => `- ${s.title}\n${s.snippet}\n(${s.link})`);
      }

      // 3) สร้าง system prompt + context
      const persona = `คุณคือตัวละครชื่อ "บอทของฉัน" พูดไทยเป็นกันเอง ขี้เล่นนิด ๆ แต่สุภาพ ตอบให้กระชับ ถ้ามีข้อมูลอ้างอิงจากเว็บ ให้สรุปแหล่งข้อมูลสั้น ๆ`;
      const memoryText = memResults.map(m => `* ${m.content}`).join('\n') || '- ไม่มีความจำที่เกี่ยวข้อง';

      const searchText = searchSnippets.length ? `ผลการค้นหา:\n${searchSnippets.join('\n\n')}` : '';

      const systemPrompt = `
${persona}

ข้อมูลความจำที่เกี่ยวข้อง:
${memoryText}

${searchText}

เมื่อคุณตอบ: ให้ระบุเป็นภาษาไทย ถ้าไม่แน่ใจ ให้ถามคำถามสั้น ๆ เพื่อขอข้อมูลเพิ่มเติม
`;

      // 4) เรียก OpenAI Chat
      const finalPromptUser = userMessage;
      const openaiResp = await fetchChatResponse(systemPrompt, finalPromptUser);

      // 5) ตอบกลับไปที่ LINE
      await replyToLine(replyToken, openaiResp);

      // 6) บันทึก memory แบบง่าย (เก็บคำถาม/คำตอบ ถ้ามีค่า)
      // นโยบาย: เก็บแค่ snippet สั้น ๆ หากมี 'ฉันชอบ/ชื่อเล่น/วันเกิด' หรือเก็บทุกคำถาม (ปรับได้)
      await storeMemory(userId, userMessage, queryEmbedding, { source:'user-msg' });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error', err);
    res.status(500).send('Server error');
  }
});

app.get('/', (req,res) => res.send('LINE-GPT-BOT is running'));

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
