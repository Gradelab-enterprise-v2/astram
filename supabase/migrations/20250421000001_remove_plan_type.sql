-- Drop the plan_type enum and remove the type column
DROP TYPE IF EXISTS plan_type CASCADE;

-- Modify the plans table to remove the type column and ensure all necessary columns exist
ALTER TABLE plans 
    DROP COLUMN IF EXISTS type,
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN price_monthly SET NOT NULL DEFAULT 0,
    ALTER COLUMN price_yearly SET NOT NULL DEFAULT 0,
    ALTER COLUMN description SET DEFAULT '',
    ALTER COLUMN class_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN subject_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN student_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN paper_upload_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN document_upload_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN question_generation_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN auto_grade_limit SET NOT NULL DEFAULT 0,
    ALTER COLUMN payment_link SET DEFAULT '';

-- Ensure RLS policies are in place
DROP POLICY IF EXISTS "Allow anyone to view plans" ON plans;
DROP POLICY IF EXISTS "Allow admins to manage plans" ON plans;

CREATE POLICY "Allow anyone to view plans"
    ON plans FOR SELECT
    USING (true);

CREATE POLICY "Allow admins to manage plans"
    ON plans FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- Add comment to document the change
COMMENT ON TABLE plans IS 'Subscription plans with pricing and feature limits'; 