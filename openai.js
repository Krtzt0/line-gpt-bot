const fetch = require('cross-fetch');

// กำหนด API Keys หลายตัว
const OPENAI_API_KEYS = [
  process.env.OPENAI_API_KEY_1,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3,
  process.env.OPENAI_API_KEY_4
];

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';

async function fetchWithKeys(url, payload) {
  for (let key of OPENAI_API_KEYS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      // ตรวจสอบ error ว่าเป็นเรื่องโควต้าหมดหรือไม่
      if (res.ok) {
        return data;
      } else if (data.error && data.error.code === 'insufficient_quota') {
        console.warn(`Key quota exceeded, trying next key...`);
        continue; // ใช้ key ถัดไป
      } else {
        console.error('OpenAI API error', data);
        return data; // error อื่น ๆ
      }

    } catch (err) {
      console.error('Fetch error', err);
    }
  }
  throw new Error('All OpenAI API keys exhausted');
}

async function fetchChatResponse(systemPrompt, userMessage) {
  const payload = {
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
    temperature: 0.3,
    max_tokens: 900
  };

  try {
    const data = await fetchWithKeys('https://api.openai.com/v1/chat/completions', payload);
    if (!data || !data.choices || !data.choices[0]) {
      return 'ขอโทษนะ เกิดปัญหาในการประมวลผล ลองพิมพ์อีกครั้งได้ไหม';
    }
    return data.choices[0].message.content.trim();
  } catch (err) {
    console.error(err);
    return 'ขอโทษนะ เกิดปัญหาในการประมวลผล ลองพิมพ์อีกครั้งได้ไหม';
  }
}

async function getEmbedding(text) {
  const payload = {
    input: text,
    model: EMB_MODEL
  };

  try {
    const data = await fetchWithKeys('https://api.openai.com/v1/embeddings', payload);
    if (!data || !data.data || !data.data[0]) {
      return null;
    }
    return data.data[0].embedding;
  } catch (err) {
    console.error(err);
    return null;
  }
}

module.exports = { fetchChatResponse, getEmbedding };
