export const ACCEPTED_IMAGE_FORMATS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  bmp: 'image/bmp'
};

export const imageAcceptAttribute = Object.entries(ACCEPTED_IMAGE_FORMATS)
  .map(([ext, mime]) => `.${ext},${mime}`)
  .join(',');

export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB default

export const getFileExtension = (filename: string): string => {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
};

export const validateImageFile = (file: File): void => {
  const extension = getFileExtension(file.name);
  
  if (extension === 'svg') {
    throw new Error('SVG uploads are rejected due to security considerations. Please upload standard image files (PNG, JPEG, WebP).');
  }

  if (extension === 'heic' || extension === 'heif') {
    throw new Error('Direct HEIC/HEIF uploads are not supported. Please convert your photo to JPEG or PNG before uploading.');
  }

  const expectedMime = ACCEPTED_IMAGE_FORMATS[extension];

  if (!expectedMime) {
    throw new Error(
      `Unsupported file format. Please upload standard images only (JPEG, PNG, WebP, GIF, BMP).`
    );
  }

  // Check MIME type mapping
  if (file.type && file.type !== expectedMime) {
    // Some browsers might not report avif or webp correctly depending on system support, so we warn but only hard block for mismatched known mimes
    if (file.type.startsWith('image/svg') || file.type === 'image/svg+xml') {
      throw new Error('SVG uploads are rejected due to security considerations.');
    }
  }

  if (file.size <= 0) {
    throw new Error('Selected image file is empty.');
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error(`Image is too large. Maximum size allowed is 10 MB.`);
  }
};

/**
 * Helper to get image dimensions (width, height) using browser Image loader.
 */
export const getImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ width: 0, height: 0 }); // Fallback
    };
    img.src = objectUrl;
  });
};
