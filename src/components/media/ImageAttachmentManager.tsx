'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Image as ImageIcon, Trash2, Edit2, Star, Eye, Upload, AlertCircle, RefreshCw } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';
import { ImageLightbox } from './ImageLightbox';
import { useApp } from '@/context/AppContext';

interface ImageAttachmentManagerProps {
  entityType: string;
  entityId: string;
  organisationId: string;
  mode?: 'gallery' | 'avatar';
  allowPrimary?: boolean;
  allowMultiple?: boolean;
  primaryOnly?: boolean;
  excludePrimary?: boolean;
  defaultImageRole?: string;
  forcePrimaryOnUpload?: boolean;
  preferredAspectRatio?: '1:1' | '4:3' | '16:9' | 'free';
  imageRoleOptions?: { label: string; value: string }[];
  title?: string;
  helperText?: string;
  emptyTitle?: string;
  uploadLabel?: string;
  uploadHelperText?: string;
  className?: string;
  placeholderInitials?: string;
}

export function ImageAttachmentManager({
  entityType,
  entityId,
  mode = 'gallery',
  allowPrimary = true,
  allowMultiple = true,
  primaryOnly = false,
  excludePrimary = false,
  defaultImageRole,
  forcePrimaryOnUpload = false,
  preferredAspectRatio,
  imageRoleOptions = [
    { label: 'Gallery', value: 'gallery' },
    { label: 'Primary', value: 'primary' },
    { label: 'Supporting', value: 'supporting' }
  ],
  title,
  helperText,
  emptyTitle,
  uploadLabel,
  uploadHelperText,
  className = '',
  placeholderInitials
}: ImageAttachmentManagerProps) {
  const {
    imageAttachments,
    uploadImageAttachment,
    updateImageAttachment,
    archiveImageAttachment,
    getImageAttachmentSignedUrl
  } = useApp();

  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Crop Flow
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropSrc, setCropSrc] = useState<string>('');
  const [cropRole, setCropRole] = useState('gallery');
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  // Detail edit flow
  const [editingDetailsId, setEditingDetailsId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [editRole, setEditRole] = useState('gallery');

  // Lightbox Flow
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRoleKey = imageRoleOptions.map((option) => option.value).join('|');

  // Sync with global context attachments filtered by entity type + ID
  const attachments = useMemo(() => {
    const entityAttachments = imageAttachments.filter(
      (a) => a.entity_type === entityType && a.entity_id === entityId && !a.archived_at
    );
    if (primaryOnly) return entityAttachments.filter((a) => a.is_primary);
    const visibleRoles = new Set(imageRoleKey.split('|').filter(Boolean));
    return entityAttachments.filter((a) => {
      if (excludePrimary && a.is_primary) return false;
      if (visibleRoles.size === 0) return true;
      return visibleRoles.has(a.image_role);
    });
  }, [excludePrimary, entityId, entityType, imageAttachments, imageRoleKey, primaryOnly]);

  // Load signed URLs for all non-archived attachments
  useEffect(() => {
    let active = true;
    const loadUrls = async () => {
      const urls: Record<string, string> = {};
      for (const att of attachments) {
        try {
          const url = await getImageAttachmentSignedUrl(att.id);
          urls[att.id] = url;
        } catch (err) {
          console.warn(`Could not load signed URL for ${att.id}:`, err);
        }
      }
      if (active) {
        setSignedUrls(urls);
      }
    };

    if (attachments.length > 0) {
      loadUrls();
    }
    return () => {
      active = false;
    };
  }, [attachments, getImageAttachmentSignedUrl]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    setError('');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFileForCrop(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    const files = e.target.files;
    if (files && files.length > 0) {
      processFileForCrop(files[0]);
    }
  };

  const processFileForCrop = (file: File) => {
    // Validate first before crop modal
    if (file.name.toLowerCase().endsWith('.svg')) {
      setError('SVG uploads are rejected due to security considerations.');
      return;
    }
    if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      setError('Direct HEIC/HEIF uploads are not supported. Please convert your photo to JPEG or PNG.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Image exceeds 10MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setCropFile(file);
      setCropRole(defaultImageRole || (mode === 'avatar' ? 'avatar' : 'gallery'));
    };
    reader.onerror = () => {
      setError('Could not read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = async (
    croppedBlob: Blob,
    cropData: { x: number; y: number; width: number; height: number; zoom: number; rotate: number; aspectRatio: string }
  ) => {
    if (!cropFile) return;

    setIsLoading(true);
    setError('');
    const originalName = cropFile.name;

    try {
      // Create cropped file object
      const croppedFile = new File([croppedBlob], originalName, {
        type: 'image/jpeg'
      });

      // Archive target if replacing
      if (replaceTargetId) {
        await archiveImageAttachment(replaceTargetId);
      }

      // Check if avatar role exists, then default role
      const chosenRole = replaceTargetId 
        ? (attachments.find(a => a.id === replaceTargetId)?.image_role || cropRole)
        : cropRole;

      // Determine if it should be primary
      const isPrimary = forcePrimaryOnUpload || mode === 'avatar' || !allowMultiple || chosenRole === 'primary';

      await uploadImageAttachment({
        file: croppedFile,
        entityType,
        entityId,
        imageRole: chosenRole,
        isPrimary,
        cropData
      });

      // Reset states
      setCropFile(null);
      setCropSrc('');
      setReplaceTargetId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPrimary = async (attId: string) => {
    setError('');
    try {
      const currentPrimary = attachments.find((attachment) => attachment.is_primary && attachment.id !== attId);
      if (currentPrimary) {
        await updateImageAttachment(currentPrimary.id, { is_primary: false, image_role: 'gallery' });
      }
      await updateImageAttachment(attId, { is_primary: true, image_role: 'primary' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not set primary image.');
    }
  };

  const handleArchive = async (attId: string) => {
    setError('');
    try {
      await archiveImageAttachment(attId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not archive image.');
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetailsId) return;

    setError('');
    try {
      await updateImageAttachment(editingDetailsId, {
        caption: editCaption.trim() || null,
        alt_text: editAlt.trim() || null,
        image_role: editRole
      });
      setEditingDetailsId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update details.');
    }
  };

  const triggerReplace = (attId: string) => {
    setReplaceTargetId(attId);
    fileInputRef.current?.click();
  };

  const triggerUploadClick = () => {
    setReplaceTargetId(null);
    fileInputRef.current?.click();
  };

  const activeCropAspect = preferredAspectRatio || (mode === 'avatar' ? '1:1' : '4:3');

  if (mode === 'avatar') {
    const avatar = attachments.find(a => a.image_role === 'avatar') || attachments[0];
    const hasUrl = avatar && !!signedUrls[avatar.id];

    return (
      <div className={`flex flex-col items-center justify-center space-y-3 ${className}`}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
        />

        {/* Circular Avatar Container */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerUploadClick}
          className={`group relative w-32 h-32 rounded-full overflow-hidden border-2 border-dashed flex items-center justify-center cursor-pointer transition-all ${
            dragOver 
              ? 'border-indigo-500 bg-indigo-500/10' 
              : 'border-border/80 hover:border-indigo-500/40 bg-muted/30'
          }`}
        >
          {avatar && hasUrl ? (
            <img 
              src={signedUrls[avatar.id]} 
              alt={avatar.alt_text || 'Profile avatar'} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-3xl font-extrabold text-muted-foreground tracking-wider uppercase">
              {placeholderInitials || '??'}
            </div>
          )}

          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
            <Upload className="w-5 h-5 mb-1" />
            <span>Upload Photo</span>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Controls below avatar */}
        {avatar && (
          <div className="flex gap-2 text-[10px]">
            <button
              type="button"
              onClick={() => triggerReplace(avatar.id)}
              className="px-2 py-1 bg-muted hover:bg-muted/80 border border-border text-foreground font-bold rounded"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => handleArchive(avatar.id)}
              className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold rounded"
            >
              Remove
            </button>
          </div>
        )}

        {error && (
          <span className="text-[10px] text-rose-500 text-center leading-normal max-w-[200px]">
            {error}
          </span>
        )}

        {/* Crop Modal */}
        {cropFile && cropSrc && (
          <ImageCropModal
            imageSrc={cropSrc}
            imageName={cropFile.name}
            preferredAspectRatio="1:1"
            onClose={() => {
              setCropFile(null);
              setCropSrc('');
              setReplaceTargetId(null);
            }}
            onConfirm={handleCropConfirm}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {(title || helperText) && (
        <div className="border-b border-border/80 pb-2">
          {title && <h4 className="text-xs font-black text-foreground uppercase tracking-wider font-extrabold">{title}</h4>}
          {helperText && <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{helperText}</p>}
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of existing attachments */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {attachments.map((att, idx) => {
            const hasUrl = !!signedUrls[att.id];
            return (
              <div 
                key={att.id}
                className="group relative bg-muted/40 border border-border/80 rounded-xl overflow-hidden aspect-square flex flex-col justify-between hover:shadow-md transition-all"
              >
                {/* Image or loader placeholder */}
                <div
                  className={`flex-1 relative bg-black/5 flex items-center justify-center overflow-hidden ${hasUrl ? 'cursor-zoom-in' : ''}`}
                  onClick={() => {
                    if (hasUrl) setLightboxIndex(idx);
                  }}
                  title={hasUrl ? 'View full size' : undefined}
                >
                  {hasUrl ? (
                    <img 
                      src={signedUrls[att.id]} 
                      alt={att.alt_text || att.file_name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 p-3 text-center">
                      <ImageIcon className="w-5 h-5 text-muted-foreground animate-pulse" />
                      <span className="text-[9px] text-muted-foreground">Secure link...</span>
                    </div>
                  )}

                  {/* Primary Ribbon badge */}
                  {att.is_primary && (
                    <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider flex items-center gap-0.5 shadow-sm">
                      <Star className="w-2.5 h-2.5 fill-white" />
                      Primary
                    </div>
                  )}

                  {/* Quick role badge */}
                  <div className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-md px-1.5 py-0.5 text-[8px] font-mono capitalize">
                    {att.image_role}
                  </div>

                  {/* Hover Control Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setLightboxIndex(idx);
                        }}
                        className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white"
                        title="View full size"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setEditingDetailsId(att.id);
                          setEditCaption(att.caption || '');
                          setEditAlt(att.alt_text || '');
                          setEditRole(att.image_role);
                        }}
                        className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white"
                        title="Edit details (caption/alt)"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          triggerReplace(att.id);
                        }}
                        className="p-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white"
                        title="Replace or crop new image"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-1.5">
                      {allowPrimary && !att.is_primary && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetPrimary(att.id);
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-[9px] font-bold text-white flex items-center gap-1 shadow-sm"
                          title="Use this image as the main asset photo"
                        >
                          <Star className="w-3 h-3 fill-white" /> Set Primary
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleArchive(att.id);
                        }}
                        className="p-1.5 bg-rose-600 hover:bg-rose-700 rounded-lg text-white shadow-sm"
                        title="Archive this image attachment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Caption / filename Footer if not avatar */}
                {(mode as string) !== 'avatar' && (
                  <div className="p-2 border-t border-border bg-card text-[10px] text-foreground truncate font-medium">
                    {att.caption || att.file_name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Uploader / Dropzone area */}
      {(allowMultiple || attachments.length === 0) && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerUploadClick}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
            dragOver 
              ? 'border-indigo-500 bg-indigo-500/5' 
              : 'border-border/80 hover:border-indigo-500/40 hover:bg-muted/30 bg-muted/10'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept={(mode as string) === 'avatar' ? 'image/png,image/jpeg' : 'image/*'}
            className="hidden"
          />

          <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Upload className="w-6 h-6 animate-pulse" />
          </div>

          <div>
            <h4 className="text-xs font-bold text-foreground">
              {uploadLabel || ((mode as string) === 'avatar' ? 'Upload Avatar Image' : 'Drop support images or click to browse')}
            </h4>
            <p className="text-[10px] text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
              {uploadHelperText || 'Supports JPEG, PNG, WebP, GIF up to 10MB. SVG file previewing is rejected for safety.'}
            </p>
          </div>
        </div>
      )}

      {attachments.length === 0 && emptyTitle && (
        <p className="text-[10px] text-muted-foreground text-center -mt-2">{emptyTitle}</p>
      )}

      {/* Detail Edit Modal */}
      {editingDetailsId && (
        <div className="fixed inset-0 z-[105] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <form 
            onSubmit={handleSaveDetails}
            className="bg-card border border-border rounded-xl w-full max-w-sm p-5 space-y-4 shadow-xl"
          >
            <div>
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-muted-foreground">Edit Image Details</h3>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
                File: {attachments.find(a => a.id === editingDetailsId)?.file_name}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Caption</label>
                <input
                  type="text"
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  placeholder="e.g. Front loader safety plate details"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Alt Text</label>
                <input
                  type="text"
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                  placeholder="e.g. Close-up photo showing forklift warning plate text"
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                />
              </div>

              {(mode as string) !== 'avatar' && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Image Role</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                  >
                    {imageRoleOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingDetailsId(null)}
                className="px-3.5 py-1.5 border border-border rounded-lg text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Crop Modal */}
      {cropFile && cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          imageName={cropFile.name}
          preferredAspectRatio={activeCropAspect}
          onClose={() => {
            setCropFile(null);
            setCropSrc('');
            setReplaceTargetId(null);
          }}
          onConfirm={handleCropConfirm}
        />
      )}

      {/* Lightbox Viewer */}
      {lightboxIndex !== null && (
        <ImageLightbox
          attachments={attachments}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onOpenOriginal={(att) => getImageAttachmentSignedUrl(att.id)}
        />
      )}
    </div>
  );
}
