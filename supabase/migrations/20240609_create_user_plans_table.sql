-- Remove user_plans table and related indexes

-- Create user_plans table if it does not exist
CREATE TABLE IF NOT EXISTS user_plans (
    user_id UUID NOT NULL REFERENCES auth.users(id),
    plan_id UUID NOT NULL REFERENCES plans(id),
    is_annual BOOLEAN NOT NULL DEFAULT false,
    renewal_date DATE,
    total_credits INTEGER DEFAULT 0,
    remaining_credits INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, plan_id)
);

-- Optional: Add indexes for performance
CREATE INDEX IF NOT EXISTS user_plans_user_id_idx ON user_plans(user_id);
CREATE INDEX IF NOT EXISTS user_plans_plan_id_idx ON user_plans(plan_id); 