import { Client, Storage } from 'appwrite';

// Test Appwrite bucket access and permissions
async function testBucketAccess() {
  try {
    console.log('Testing Appwrite bucket access...');
    
    // Create client
    const client = new Client()
      .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'http://5.9.108.115:2020/v1')
      .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '68a4a19c0012a58e3a3c');
    
    const storage = new Storage(client);
    
    console.log('Client created successfully');
    
    // Test specific bucket access
    const bucketName = 'papers';
    console.log(`\nTesting access to bucket: ${bucketName}`);
    
    try {
      // List files in the bucket
      const files = await storage.listFiles(bucketName);
      console.log(`Successfully listed files in bucket ${bucketName}:`);
      console.log(`Total files: ${files.total}`);
      
      if (files.files.length > 0) {
        console.log('\nFile details:');
        files.files.forEach((file, index) => {
          console.log(`${index + 1}. ID: ${file.$id}`);
          console.log(`   Name: ${file.name}`);
          console.log(`   Size: ${file.sizeOriginal} bytes`);
          console.log(`   Created: ${file.$createdAt}`);
          console.log(`   Permissions: ${JSON.stringify(file.$permissions)}`);
          console.log(`   MIME Type: ${file.mimeType}`);
          console.log('');
        });
      }
      
      // Try to get a specific file view URL
      if (files.files.length > 0) {
        const firstFile = files.files[0];
        console.log(`\nTesting file view for file ID: ${firstFile.$id}`);
        
        try {
          const fileView = storage.getFileView(bucketName, firstFile.$id);
          console.log(`File view URL: ${fileView.toString()}`);
          
          // Test if we can get file info
          const fileInfo = await storage.getFile(bucketName, firstFile.$id);
          console.log('File info retrieved successfully:', fileInfo);
          
        } catch (error) {
          console.error('Error getting file view or info:', error);
        }
      }
      
    } catch (error) {
      console.error(`Error accessing bucket ${bucketName}:`, error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testBucketAccess();
