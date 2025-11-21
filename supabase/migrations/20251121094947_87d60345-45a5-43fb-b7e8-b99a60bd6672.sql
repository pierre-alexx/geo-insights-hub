-- Add crawling fields to pages table
ALTER TABLE pages 
  ADD COLUMN crawl_status TEXT DEFAULT 'pending',
  ADD COLUMN depth INTEGER DEFAULT 0,
  ADD COLUMN parent_url TEXT;

-- Create index for crawl queries (skip if exists)
CREATE INDEX IF NOT EXISTS idx_pages_crawl_status ON pages(crawl_status);
CREATE INDEX IF NOT EXISTS idx_pages_depth ON pages(depth);