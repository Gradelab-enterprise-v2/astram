#!/bin/bash

# Script to copy remote storage setup SQL to clipboard
echo "📋 Copying remote storage setup SQL to clipboard..."

# Check if pbcopy is available (macOS)
if command -v pbcopy &> /dev/null; then
    cat scripts/setup-remote-storage.sql | pbcopy
    echo "✅ SQL copied to clipboard!"
    echo ""
    echo "📝 Next steps:"
    echo "1. Open your remote Supabase dashboard: https://mfnhgldghrnjrwlhtvor.supabase.co"
    echo "2. Go to the SQL Editor"
    echo "3. Paste the SQL (Cmd+V)"
    echo "4. Click 'Run' to execute"
    echo ""
    echo "🎯 This will create the following storage buckets:"
    echo "  - student-sheets"
    echo "  - test-papers"
    echo "  - chapter-materials"
    echo "  - profile-images"
    echo "  - gradelab-uploads"
    echo "  - question-papers"
elif command -v xclip &> /dev/null; then
    cat scripts/setup-remote-storage.sql | xclip -selection clipboard
    echo "✅ SQL copied to clipboard!"
else
    echo "⚠️  Clipboard not available. Please copy the SQL manually:"
    echo ""
    cat scripts/setup-remote-storage.sql
fi 