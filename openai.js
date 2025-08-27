const fetch = require('cross-fetch');
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || 'gpt-4o';
const EMB_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large';

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
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data || !data.choices || !data.choices[0]) {
    console.error('OpenAI chat error', data);
    return 'ขอโทษนะ เกิดปัญหาในการประมวลผล ลองพิมพ์อีกครั้งได้ไหม';
  }
  return data.choices[0].message.content.trim();
}

async function getEmbedding(text) {
  const payload = {
    input: text,
    model: EMB_MODEL
  };
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!data || !data.data || !data.data[0]) {
    console.error('Embedding error', data);
    return null;
  }
  return data.data[0].embedding; // array of floats
}

module.exports = { fetchChatResponse, getEmbedding };
