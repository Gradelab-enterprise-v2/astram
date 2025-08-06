-- Ensure all required columns exist in plans table
DO $$ 
BEGIN
    -- First check if the table exists, if not create it
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'plans') THEN
        CREATE TABLE plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL UNIQUE,
            type plan_type NOT NULL DEFAULT 'free',
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;

    -- Add columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_monthly') THEN
        ALTER TABLE plans ADD COLUMN price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'price_yearly') THEN
        ALTER TABLE plans ADD COLUMN price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'class_limit') THEN
        ALTER TABLE plans ADD COLUMN class_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'subject_limit') THEN
        ALTER TABLE plans ADD COLUMN subject_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'student_limit') THEN
        ALTER TABLE plans ADD COLUMN student_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'paper_upload_limit') THEN
        ALTER TABLE plans ADD COLUMN paper_upload_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'document_upload_limit') THEN
        ALTER TABLE plans ADD COLUMN document_upload_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'question_generation_limit') THEN
        ALTER TABLE plans ADD COLUMN question_generation_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'auto_grade_limit') THEN
        ALTER TABLE plans ADD COLUMN auto_grade_limit INTEGER NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'payment_link') THEN
        ALTER TABLE plans ADD COLUMN payment_link TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plans' AND column_name = 'features') THEN
        ALTER TABLE plans ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS plans_type_idx ON plans(type);
CREATE INDEX IF NOT EXISTS plans_price_monthly_idx ON plans(price_monthly);

-- Enable RLS
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

-- Recreate policies
DROP POLICY IF EXISTS "Allow anyone to read plans" ON plans;
DROP POLICY IF EXISTS "Allow admins to modify plans" ON plans;

CREATE POLICY "Allow anyone to read plans"
ON plans
FOR SELECT
TO authenticated
USING (true);

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