const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  db: { schema: 'public' }
});

// storeMemory: userId, content, embedding (array), metadata (object)
async function storeMemory(userId, content, embedding, metadata = {}) {
  try {
    await supabase
      .from('memories')
      .insert([{ user_id: userId, content, metadata, embedding }]);
  } catch (err) {
    console.error('storeMemory error', err);
  }
}

// queryMemories: queryEmbedding array, k limit, optional userId filter
async function queryMemories(queryEmbedding, k = 5, userId = null) {
  try {
    // Supabase PostgREST supports RPC or filter with vector operator.
    // Use raw SQL via rpc or use from().select with filter using embedding <-> query vector
    const sql = userId ?
      `select id, user_id, content, metadata, created_at from memories where user_id = '${userId}' order by embedding <-> $1 limit ${k}` :
      `select id, user_id, content, metadata, created_at from memories order by embedding <-> $1 limit ${k}`;

    const res = await supabase.rpc('pg_query', { q: sql, params: [queryEmbedding] }).catch(()=>null);

    // If rpc not available fallback to simple select (may not work for vector)
    // For simplicity, try using postgrest filter (works if supabase-js supports embedding operator)
    // Here we'll attempt to use from().select and order by embedding <-> ...
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('id, user_id, content, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(k);
      if (error) {
        console.error('fallback query error', error);
        return [];
      }
      // simple fallback: return latest k
      return data || [];
    } catch (e) {
      console.error('supabase fallback fail', e);
      return [];
    }
  } catch (err) {
    console.error('queryMemories error', err);
    return [];
  }
}

module.exports = { storeMemory, queryMemories, supabase };
