-- Add text_content column to observations table for text change detection
ALTER TABLE public.observations 
ADD COLUMN IF NOT EXISTS text_content TEXT;

-- Add index for text content searches (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_observations_text_content ON public.observations USING gin(to_tsvector('english', text_content));

