
-- Create table for storing paper analysis history
CREATE TABLE IF NOT EXISTS public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  text_content TEXT,
  has_extracted_text BOOLEAN DEFAULT false,
  extraction_started_at TIMESTAMP WITH TIME ZONE,
  extraction_completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'processing',
  extraction_status TEXT DEFAULT 'pending',
  bloomsdata JSONB,
  questions JSONB,
  file_url TEXT,
  subject_id UUID,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add Row Level Security
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- Create policies for analysis_history table
CREATE POLICY "Users can view their own analysis history"
  ON public.analysis_history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis history"
  ON public.analysis_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analysis history"
  ON public.analysis_history
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis history"
  ON public.analysis_history
  FOR DELETE
  USING (auth.uid() = user_id);
