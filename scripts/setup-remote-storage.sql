-- SQL script to set up storage buckets in remote Supabase
-- This script creates all required storage buckets and policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('student-sheets', 'student-sheets', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*']),
  ('test-papers', 'test-papers', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*']),
  ('chapter-materials', 'chapter-materials', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*']),
  ('profile-images', 'profile-images', true, 52428800, ARRAY['image/*']),
  ('gradelab-uploads', 'gradelab-uploads', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*']),
  ('question-papers', 'question-papers', true, 52428800, ARRAY['image/*', 'application/pdf', 'text/*'])
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Create storage policies for public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('student-sheets', 'test-papers', 'chapter-materials', 'profile-images', 'gradelab-uploads', 'question-papers'));

-- Create storage policies for authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND bucket_id IN ('student-sheets', 'test-papers', 'chapter-materials', 'profile-images', 'gradelab-uploads', 'question-papers'));

-- Create storage policies for users to update their own files
CREATE POLICY "Users can update own files" ON storage.objects FOR UPDATE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id IN ('student-sheets', 'test-papers', 'chapter-materials', 'profile-images', 'gradelab-uploads', 'question-papers'));

-- Create storage policies for users to delete their own files
CREATE POLICY "Users can delete own files" ON storage.objects FOR DELETE USING (auth.uid()::text = (storage.foldername(name))[1] AND bucket_id IN ('student-sheets', 'test-papers', 'chapter-materials', 'profile-images', 'gradelab-uploads', 'question-papers')); 