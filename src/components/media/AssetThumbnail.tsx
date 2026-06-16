'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Image as ImageIcon } from 'lucide-react';

interface AssetThumbnailProps {
  assetId: string;
  className?: string;
  onClick?: () => void;
  aspectRatio?: '4:3' | '16:9' | 'square';
}

export function AssetThumbnail({ assetId, className = '', onClick, aspectRatio = '4:3' }: AssetThumbnailProps) {
  const { imageAttachments, getImageAttachmentSignedUrl } = useApp();
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const primaryAttachment = imageAttachments.find(
    a => a.entity_type === 'asset' && a.entity_id === assetId && a.is_primary && !a.archived_at
  ) || imageAttachments.find(
    a => a.entity_type === 'asset' && a.entity_id === assetId && !a.archived_at
  );

  useEffect(() => {
    let active = true;
    if (!primaryAttachment) {
      Promise.resolve().then(() => {
        if (active) setImageUrl('');
      });
      return;
    }
    
    const loadUrl = async () => {
      setLoading(true);
      try {
        const url = await getImageAttachmentSignedUrl(primaryAttachment.id);
        if (active) setImageUrl(url);
      } catch (err) {
        console.warn('Could not load asset thumbnail signed url', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadUrl();
    return () => {
      active = false;
    };
  }, [primaryAttachment, getImageAttachmentSignedUrl]);

  const aspectClasses = {
    '4:3': 'aspect-[4/3]',
    '16:9': 'aspect-video',
    'square': 'aspect-square'
  };

  return (
    <div 
      onClick={onClick}
      className={`relative rounded-xl overflow-hidden flex items-center justify-center shrink-0 bg-muted border border-border select-none ${aspectClasses[aspectRatio]} ${onClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''} ${className}`}
    >
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt="Asset photo" className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center justify-center text-muted-foreground/60 gap-1 p-4">
          <ImageIcon className="w-5 h-5 stroke-[1.5]" />
          <span className="text-[9px] font-bold tracking-wider uppercase">No Photo</span>
        </div>
      )}
    </div>
  );
}
