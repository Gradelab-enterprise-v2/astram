-- Enable RLS on plans table if not already enabled
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow anyone to view plans" ON plans;
DROP POLICY IF EXISTS "Allow admins to manage plans" ON plans;

-- Create policy to allow anyone to view plans
CREATE POLICY "Allow anyone to view plans"
    ON plans FOR SELECT
    USING (true);

-- Create policy to allow only admins to manage plans
-- Using a direct check against the administrators table without recursion
CREATE POLICY "Allow admins to manage plans"
    ON plans FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM administrators a
            WHERE a.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM administrators a
            WHERE a.user_id = auth.uid()
        )
    ); 