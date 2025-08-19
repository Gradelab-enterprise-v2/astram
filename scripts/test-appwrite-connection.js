import { Client, Storage } from 'appwrite';

// Test Appwrite connection and bucket access
async function testAppwriteConnection() {
  try {
    console.log('Testing Appwrite connection...');
    
    // Create client
    const client = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'http://5.9.108.115:2020/v1')
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '68a4a19c0012a58e3a3c');
    
    const storage = new Storage(client);
    
    console.log('Client created successfully');
    console.log('Endpoint:', process.env.VITE_APPWRITE_ENDPOINT || 'http://5.9.108.115:2020/v1');
    console.log('Project ID:', process.env.VITE_APPWRITE_PROJECT_ID || '68a4a19c0012a58e3a3c');
    
    // Test listing files in papers bucket
    console.log('\nListing files in papers bucket...');
    try {
      const files = await storage.listFiles('papers');
      console.log('Files in papers bucket:', files);
    } catch (error) {
      console.error('Error listing files in papers bucket:', error);
    }
    
    // Test listing files in other buckets
    const testBuckets = ['student-sheets', 'test-papers', 'chapter-materials'];
    for (const bucketName of testBuckets) {
      console.log(`\nListing files in ${bucketName} bucket...`);
      try {
        const files = await storage.listFiles(bucketName);
        console.log(`Files in ${bucketName} bucket:`, files);
      } catch (error) {
        console.error(`Error listing files in ${bucketName} bucket:`, error);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAppwriteConnection();
