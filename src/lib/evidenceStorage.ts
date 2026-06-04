import { maxEvidenceUploadBytes } from './env';

export const ACCEPTED_EVIDENCE_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg'
};

export const evidenceAcceptAttribute = Object.entries(ACCEPTED_EVIDENCE_TYPES)
  .map(([extension, mime]) => `.${extension},${mime}`)
  .join(',');

export const formatMaxEvidenceUploadSize = (): string =>
  `${(maxEvidenceUploadBytes / 1024 / 1024).toFixed(0)} MB`;

export const getFileExtension = (filename: string): string => {
  const match = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
};

export const sanitizeEvidenceFilename = (filename: string): string => {
  const extension = getFileExtension(filename);
  const baseName = filename
    .replace(/\.[^/.]+$/, '')
    .normalize('NFKD')
    .replace(/[^\w\s.-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();

  const safeBaseName = baseName || 'evidence-document';
  return extension ? `${safeBaseName}.${extension}` : safeBaseName;
};

export const buildEvidenceStoragePath = (
  organizationId: string,
  documentId: string,
  safeFilename: string
): string =>
  `organisations/${organizationId}/documents/${documentId}/${safeFilename}`;

export const validateEvidenceFile = (file: File): void => {
  const extension = getFileExtension(file.name);
  const expectedMime = ACCEPTED_EVIDENCE_TYPES[extension];

  if (!expectedMime) {
    throw new Error('Unsupported file type. Upload PDF, DOCX, XLSX, PNG, JPG, or JPEG files only.');
  }

  if (file.type !== expectedMime) {
    throw new Error(
      `File MIME type does not match its extension. Expected ${expectedMime}, received ${file.type || 'unknown'}.`
    );
  }

  if (file.size <= 0) {
    throw new Error('Selected file is empty.');
  }

  if (file.size > maxEvidenceUploadBytes) {
    throw new Error(`File is too large. Maximum upload size is ${formatMaxEvidenceUploadSize()}.`);
  }
};

export const calculateEvidenceFileHash = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
};
