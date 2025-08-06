import { useState, createContext, useContext } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from "@/lib/supabase-hybrid";
import { uploadImageToLocal, STORAGE_BUCKETS } from "@/lib/storage-config";

interface AuthContextType {
  user: any;
}

const AuthContext = createContext<AuthContextType>({ user: null });

export const useAuth = () => useContext(AuthContext);

interface QuestionPaperProps {
  user: any;
}

const QuestionPaper: React.FC<QuestionPaperProps> = ({ user }) => {
  const [images, setImages] = useState<File[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [extractingText, setExtractingText] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [processedPages, setProcessedPages] = useState(0);

  const BATCH_SIZE = 10; // Process 10 pages at a time for better efficiency

  const convertToPNG = async (image: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw white background
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw the image
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          resolve(new File([blob], `${image.name.split('.')[0]}.png`, { type: 'image/png' }));
        }, 'image/png', 1.0);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(image);
    });
  };

  const uploadImages = async () => {
    try {
      setUploadingImages(true);
      setUploadProgress(0);
      setUploadedImageUrls([]);
      setExtractionError(null);

      if (!images.length) {
        throw new Error('No images selected');
      }

      const urls: string[] = [];
      
      for (let i = 0; i < images.length; i++) {
        try {
          const pngImage = images[i].type === 'image/png' ? images[i] : await convertToPNG(images[i]);
          
          const filePath = `${user.id}/${Date.now()}-${pngImage.name}`;
          const { publicUrl, error: uploadError } = await uploadImageToLocal(
            STORAGE_BUCKETS.TEST_PAPERS,
            filePath,
            pngImage
          );
          
          if (uploadError) throw uploadError;
          
          urls.push(publicUrl);
          setUploadProgress(((i + 1) / images.length) * 100);
        } catch (error) {
          console.error(`Error uploading image ${i + 1}:`, error);
          throw error;
        }
      }

      setUploadedImageUrls(urls);
      setTotalPages(urls.length);
    } catch (error) {
      console.error('Error uploading images:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to upload images');
    } finally {
      setUploadingImages(false);
    }
  };

  const extractText = async () => {
    try {
      setExtractingText(true);
      setExtractionError(null);
      setExtractedText('');
      setCurrentBatchIndex(0);
      setProcessedPages(0);

      if (!uploadedImageUrls.length) {
        throw new Error('No images uploaded');
      }

      let combinedText = '';
      
      // Process images in batches
      for (let i = 0; i < uploadedImageUrls.length; i += BATCH_SIZE) {
        setCurrentBatchIndex(Math.floor(i / BATCH_SIZE));
        const batchUrls = uploadedImageUrls.slice(i, i + BATCH_SIZE);
        
        try {
          const { data, error } = await supabase.functions.invoke('extract-text', {
            body: {
              imageUrls: batchUrls,
              documentType: 'question',
              prompt: 'Extract all text from these images while preserving formatting, line breaks, and structure. Include any mathematical equations, symbols, or special characters exactly as they appear.',
              pageIndex: i
            }
          });

          if (error) throw error;

          // Update the extracted text with streaming effect
          combinedText += (combinedText ? '\n\n--- PAGE BREAK ---\n\n' : '') + data.extractedText;
          setExtractedText(combinedText);
          setProcessedPages(prev => prev + data.pageCount);

          // Clean up the uploaded images in this batch
          await Promise.all(
            batchUrls.map(async (url) => {
              const filePath = url.split('/').pop();
              await supabase.storage
                .from('question-papers')
                .remove([`${user.id}/${filePath}`]);
            })
          );

        } catch (error) {
          console.error(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}:`, error);
          const errorMessage = error.message || 'Failed to extract text';
          setExtractionError(`Error processing batch ${Math.floor(i / BATCH_SIZE) + 1}: ${errorMessage}`);
          break;
        }
      }

    } catch (error) {
      console.error('Error extracting text:', error);
      setExtractionError(error instanceof Error ? error.message : 'Failed to extract text');
    } finally {
      setExtractingText(false);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files || []))}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>
      
      <button
        onClick={uploadImages}
        disabled={uploadingImages || !images.length}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50 mb-4"
      >
        {uploadingImages ? `Uploading... ${Math.round(uploadProgress)}%` : 'Upload Images'}
      </button>

      {uploadProgress > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {uploadedImageUrls.length > 0 && !extractingText && (
        <button
          onClick={extractText}
          className="bg-green-500 text-white px-4 py-2 rounded"
        >
          Extract Text
        </button>
      )}

      {extractingText && (
        <div className="mt-4">
          <div className="text-sm text-gray-600 mb-2">
            Processing batch {currentBatchIndex + 1} (Pages {processedPages + 1} to {Math.min(processedPages + BATCH_SIZE, totalPages)} of {totalPages})...
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{ width: `${(processedPages / totalPages) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {extractionError && (
        <div className="mt-4 text-red-500">
          Error: {extractionError}
        </div>
      )}

      {extractedText && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <pre className="whitespace-pre-wrap">{extractedText}</pre>
        </div>
      )}
    </div>
  );
};

export default QuestionPaper; 