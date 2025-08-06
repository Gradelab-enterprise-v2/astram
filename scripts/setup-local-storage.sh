#!/bin/bash

echo "🔧 Setting up Local Storage Buckets..."

# Local Supabase URL
LOCAL_SUPABASE_URL="http://5.9.108.115:8080"
LOCAL_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE"

# Storage buckets to create
BUCKETS=(
  "student-sheets"
  "test-papers"
  "chapter-materials"
  "profile-images"
  "gradelab-uploads"
  "papers"
  "ocr-images"
  "question-papers"
)

echo "📦 Creating storage buckets..."

for bucket in "${BUCKETS[@]}"; do
  echo "Creating bucket: $bucket"
  
  # Create bucket using curl
  curl -X POST "$LOCAL_SUPABASE_URL/storage/v1/bucket" \
    -H "apikey: $LOCAL_ANON_KEY" \
    -H "Authorization: Bearer $LOCAL_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"id\": \"$bucket\",
      \"name\": \"$bucket\",
      \"public\": true
    }" 2>/dev/null || echo "Bucket $bucket might already exist"
  
  # Set bucket to public
  curl -X PATCH "$LOCAL_SUPABASE_URL/storage/v1/bucket/$bucket" \
    -H "apikey: $LOCAL_ANON_KEY" \
    -H "Authorization: Bearer $LOCAL_ANON_KEY" \
    -H "Content-Type: application/json" \
    -d "{
      \"public\": true
    }" 2>/dev/null || echo "Could not set $bucket to public"
done

echo "✅ Storage buckets setup complete!"
echo ""
echo "📋 Created buckets:"
for bucket in "${BUCKETS[@]}"; do
  echo "  - $bucket"
done
echo ""
echo "🌐 Access your local Supabase at: $LOCAL_SUPABASE_URL"
echo "📊 Dashboard: http://5.9.108.115:54323" 