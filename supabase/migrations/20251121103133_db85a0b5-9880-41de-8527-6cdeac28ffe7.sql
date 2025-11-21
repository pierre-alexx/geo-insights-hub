-- Fix search_path for match_playbook_chunks function
CREATE OR REPLACE FUNCTION match_playbook_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  section text,
  chunk text,
  similarity float
)
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id,
    section,
    chunk,
    1 - (embedding <=> query_embedding) AS similarity
  FROM geo_playbook
  WHERE 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;