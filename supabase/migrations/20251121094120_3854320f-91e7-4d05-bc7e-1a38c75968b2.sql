-- Drop old prompts table
DROP TABLE IF EXISTS public.prompts CASCADE;

-- Create pages table
CREATE TABLE public.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT UNIQUE NOT NULL,
  title TEXT,
  html_content TEXT,
  fetch_timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Drop and recreate results table with new schema
DROP TABLE IF EXISTS public.results CASCADE;

CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID REFERENCES public.pages(id) ON DELETE CASCADE NOT NULL,
  prompt_type TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  llm_response TEXT NOT NULL,
  relevance_score REAL NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
  comprehension_score REAL NOT NULL CHECK (comprehension_score >= 0 AND comprehension_score <= 1),
  visibility_score REAL NOT NULL CHECK (visibility_score >= 0 AND visibility_score <= 1),
  recommendation_score REAL NOT NULL CHECK (recommendation_score >= 0 AND recommendation_score <= 1),
  global_geo_score REAL NOT NULL CHECK (global_geo_score >= 0 AND global_geo_score <= 1),
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Pages policies
CREATE POLICY "Authenticated users can view all pages"
ON public.pages FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert pages"
ON public.pages FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update pages"
ON public.pages FOR UPDATE
TO authenticated
USING (true);

-- Results policies
CREATE POLICY "Authenticated users can view all results"
ON public.results FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert results"
ON public.results FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_pages_url ON public.pages(url);
CREATE INDEX idx_pages_fetch_timestamp ON public.pages(fetch_timestamp DESC);
CREATE INDEX idx_results_page_id ON public.results(page_id);
CREATE INDEX idx_results_timestamp ON public.results(timestamp DESC);
CREATE INDEX idx_results_global_geo_score ON public.results(global_geo_score DESC);