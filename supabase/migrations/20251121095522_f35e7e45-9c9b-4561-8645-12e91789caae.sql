-- Create rewrites table
CREATE TABLE rewrites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
  original_html TEXT NOT NULL,
  rewritten_html TEXT NOT NULL,
  summary TEXT NOT NULL,
  geo_rationale TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_rewrites_page_id ON rewrites(page_id);
CREATE INDEX idx_rewrites_timestamp ON rewrites(timestamp);

-- Enable RLS
ALTER TABLE rewrites ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view all rewrites"
  ON rewrites FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert rewrites"
  ON rewrites FOR INSERT
  WITH CHECK (true);