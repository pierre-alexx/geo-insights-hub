-- Create indexability_results table
CREATE TABLE IF NOT EXISTS public.indexability_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES public.pages(id),
  result_id UUID REFERENCES public.results(id),
  html_indexability_score FLOAT NOT NULL,
  structure_clarity_score FLOAT NOT NULL,
  entity_clarity_score FLOAT NOT NULL,
  content_scannability_score FLOAT NOT NULL,
  issues JSONB DEFAULT '[]'::jsonb,
  suggestions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.indexability_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view indexability results"
  ON public.indexability_results
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert indexability results"
  ON public.indexability_results
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_indexability_results_page_id ON public.indexability_results(page_id);
CREATE INDEX idx_indexability_results_created_at ON public.indexability_results(created_at DESC);