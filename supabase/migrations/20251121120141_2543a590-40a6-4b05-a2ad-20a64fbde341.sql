-- Create personas table
CREATE TABLE public.personas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  goal TEXT NOT NULL,
  risk_profile TEXT NOT NULL,
  needs TEXT NOT NULL,
  typical_questions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create persona_results table
CREATE TABLE public.persona_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID NOT NULL REFERENCES public.personas(id),
  page_id UUID NOT NULL REFERENCES public.pages(id),
  prompt TEXT NOT NULL,
  llm_response TEXT NOT NULL,
  relevance_score FLOAT NOT NULL,
  comprehension_score FLOAT NOT NULL,
  visibility_score FLOAT NOT NULL,
  recommendation_score FLOAT NOT NULL,
  global_geo_score FLOAT NOT NULL,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for personas
CREATE POLICY "Authenticated users can view personas"
ON public.personas FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert personas"
ON public.personas FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update personas"
ON public.personas FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete personas"
ON public.personas FOR DELETE
USING (true);

-- RLS policies for persona_results
CREATE POLICY "Authenticated users can view persona results"
ON public.persona_results FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert persona results"
ON public.persona_results FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_persona_results_persona_id ON public.persona_results(persona_id);
CREATE INDEX idx_persona_results_page_id ON public.persona_results(page_id);
CREATE INDEX idx_persona_results_timestamp ON public.persona_results(timestamp);