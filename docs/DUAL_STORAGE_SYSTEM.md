# Dual Storage System

This application now supports a dual storage system where files are uploaded to both Supabase and Appwrite storage buckets simultaneously. This provides redundancy and backup capabilities while maintaining the primary functionality through Supabase.

## Overview

The dual storage system works as follows:

1. **Primary Storage**: Supabase storage (used for all file operations)
2. **Backup Storage**: Appwrite storage (optional, for redundancy)
3. **Fallback**: If Appwrite is not configured, the system works with Supabase only

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Supabase Configuration (Required)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Appwrite Configuration (Optional)
VITE_APPWRITE_ENDPOINT=http://localhost/v1
VITE_APPWRITE_PROJECT_ID=your_appwrite_project_id
```

### Appwrite Setup

1. **Install Appwrite locally** or use a hosted instance
2. **Create a project** in Appwrite
3. **Set up storage buckets** using the provided script:

```bash
npm run setup:appwrite
```

This will create all required buckets:
- `student-sheets` - Student answer sheets
- `test-papers` - Test papers and answer keys
- `chapter-materials` - Chapter materials and resources
- `profile-images` - User profile images
- `gradelab-uploads` - General uploads
- `papers` - General papers
- `ocr-images` - OCR processed images
- `question-papers` - Question papers

## How It Works

### File Upload Process

1. **Primary Upload**: File is uploaded to Supabase storage
2. **Backup Upload**: If Appwrite is configured, file is also uploaded to Appwrite
3. **URL Return**: Supabase URL is returned and used throughout the application
4. **Error Handling**: If Appwrite upload fails, it doesn't affect the primary upload

### File Operations

- **Read**: Files are always read from Supabase (primary storage)
- **Delete**: Files are deleted from both Supabase and Appwrite (if configured)
- **List**: File listing uses Supabase

## Implementation Details

### Core Files

- `src/lib/appwrite.ts` - Appwrite client configuration
- `src/lib/dual-storage.ts` - Dual storage service implementation
- `src/lib/storage-config.ts` - Updated to use dual storage

### Storage Service Functions

```typescript
// Upload to both storages
uploadToDualStorage(bucket, path, file, options)

// Delete from both storages
deleteFromDualStorage(bucket, path, appwriteFileId)

// Get file (from Supabase)
getFileFromDualStorage(bucket, path)
```

### Bucket Mapping

The system automatically maps Supabase buckets to Appwrite buckets:

```typescript
const BUCKET_MAPPING = {
  'student-sheets': 'student-sheets',
  'test-papers': 'test-papers',
  'chapter-materials': 'chapter-materials',
  'profile-images': 'profile-images',
  'gradelab-uploads': 'gradelab-uploads',
  'papers': 'papers',
  'ocr-images': 'ocr-images',
  'question-papers': 'question-papers'
};
```

## File Upload Locations

The dual storage system covers all file upload locations in the application:

### 1. Resources/Chapter Materials
- **Location**: `src/hooks/use-chapter-materials.ts`
- **Bucket**: `chapter-materials`
- **Usage**: Uploading chapter materials for question generation

### 2. Test Papers
- **Location**: `src/services/test-paper/upload-paper.ts`
- **Bucket**: `test-papers` or `papers`
- **Usage**: Uploading question papers and answer keys

### 3. Student Answer Sheets
- **Location**: `src/services/student-sheets/student-sheets-api.ts`
- **Bucket**: `student-sheets`
- **Usage**: Uploading student answer sheets for auto-grading

### 4. OCR Images
- **Location**: `src/services/test-paper/extract-text.ts`
- **Bucket**: `ocr-images`
- **Usage**: Temporary storage for OCR processing

### 5. Question Papers
- **Location**: `src/components/QuestionPaper.tsx`
- **Bucket**: `question-papers`
- **Usage**: Uploading question papers for text extraction

## Benefits

1. **Redundancy**: Files are stored in two locations
2. **Backup**: Appwrite serves as a backup storage
3. **Flexibility**: Can disable Appwrite by removing environment variables
4. **Performance**: Primary operations still use Supabase for speed
5. **Reliability**: If one storage fails, the other remains available

## Monitoring and Logging

The system provides comprehensive logging:

- Upload attempts to both storages
- Success/failure status for each storage
- Error details for troubleshooting
- Appwrite configuration status

## Troubleshooting

### Appwrite Not Working

1. **Check Configuration**: Verify `VITE_APPWRITE_ENDPOINT` and `VITE_APPWRITE_PROJECT_ID`
2. **Check Network**: Ensure Appwrite instance is accessible
3. **Check Buckets**: Run `npm run setup:appwrite` to create buckets
4. **Check Permissions**: Ensure Appwrite buckets have proper permissions

### Disable Appwrite

To disable Appwrite and use only Supabase:

1. Remove or comment out Appwrite environment variables
2. Restart the application
3. Files will only be uploaded to Supabase

### Performance Issues

- Appwrite uploads happen in parallel with Supabase
- If Appwrite is slow, it doesn't affect the primary upload
- Consider using a hosted Appwrite instance for better performance

## Migration

### From Single Storage

If migrating from a single storage system:

1. Install Appwrite dependencies: `npm install appwrite`
2. Set up Appwrite configuration
3. Run bucket setup: `npm run setup:appwrite`
4. The system will automatically start dual storage

### To Single Storage

To revert to single storage:

1. Remove Appwrite environment variables
2. The system will automatically use only Supabase
3. No code changes required

## Security Considerations

1. **Environment Variables**: Keep Appwrite credentials secure
2. **Bucket Permissions**: Configure appropriate permissions for each bucket
3. **File Access**: Appwrite files are accessible via the configured permissions
4. **Data Privacy**: Ensure compliance with data protection regulations

## Future Enhancements

Potential improvements to the dual storage system:

1. **Automatic Failover**: Switch to Appwrite if Supabase is down
2. **Sync Status**: Track sync status between storages
3. **Selective Backup**: Choose which file types to backup
4. **Compression**: Implement file compression for storage efficiency
5. **Encryption**: Add file-level encryption for sensitive data
