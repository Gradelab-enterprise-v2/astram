-- Add a column for storing AI-generated answer keys
ALTER TABLE test_papers
ADD COLUMN generated_answer_key TEXT; 