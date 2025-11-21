-- Create generated_pages table
CREATE TABLE public.generated_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id UUID REFERENCES public.personas(id),
  html_content TEXT NOT NULL,
  outline TEXT NOT NULL,
  rationale TEXT NOT NULL,
  persona_rationale TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.generated_pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view generated pages"
ON public.generated_pages
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert generated pages"
ON public.generated_pages
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can update generated pages"
ON public.generated_pages
FOR UPDATE
USING (true);

CREATE POLICY "Authenticated users can delete generated pages"
ON public.generated_pages
FOR DELETE
USING (true);