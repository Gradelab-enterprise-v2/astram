#!/bin/bash

echo "🚀 Setting up Local Supabase Environment..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Initialize Supabase if not already done
if [ ! -f "supabase/config.toml" ]; then
    echo "📁 Initializing Supabase project..."
    supabase init
fi

# Start local Supabase
echo "🔧 Starting local Supabase..."
supabase start

# Get the local anon key
echo "🔑 Getting local anon key..."
LOCAL_ANON_KEY=$(supabase status --output json | jq -r '.api.anon_key')

if [ "$LOCAL_ANON_KEY" = "null" ] || [ -z "$LOCAL_ANON_KEY" ]; then
    echo "❌ Failed to get local anon key"
    exit 1
fi

echo "✅ Local Supabase is running!"
echo "📊 Dashboard: http://localhost:54323"
echo "🔑 Anon Key: $LOCAL_ANON_KEY"

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
# Local Supabase Configuration
VITE_USE_LOCAL_SUPABASE=true
VITE_SUPABASE_LOCAL_ANON_KEY=$LOCAL_ANON_KEY

# Remote Supabase Configuration (for edge functions)
VITE_SUPABASE_REMOTE_URL=https://mfnhgldghrnjrwlhtvor.supabase.co
VITE_SUPABASE_REMOTE_ANON_KEY=your_remote_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_remote_service_role_key_here

# Azure OpenAI Configuration (for edge functions)
AZURE_OPENAI_API_KEY=your_azure_openai_key_here
AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint_here
AZURE_OPENAI_DEPLOYMENT=your_azure_openai_deployment_here

# Other Configuration
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret_here
VITE_GOOGLE_REDIRECT_URI=your_google_redirect_uri_here
EOF
    echo "✅ Created .env.local file"
else
    echo "📝 .env.local already exists"
fi

echo ""
echo "🎉 Setup complete! Next steps:"
echo "1. Update .env.local with your remote Supabase credentials"
echo "2. Run: npm run migrate:local"
echo "3. Start the development server: npm run dev" 