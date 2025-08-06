
-- Remove text_content column from analysis_history table since we'll get it from the paper directly
ALTER TABLE public.analysis_history DROP COLUMN IF EXISTS text_content;

-- Make sure bloomsdata can handle both old and new Bloom's taxonomy naming conventions
COMMENT ON COLUMN public.analysis_history.bloomsdata IS 'Stores analysis data including both old terminology (knowledge, comprehension, etc.) and new terminology (remember, understand, etc.)';
