# Local Supabase Setup Guide

This guide explains how to set up a hybrid Supabase environment where:
- **Data is stored locally** at `http://5.9.108.115:8080`
- **Edge functions run on local Supabase** for processing
- **Images are stored locally** for faster access

## 🎯 Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Local Supabase  │    │ Local Edge      │
│   (React/Vite)  │◄──►│  (Data + Storage)│    │ Functions       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       http://5.9.108.115:8080
```

## 🚀 Quick Setup

### 1. Install Dependencies
```bash
# Install Supabase CLI
npm install -g supabase

# Install project dependencies
npm install
```

### 2. Setup Local Environment
```bash
# Run the setup script
npm run setup:local
```

### 3. Setup Local Storage
```bash
# Create storage buckets for images
npm run setup:storage
```

### 4. Configure Environment
Create `.env.local` with your configuration:
```env
# Local Supabase Configuration
VITE_USE_LOCAL_SUPABASE=true
VITE_SUPABASE_LOCAL_URL=http://5.9.108.115:8080
VITE_SUPABASE_LOCAL_ANON_KEY=your_local_anon_key

# Remote Supabase Configuration (for edge functions)
VITE_SUPABASE_REMOTE_URL=https://mfnhgldghrnjrwlhtvor.supabase.co
VITE_SUPABASE_REMOTE_ANON_KEY=your_remote_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_remote_service_role_key

# Azure OpenAI (for edge functions)
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_ENDPOINT=your_azure_endpoint
AZURE_OPENAI_DEPLOYMENT=your_azure_deployment
```

### 5. Migrate Data
```bash
# Migrate data from remote to local
npm run migrate:local
```

### 6. Start Development
```bash
# Start the development server
npm run dev
```

## 🔧 Configuration Details

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_USE_LOCAL_SUPABASE` | Enable local data storage | `true` |
| `VITE_SUPABASE_LOCAL_URL` | Local Supabase URL | `http://5.9.108.115:8080` |
| `VITE_SUPABASE_LOCAL_ANON_KEY` | Local anon key | Auto-generated |
| `VITE_SUPABASE_REMOTE_URL` | Remote project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_REMOTE_ANON_KEY` | Remote anon key | From dashboard |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Remote service role key | From dashboard |

### Storage Buckets

The following storage buckets are created locally:
- `student-sheets` - Student answer sheets
- `test-papers` - Test papers and questions
- `chapter-materials` - Chapter materials and resources
- `profile-images` - User profile images
- `gradelab-uploads` - General uploads
- `papers` - Legacy papers bucket
- `ocr-images` - OCR processing images
- `question-papers` - Question paper images

## 🔄 Data Flow

### Local Development
1. **Data Operations**: Use local Supabase at `http://5.9.108.115:8080`
2. **Edge Functions**: Call local edge functions
3. **Authentication**: Use local Supabase
4. **Storage**: Use local Supabase storage
5. **Images**: Stored locally for faster access

### Production
1. **Data Operations**: Use remote Supabase
2. **Edge Functions**: Use remote Supabase functions
3. **Authentication**: Use remote Supabase
4. **Storage**: Use remote Supabase storage

## 🛠️ Available Scripts

| Script | Description |
|--------|-------------|
| `npm run setup:local` | Setup local Supabase environment |
| `npm run setup:storage` | Create local storage buckets |
| `npm run migrate:local` | Migrate data from remote to local |
| `npm run supabase:start` | Start local Supabase |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:status` | Check local Supabase status |
| `npm run db:reset` | Reset local database |
| `npm run db:push` | Push schema changes to local |
| `npm run db:pull` | Pull schema from remote |

## 🔍 Troubleshooting

### Common Issues

1. **Local Supabase not accessible**
   ```bash
   # Check if the server is running
   curl http://5.9.108.115:8080/health
   
   # Check if storage is accessible
   curl http://5.9.108.115:8080/storage/v1/bucket
   ```

2. **Storage buckets not created**
   ```bash
   # Run storage setup
   npm run setup:storage
   
   # Check buckets manually
   curl -H "apikey: YOUR_ANON_KEY" http://5.9.108.115:8080/storage/v1/bucket
   ```

3. **Edge functions not working**
   ```bash
   # Check edge function logs
   supabase functions logs
   
   # Deploy edge functions to local
   supabase functions deploy --project-ref local
   ```

### Useful Commands

```bash
# View local Supabase logs
supabase logs

# Access local database directly
supabase db reset

# Check local Supabase status
supabase status

# View local dashboard
open http://5.9.108.115:54323
```

## 🔐 Security Considerations

1. **Local Development**: Data is stored locally at `http://5.9.108.115:8080`
2. **Edge Functions**: Use local Supabase for processing
3. **Authentication**: Local auth for development
4. **API Keys**: Keep remote keys secure, local keys are auto-generated

## 📊 Monitoring

### Local Dashboard
- URL: http://5.9.108.115:54323
- Username: `supabase`
- Password: `this_password_is_insecure_and_should_be_updated`

### Local API
- URL: http://5.9.108.115:8080
- Health check: http://5.9.108.115:8080/health

## 🚀 Deployment

When ready to deploy:

1. **Switch to remote mode**:
   ```env
   VITE_USE_LOCAL_SUPABASE=false
   ```

2. **Deploy edge functions**:
   ```bash
   supabase functions deploy
   ```

3. **Push schema changes**:
   ```bash
   supabase db push --project-ref mfnhgldghrnjrwlhtvor
   ```

## 📝 Notes

- Local Supabase runs on port 8080
- Local dashboard runs on port 54323
- Edge functions use local Supabase for processing
- Images are stored locally for faster access
- Local development is faster and more reliable
- All data operations use local Supabase at `http://5.9.108.115:8080` 