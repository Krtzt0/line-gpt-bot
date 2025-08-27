-- เปิด extension pgvector (ถ้ายังไม่เปิด)
create extension if not exists vector;

-- ตารางเก็บ memory/embeddings
create table if not exists memories (
  id bigserial primary key,
  user_id text not null,
  content text not null,
  metadata jsonb,
  embedding vector(1536), -- ขนาด embedding ของ model example (~1536)
  created_at timestamptz default now()
);

-- index เพื่อค้นหาใกล้เคียง
create index if not exists idx_memories_embedding on memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);
