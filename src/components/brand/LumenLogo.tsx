'use client';

import Image from 'next/image';
import React from 'react';
import { getBrandLogoPath, productBrand, type BrandAppearance } from '@/lib/brand';

interface LumenLogoProps {
  variant?: BrandAppearance;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  height?: number;
}

export default function LumenLogo({
  variant = 'auto',
  iconOnly = false,
  size = 'md',
  className = '',
  height
}: LumenLogoProps) {
  const heightMap = {
    sm: 24,
    md: 36,
    lg: 48,
    xl: 64
  };

  const currentHeight = height || heightMap[size];
  const iconWidth = Math.round(currentHeight * 1.5);
  const currentWidth = iconOnly ? iconWidth : Math.round(currentHeight * 5.4);
  const src = getBrandLogoPath(variant, true);
  const textColor =
    variant === 'light' ? '#0f172a' :
    variant === 'midtone' ? '#e6fffb' :
    '#ffffff';

  return (
    <span
      className={`inline-flex items-center gap-2 select-none ${className}`}
      style={{ height: currentHeight, width: currentWidth }}
      aria-label={productBrand.productName}
    >
      <Image
        src={src}
        alt={`${productBrand.productName} icon`}
        width={iconWidth * 4}
        height={currentHeight * 4}
        className="h-full shrink-0 object-contain"
        style={{ width: iconWidth }}
        priority={currentHeight >= 48}
      />
      {!iconOnly && (
        <span
          className="truncate font-black leading-none"
          style={{
            color: variant === 'auto' ? 'currentColor' : textColor,
            fontSize: Math.max(14, Math.round(currentHeight * 0.5)),
          }}
        >
          {productBrand.productName}
        </span>
      )}
    </span>
  );
}
