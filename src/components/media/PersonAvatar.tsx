'use client';

import React, { useEffect, useState } from 'react';
import { useApp } from '@/context/AppContext';

interface PersonAvatarProps {
  personId: string;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PersonAvatar({ personId, displayName, size = 'sm', className = '' }: PersonAvatarProps) {
  const { imageAttachments, getImageAttachmentSignedUrl } = useApp();
  const [avatarUrl, setAvatarUrl] = useState<string>('');

  const avatar = imageAttachments.find(
    a => a.entity_type === 'person' && a.entity_id === personId && a.image_role === 'avatar' && !a.archived_at
  );

  useEffect(() => {
    if (!avatar) {
      setAvatarUrl('');
      return;
    }
    
    let active = true;
    const loadUrl = async () => {
      try {
        const url = await getImageAttachmentSignedUrl(avatar.id);
        if (active) setAvatarUrl(url);
      } catch (err) {
        console.warn('Could not load avatar signed url', err);
      }
    };
    loadUrl();
    return () => {
      active = false;
    };
  }, [avatar, getImageAttachmentSignedUrl]);

  const initials = (() => {
    if (!displayName) return '?';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  })();

  const sizeClasses = {
    sm: 'w-7 h-7 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-16 h-16 text-xl'
  };

  return (
    <div className={`rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-muted border border-border select-none ${sizeClasses[size]} ${className}`}>
      {avatarUrl ? (
        <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
      ) : (
        <span className="font-extrabold text-muted-foreground">{initials}</span>
      )}
    </div>
  );
}
