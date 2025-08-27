const fetch = require('cross-fetch');

// โหลด API Keys และตัดค่า undefined
const OPENAI_API_KEYS = [
  process.env.OPENAI_API_KEY_1,
  process.env.OPENAI_API_KEY_2,
  process.env.OPENAI_API_KEY_3,
  process.env.OPENAI_API_KEY_4,
  process.env.OPENAI_API_KEY_5
].filter(Boolean);

if (OPENAI_API_KEYS.length === 0) {
  console.error("No OpenAI API keys found! Please set environment variables.");
}

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';

let lastKeyIndex = -1;

async function fetchWithKeys(url, payload) {
  if (OPENAI_API_KEYS.length === 0) throw new Error("No valid OpenAI API keys available");

  for (let i = 0; i < OPENAI_API_KEYS.length; i++) {
    lastKeyIndex = (lastKeyIndex + 1) % OPENAI_API_KEYS.length;
    const key = OPENAI_API_KEYS[lastKeyIndex];
    console.log(`Trying OpenAI key index ${lastKeyIndex}...`);

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

      if (res.ok) {
        return data;
      } else if (data.error && data.error.code === 'insufficient_quota') {
        console.warn(`Key quota exceeded for key index ${lastKeyIndex}, trying next key...`);
        continue;
      } else {
        console.error('OpenAI API error', data);
        return data;
      }

    } catch (err) {
      console.error(`Fetch error with key index ${lastKeyIndex}`, err);
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
    console.error('fetchChatResponse error', err);
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
    if (!data || !data.data || !data.data[0]) return null;
    return data.data[0].embedding;
  } catch (err) {
    console.error('getEmbedding error', err);
    return null;
  }
}

module.exports = { fetchChatResponse, getEmbedding };
