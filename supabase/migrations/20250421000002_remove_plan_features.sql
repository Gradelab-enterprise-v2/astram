-- Remove features column from plans table
ALTER TABLE plans DROP COLUMN IF EXISTS features;

-- Update the plans table structure to focus on core attributes
COMMENT ON TABLE plans IS 'Subscription plans with core limits and pricing information'; 