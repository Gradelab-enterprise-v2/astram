-- Drop existing policies
DROP POLICY IF EXISTS "Users can view rubrics for their tests" ON rubrics;
DROP POLICY IF EXISTS "Users can create rubrics for their tests" ON rubrics;
DROP POLICY IF EXISTS "Users can update rubrics for their tests" ON rubrics;
DROP POLICY IF EXISTS "Users can delete rubrics for their tests" ON rubrics;

-- Create simpler policies for testing
CREATE POLICY "Users can view any rubrics"
    ON rubrics FOR SELECT
    USING (true);

CREATE POLICY "Users can create rubrics if authenticated"
    ON rubrics FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their rubrics"
    ON rubrics FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = test_id
        )
    )
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their rubrics"
    ON rubrics FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tests t
            WHERE t.id = test_id
        )
    ); 