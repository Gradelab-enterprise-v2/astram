-- Enable Row Level Security
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read plans
CREATE POLICY "Allow anyone to read plans"
ON plans
FOR SELECT
TO authenticated
USING (true);

-- Allow only admins to modify plans
CREATE POLICY "Allow admins to modify plans"
ON plans
FOR ALL
TO authenticated
USING (
    (SELECT is_admin FROM is_admin(auth.uid()))
)
WITH CHECK (
    (SELECT is_admin FROM is_admin(auth.uid()))
);

-- Create index on name for faster lookups and unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS plans_name_idx ON plans(name);

-- Create index on type for faster filtering
CREATE INDEX IF NOT EXISTS plans_type_idx ON plans(type);

-- Create index on price_monthly for sorting
CREATE INDEX IF NOT EXISTS plans_price_monthly_idx ON plans(price_monthly); 