-- Drop existing features column and recreate it as JSONB
ALTER TABLE plans DROP COLUMN IF EXISTS features;
ALTER TABLE plans ADD COLUMN features JSONB;

-- Update the features column to have a default value
ALTER TABLE plans ALTER COLUMN features SET DEFAULT '{}'::jsonb; 