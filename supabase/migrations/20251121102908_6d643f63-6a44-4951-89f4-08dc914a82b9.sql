-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create geo_playbook table with vector embeddings
CREATE TABLE public.geo_playbook (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  section TEXT NOT NULL,
  chunk TEXT NOT NULL,
  embedding vector(1536)
);

-- Create index for vector similarity search
CREATE INDEX geo_playbook_embedding_idx ON public.geo_playbook 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Enable RLS
ALTER TABLE public.geo_playbook ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view playbook"
ON public.geo_playbook
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert playbook"
ON public.geo_playbook
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update playbook"
ON public.geo_playbook
FOR UPDATE
USING (true);