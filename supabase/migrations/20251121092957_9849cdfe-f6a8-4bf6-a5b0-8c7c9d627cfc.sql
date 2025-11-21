-- Create prompts table
CREATE TABLE public.prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create results table
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID REFERENCES public.prompts(id) ON DELETE CASCADE NOT NULL,
  llm_response TEXT NOT NULL,
  presence_score SMALLINT NOT NULL CHECK (presence_score >= 0 AND presence_score <= 2),
  sentiment_score REAL NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  recommended BOOLEAN NOT NULL DEFAULT false,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

-- Since this is a dashboard for internal use, allow all authenticated users to access all data
-- Prompts policies
CREATE POLICY "Authenticated users can view all prompts"
ON public.prompts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert prompts"
ON public.prompts FOR INSERT
TO authenticated
WITH CHECK (true);

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
CREATE INDEX idx_prompts_created_at ON public.prompts(created_at DESC);
CREATE INDEX idx_results_timestamp ON public.results(timestamp DESC);
CREATE INDEX idx_results_prompt_id ON public.results(prompt_id);