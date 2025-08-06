-- Insert or update default plans
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
    features
)
VALUES 
-- Free Plan
(
    'Free Plan',
    'free',
    0,
    0,
    'Start your journey with basic features',
    2,
    4,
    50,
    10,
    20,
    100,
    50,
    '{"csv_download": false, "white_labelling": false, "view_summary": true}'::jsonb
),
-- Basic Plan
(
    'Basic Plan',
    'basic',
    29.99,
    299.99,
    'Perfect for small to medium institutions',
    5,
    10,
    200,
    50,
    100,
    500,
    200,
    '{"csv_download": true, "white_labelling": false, "view_summary": true}'::jsonb
),
-- Premium Plan
(
    'Premium Plan',
    'premium',
    99.99,
    999.99,
    'Unlimited access to all features',
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    999999,
    '{"csv_download": true, "white_labelling": true, "view_summary": true}'::jsonb
)
ON CONFLICT (name) 
DO UPDATE SET
    type = EXCLUDED.type,
    price_monthly = EXCLUDED.price_monthly,
    price_yearly = EXCLUDED.price_yearly,
    description = EXCLUDED.description,
    class_limit = EXCLUDED.class_limit,
    subject_limit = EXCLUDED.subject_limit,
    student_limit = EXCLUDED.student_limit,
    paper_upload_limit = EXCLUDED.paper_upload_limit,
    document_upload_limit = EXCLUDED.document_upload_limit,
    question_generation_limit = EXCLUDED.question_generation_limit,
    auto_grade_limit = EXCLUDED.auto_grade_limit,
    features = EXCLUDED.features; 