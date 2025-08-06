-- Fix database relationships for generated_questions table

-- 1. Check if the foreign key constraint exists
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='generated_questions'
    AND ccu.table_name='subjects';

-- 2. Add the missing foreign key constraint if it doesn't exist
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'generated_questions_subject_id_fkey' 
        AND table_name = 'generated_questions'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE generated_questions 
        ADD CONSTRAINT generated_questions_subject_id_fkey 
        FOREIGN KEY (subject_id) REFERENCES subjects(id);
        
        RAISE NOTICE 'Added foreign key constraint generated_questions_subject_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- 3. Verify the constraint was added
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='generated_questions'
    AND ccu.table_name='subjects';

-- 4. Check for any orphaned records (generated_questions with invalid subject_id)
SELECT 
    gq.id,
    gq.subject_id,
    gq.topic,
    gq.created_at
FROM generated_questions gq
LEFT JOIN subjects s ON gq.subject_id = s.id
WHERE s.id IS NULL AND gq.subject_id IS NOT NULL;

-- 5. If there are orphaned records, you can either:
-- Option A: Delete orphaned records
-- DELETE FROM generated_questions WHERE subject_id NOT IN (SELECT id FROM subjects);

-- Option B: Set subject_id to NULL for orphaned records
-- UPDATE generated_questions SET subject_id = NULL WHERE subject_id NOT IN (SELECT id FROM subjects);

-- 6. Verify the relationship works
SELECT 
    gq.id,
    gq.topic,
    s.name as subject_name
FROM generated_questions gq
JOIN subjects s ON gq.subject_id = s.id
LIMIT 5; 