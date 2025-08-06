-- Drop existing features column and recreate it as JSONB
ALTER TABLE plans 
    DROP COLUMN IF EXISTS features,
    ADD COLUMN features JSONB DEFAULT '{}'::jsonb;

-- Recreate the index if needed
DROP INDEX IF EXISTS plans_features_idx;
CREATE INDEX plans_features_idx ON plans USING GIN (features); 