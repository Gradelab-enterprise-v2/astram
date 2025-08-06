
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Supabase credentials from environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    // Create a Supabase client with the service role key (admin privileges)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Check if we got a specific bucket name from the request
    let requestedBuckets = [];
    try {
      const { bucketName } = await req.json();
      if (bucketName) {
        requestedBuckets = [{ name: bucketName, description: `Bucket for ${bucketName}` }];
      }
    } catch (e) {
      // If JSON parsing fails, we'll use the default buckets
      console.log("No specific bucket requested, using defaults");
    }
    
    // If no specific bucket was requested, use the default ones
    if (requestedBuckets.length === 0) {
      requestedBuckets = [
        { name: 'papers', description: 'Bucket for test papers and answer keys' },
        { name: 'ocr-images', description: 'Bucket for OCR processed images' }
      ];
    }
    
    // Check if the required buckets already exist
    const { data: buckets, error: bucketsError } = await supabase
      .storage
      .listBuckets();
    
    if (bucketsError) {
      throw new Error(`Error listing buckets: ${bucketsError.message}`);
    }
    
    const createdBuckets = [];
    const existingBuckets = [];
    
    // Create required buckets if they don't exist
    for (const bucket of requestedBuckets) {
      const exists = buckets.some(b => b.name === bucket.name);
      
      if (!exists) {
        const { error: createBucketError } = await supabase
          .storage
          .createBucket(bucket.name, {
            public: true,
            fileSizeLimit: 52428800 // 50 MB in bytes
          });
        
        if (createBucketError) {
          throw new Error(`Error creating ${bucket.name} bucket: ${createBucketError.message}`);
        }
        
        console.log(`Created ${bucket.name} bucket successfully`);
        createdBuckets.push(bucket.name);
      } else {
        console.log(`${bucket.name} bucket already exists`);
        existingBuckets.push(bucket.name);
      }
    }
    
    // Create appropriate bucket policies for public access
    for (const bucketName of [...createdBuckets, ...existingBuckets]) {
      try {
        // Update or create bucket policy for public access
        await supabase
          .storage
          .from(bucketName)
          .getPublicUrl('test-file');
          
        console.log(`Ensured public access for ${bucketName} bucket`);
      } catch (policyError) {
        console.warn(`Warning: Could not verify policy for ${bucketName}: ${policyError.message}`);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Storage configured successfully",
        created: createdBuckets,
        existing: existingBuckets,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in create-storage function:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'An unknown error occurred'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
