'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, X, ChevronLeft, ChevronRight, FileText, User, Calendar, Tag, Shield } from 'lucide-react';
import { RecordImageAttachment } from '@/lib/types';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

interface ImageLightboxProps {
  attachments: RecordImageAttachment[];
  initialIndex?: number;
  onClose: () => void;
  onOpenOriginal?: (attachment: RecordImageAttachment) => Promise<string> | string; // fetches signed url if needed
}

export function ImageLightbox({
  attachments,
  initialIndex = 0,
  onClose,
  onOpenOriginal
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [secureUrl, setSecureUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  useBodyScrollLock(true);

  const currentAttachment = attachments[currentIndex];

  useEffect(() => {
    if (!currentAttachment) return;
    let active = true;
    Promise.resolve().then(() => {
      if (active) {
        setIsLoading(true);
        setError('');
        setZoom(1);
      }
    });

    const loadUrl = async () => {
      try {
        if (onOpenOriginal) {
          const url = await onOpenOriginal(currentAttachment);
          if (active) setSecureUrl(url);
        } else {
          // If no custom loader, use path directly (fallback for local mocks or when path is URL)
          if (active) setSecureUrl(currentAttachment.storage_path || '');
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not fetch secure preview URL.');
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadUrl();
    return () => {
      active = false;
    };
  }, [currentIndex, currentAttachment, onOpenOriginal]);

  const handlePrev = useCallback(() => {
    if (attachments.length <= 1) return;
    setCurrentIndex((prev) => (prev === 0 ? attachments.length - 1 : prev - 1));
  }, [attachments.length]);

  const handleNext = useCallback(() => {
    if (attachments.length <= 1) return;
    setCurrentIndex((prev) => (prev === attachments.length - 1 ? 0 : prev + 1));
  }, [attachments.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrev, handleNext]);

  const formatFileSize = (bytes?: number | null) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDisplayDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDownload = () => {
    if (!secureUrl) return;
    const a = document.createElement('a');
    a.href = secureUrl;
    a.download = currentAttachment.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!currentAttachment) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] bg-black/95 flex flex-col lg:flex-row backdrop-blur-md text-slate-100"
    >
      {/* Visual Canvas Area */}
      <div className="flex-1 relative flex items-center justify-center p-4 min-h-[50vh] lg:min-h-0">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full transition-colors"
          aria-label="Close viewer"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* Next/Prev Buttons */}
        {attachments.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-4 z-40 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full transition-all"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-4 z-40 p-3 bg-black/40 hover:bg-black/60 border border-white/10 rounded-full transition-all"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </>
        )}

        {/* Image Display */}
        <div className="relative max-w-full max-h-full flex items-center justify-center overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-400">Loading secure preview...</p>
            </div>
          ) : error ? (
            <div className="text-center p-6 max-w-sm border border-rose-500/20 bg-rose-500/5 rounded-xl">
              <Shield className="w-8 h-8 text-rose-500 mx-auto mb-2" />
              <p className="text-xs text-rose-300 font-bold">{error}</p>
            </div>
          ) : (
            <img
              src={secureUrl}
              alt={currentAttachment.alt_text || currentAttachment.file_name}
              className="max-w-full max-h-[75vh] lg:max-h-[85vh] object-contain transition-transform duration-100"
              style={{ transform: `scale(${zoom})` }}
            />
          )}
        </div>

        {/* Float Zoom Control Bar */}
        {!error && !isLoading && secureUrl && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-2 border border-white/10 rounded-full text-xs">
            <button 
              onClick={() => setZoom(z => Math.max(0.5, z - 0.25))}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-white" />
            </button>
            <span className="font-mono px-2 text-[10px] text-white">
              {Math.round(zoom * 100)}%
            </span>
            <button 
              onClick={() => setZoom(z => Math.min(3, z + 0.25))}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-white" />
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button 
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-white/10 rounded-md transition-colors"
              title="Reset Zoom"
            >
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </div>

      {/* Details Side Panel */}
      <div className="w-full lg:w-[350px] bg-slate-900 border-t lg:border-t-0 lg:border-l border-white/10 flex flex-col shrink-0 overflow-y-auto">
        {/* Title / Action Header */}
        <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block">Image Attachment</span>
            <h4 className="text-sm font-extrabold text-white truncate mt-1">
              {currentAttachment.caption || currentAttachment.file_name}
            </h4>
            {currentAttachment.alt_text && (
              <p className="text-[10px] text-slate-400 mt-1 italic leading-relaxed">
                Alt: &quot;{currentAttachment.alt_text}&quot;
              </p>
            )}
          </div>
          {secureUrl && (
            <button
              onClick={handleDownload}
              className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors shrink-0"
              title="Download image"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Metadata Details */}
        <div className="p-5 space-y-4 text-xs">
          {/* Linked Record Details */}
          <div className="space-y-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Linked Record</span>
            <div className="p-3 bg-white/5 border border-white/5 rounded-lg flex items-start gap-2.5">
              <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-slate-200 capitalize block">{currentAttachment.entity_type.replace('_', ' ')} Record</strong>
                <span className="text-[10px] font-mono text-slate-400 block truncate max-w-[220px] mt-0.5">
                  ID: {currentAttachment.entity_id}
                </span>
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3 pt-2">
            {/* File Info */}
            <div className="flex items-start gap-3">
              <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 block text-[10px]">File Details</span>
                <strong className="text-slate-200 block truncate max-w-[240px]">{currentAttachment.file_name}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {currentAttachment.mime_type.split('/').pop()?.toUpperCase() || 'Unknown type'} • {formatFileSize(currentAttachment.file_size_bytes)}
                </span>
                {currentAttachment.width && currentAttachment.height && (
                  <span className="text-[10px] text-slate-400 block">
                    Dimensions: {currentAttachment.width} x {currentAttachment.height} px
                  </span>
                )}
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-3">
              <Tag className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Role / Type</span>
                <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                  {currentAttachment.image_role}
                </span>
                {currentAttachment.is_primary && (
                  <span className="inline-block ml-1.5 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                    Primary
                  </span>
                )}
              </div>
            </div>

            {/* Uploaded By */}
            <div className="flex items-center gap-3">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Uploaded By</span>
                <strong className="text-slate-200">{currentAttachment.uploaded_by || 'System Upload'}</strong>
              </div>
            </div>

            {/* Upload Date */}
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="text-slate-400 block text-[10px]">Uploaded Date</span>
                <strong className="text-slate-200">{formatDisplayDate(currentAttachment.created_at)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls inside panel if multiple items */}
        {attachments.length > 1 && (
          <div className="mt-auto p-5 border-t border-white/10 bg-black/20 text-center text-[10px] text-slate-400">
            Image {currentIndex + 1} of {attachments.length}
          </div>
        )}
      </div>
    </div>
  );
}
