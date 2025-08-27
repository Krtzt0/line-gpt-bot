const fetch = require('cross-fetch');
const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

async function replyToLine(replyToken, text) {
  const url = 'https://api.line.me/v2/bot/message/reply';
  const body = {
    replyToken,
    messages: [
      { type: 'text', text }
    ]
  };
  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });
  } catch (err) {
    console.error('replyToLine error', err);
  }
}

module.exports = { replyToLine };
