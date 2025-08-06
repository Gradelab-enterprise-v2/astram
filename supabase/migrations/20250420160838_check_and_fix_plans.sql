-- First, let's check if the plans table exists and its current structure
DO $$ 
BEGIN 
    -- Check if plans table exists and its current structure
    IF EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'plans'
    ) THEN
        -- Backup existing data if any
        CREATE TABLE IF NOT EXISTS plans_backup AS 
        SELECT * FROM plans;

        -- Drop conflicting elements
        DROP TRIGGER IF EXISTS update_plans_updated_at ON plans;
        DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
        
        -- Add missing columns if they don't exist
        BEGIN
            ALTER TABLE plans 
                ADD COLUMN IF NOT EXISTS price_monthly DECIMAL(10,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2) DEFAULT 0,
                ADD COLUMN IF NOT EXISTS class_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS subject_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS student_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS paper_upload_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS document_upload_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS question_generation_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS auto_grade_limit INTEGER DEFAULT 0,
                ADD COLUMN IF NOT EXISTS payment_link TEXT,
                ALTER COLUMN features TYPE JSONB USING COALESCE(features::jsonb, '{}');
        EXCEPTION WHEN OTHERS THEN
            -- If there's an error converting features, we'll handle it
            ALTER TABLE plans DROP COLUMN features;
            ALTER TABLE plans ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
        END;
    ELSE
        -- Create new plans table if it doesn't exist
        CREATE TABLE plans (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL UNIQUE,
            type plan_type NOT NULL DEFAULT 'free',
            description TEXT,
            price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
            price_yearly DECIMAL(10,2) NOT NULL DEFAULT 0,
            class_limit INTEGER NOT NULL DEFAULT 0,
            subject_limit INTEGER NOT NULL DEFAULT 0,
            student_limit INTEGER NOT NULL DEFAULT 0,
            paper_upload_limit INTEGER NOT NULL DEFAULT 0,
            document_upload_limit INTEGER NOT NULL DEFAULT 0,
            question_generation_limit INTEGER NOT NULL DEFAULT 0,
            auto_grade_limit INTEGER NOT NULL DEFAULT 0,
            payment_link TEXT,
            features JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;

    -- Create or update indexes
    DROP INDEX IF EXISTS plans_type_idx;
    DROP INDEX IF EXISTS plans_price_monthly_idx;
    DROP INDEX IF EXISTS plans_features_idx;
    
    CREATE INDEX IF NOT EXISTS plans_type_idx ON plans(type);
    CREATE INDEX IF NOT EXISTS plans_price_monthly_idx ON plans(price_monthly);
    CREATE INDEX IF NOT EXISTS plans_features_idx ON plans USING GIN (features);

    -- Ensure RLS is enabled
    ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

    -- Recreate policies
    DROP POLICY IF EXISTS "Allow anyone to read plans" ON plans;
    DROP POLICY IF EXISTS "Allow admins to modify plans" ON plans;

    CREATE POLICY "Allow anyone to read plans"
        ON plans FOR SELECT
        USING (true);

    CREATE POLICY "Allow admins to modify plans"
        ON plans FOR ALL
        USING (is_admin())
        WITH CHECK (is_admin());

    -- Update or insert Basic Plan
    INSERT INTO plans (
        name,
        type,
        price_monthly,
        price_yearly,
        description,
        class_limit,
        subject_limit,
        student_limit,
        paper_upload_limit,
        document_upload_limit,
        question_generation_limit,
        auto_grade_limit,
        payment_link,
        features
    )
    VALUES (
        'Basic Plan',
        'basic',
        0,
        0,
        'Basic tier plan',
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        NULL,
        '{
            "csv_download": false,
            "white_labelling": false,
            "view_summary": false
        }'::jsonb
    )
    ON CONFLICT (name) 
    DO UPDATE SET
        type = EXCLUDED.type,
        price_monthly = EXCLUDED.price_monthly,
        price_yearly = EXCLUDED.price_yearly,
        class_limit = EXCLUDED.class_limit,
        subject_limit = EXCLUDED.subject_limit,
        student_limit = EXCLUDED.student_limit,
        paper_upload_limit = EXCLUDED.paper_upload_limit,
        document_upload_limit = EXCLUDED.document_upload_limit,
        question_generation_limit = EXCLUDED.question_generation_limit,
        auto_grade_limit = EXCLUDED.auto_grade_limit,
        payment_link = EXCLUDED.payment_link,
        features = EXCLUDED.features;

END $$; 