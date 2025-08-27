const fetch = require('cross-fetch');
const SERPAPI_KEY = process.env.SERPAPI_KEY;

async function webSearch(q) {
  if (!SERPAPI_KEY) return [];
  const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(q)}&api_key=${SERPAPI_KEY}&num=5`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const results = (data.organic_results || []).map(r => ({
      title: r.title || '',
      snippet: r.snippet || r.rich_snippet?.top?.entries?.map(e=>e?.title).join(' ') || '',
      link: r.link || r.url || ''
    }));
    return results;
  } catch (err) {
    console.error('webSearch error', err);
    return [];
  }
}

module.exports = { webSearch };
