import * as pdfjs from 'pdfjs-dist';

// We need to use the exact same version for both the library and worker
// Making sure to use version 2.16.105 which is installed in our package.json
pdfjs.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@2.16.105/build/pdf.worker.min.js';

/**
 * Convert a PDF file to an array of image data URLs
 * @param file The PDF file to convert
 * @param options Options for conversion (quality, grayscale, maxWidth)
 * @returns Promise resolving to an array of image data URLs
 */
export async function convertPdfToImages(
  file: File,
  options: {
    quality?: number;
    grayscale?: boolean;
    maxWidth?: number;
    imageFormat?: string;
  } = {}
): Promise<string[]> {
  try {
    const { 
      quality = 0.95,    // Higher quality for OCR
      grayscale = true,  // Keep grayscale for better OCR
      maxWidth = 2000,   // Higher resolution for better OCR
      imageFormat = 'png' // Always use PNG for better OCR results
    } = options;
    
    console.log("Starting PDF conversion process...");
    
    // Load the PDF file
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    
    console.log(`PDF loaded with ${numPages} pages, beginning conversion to images`);
    
    // Process each page
    const imageDataUrls: string[] = [];
    
    for (let i = 1; i <= numPages; i++) {
      console.log(`Processing page ${i} of ${numPages}`);
      const page = await pdf.getPage(i);
      
      // Set viewport with increased scale for better OCR quality
      const viewport = page.getViewport({ scale: 2.5 });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Scale down if needed, but maintain minimum scale for OCR quality
      let scale = 1;
      if (maxWidth && viewport.width > maxWidth) {
        scale = maxWidth / viewport.width;
      }
      
      const scaledViewport = page.getViewport({ scale: Math.max(scale, 1.8) }); // Ensure minimum scale
      canvas.width = scaledViewport.width;
      canvas.height = scaledViewport.height;
      
      // Render the page to the canvas with high quality
      await page.render({
        canvasContext: ctx,
        viewport: scaledViewport,
        // @ts-ignore This property exists but might not be in TypeScript definitions
        intent: 'print', // Use 'print' for higher quality rendering
      }).promise;
      
      // Apply grayscale filter if requested
      if (grayscale) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let j = 0; j < data.length; j += 4) {
          const gray = 0.299 * data[j] + 0.587 * data[j + 1] + 0.114 * data[j + 2];
          data[j] = gray;
          data[j + 1] = gray;
          data[j + 2] = gray;
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Only perform basic contrast enhancement, no sharpening
      enhanceImageForOcr(ctx, canvas);
      
      // Always use PNG format for better OCR clarity, especially for answer keys
      const dataUrl = canvas.toDataURL('image/png', quality);
      imageDataUrls.push(dataUrl);
    }
    
    console.log(`Converted ${numPages} PDF pages to images successfully`);
    return imageDataUrls;
  } catch (error) {
    console.error('Error converting PDF to images:', error);
    throw new Error(`Failed to convert PDF to images: ${error.message}`);
  }
}

/**
 * Enhance image for better OCR processing
 * Only applies contrast enhancement, no sharpening
 * @param ctx Canvas context
 * @param canvas Canvas element
 */
function enhanceImageForOcr(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
  try {
    // Only adjust contrast for better OCR, no sharpening
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Find the minimum and maximum values
    let min = 255;
    let max = 0;
    
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i]; // Grayscale, so we can just use the red channel
      if (value < min) min = value;
      if (value > max) max = value;
    }
    
    // Normalize the image for better contrast
    const range = max - min;
    if (range > 0) {
      for (let i = 0; i < data.length; i += 4) {
        for (let j = 0; j < 3; j++) {
          // Normalize and stretch contrast
          data[i + j] = Math.min(255, Math.max(0, ((data[i + j] - min) / range) * 255));
        }
      }
    }
    
    // No sharpening is applied
    
    ctx.putImageData(imageData, 0, 0);
  } catch (error) {
    console.warn('Error enhancing image:', error);
    // Continue without enhancement if there's an error
  }
}

/**
 * Apply sharpening filter to image data
 * NOTE: This function is kept for reference but is no longer used
 */
function applySharpening(imageData: ImageData, width: number, height: number): ImageData {
  const kernel = [
    -1, -1, -1,
    -1,  9, -1,
    -1, -1, -1
  ];

  const outputData = new ImageData(width, height);
  const data = imageData.data;
  const output = outputData.data;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let channel = 0; channel < 4; channel++) {
        let sum = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const pixelX = x + kx;
            const pixelY = y + ky;
            const pixelIndex = (pixelY * width + pixelX) * 4 + channel;
            const kernelIndex = (ky + 1) * 3 + (kx + 1);
            sum += data[pixelIndex] * kernel[kernelIndex];
          }
        }

        const outputIndex = (y * width + x) * 4 + channel;
        output[outputIndex] = Math.max(0, Math.min(255, sum));
      }
    }
  }
  
  return imageData; // Return the unmodified image data
}

/**
 * Convert a data URL to a Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Convert a Blob to a File
 */
export function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

/**
 * Validate a file before processing
 */
export function validateFile(file: File): { isValid: boolean; message?: string } {
  // Check file type
  if (!file.type.includes('pdf')) {
    return { isValid: false, message: 'Only PDF files are supported' };
  }
  
  // Check file size (25MB max)
  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
  const WARN_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  
  if (file.size > MAX_FILE_SIZE) {
    return { isValid: false, message: 'File size exceeds the 25MB limit' };
  }
  
  if (file.size > WARN_FILE_SIZE) {
    return { isValid: true, message: 'Large file sizes may take longer to process' };
  }
  
  return { isValid: true };
}

/**
 * Create a ZIP file from image data URLs
 */
export async function createZipFromImages(imageDataUrls: string[], JSZip: any): Promise<Blob> {
  const zip = new JSZip();
  
  for (let i = 0; i < imageDataUrls.length; i++) {
    const blob = dataUrlToBlob(imageDataUrls[i]);
    const imageFormat = imageDataUrls[i].includes('image/png') ? 'png' : 'jpg';
    zip.file(`page_${i + 1}.${imageFormat}`, blob);
  }
  
  return await zip.generateAsync({ type: 'blob' });
}
