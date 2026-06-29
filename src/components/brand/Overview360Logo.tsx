'use client';

import React from 'react';
import { productBrand, type BrandAppearance } from '@/lib/brand';

interface Overview360LogoProps {
  variant?: BrandAppearance;
  iconOnly?: boolean;
  mode?: 'icon' | 'compact' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  height?: number;
}

const sizeToHeight = {
  sm: 24,
  md: 32,
  lg: 44,
  xl: 60
};

function resolveTextColor(variant: BrandAppearance) {
  if (variant === 'light') return '#0f172a';
  if (variant === 'midtone') return '#ecfeff';
  if (variant === 'dark') return '#ffffff';
  return 'currentColor';
}

function Overview360Mark({ height, className = '' }: { height: number; className?: string }) {
  const id = React.useId();
  const ringId = `${id}-overview360-ring`;
  const checkId = `${id}-overview360-check`;
  const width = Math.round(height * 1.5);

  return (
    <svg
      className={`shrink-0 ${className}`}
      width={width}
      height={height}
      viewBox="0 0 96 64"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={ringId} x1="12" y1="50" x2="60" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1D4ED8" />
          <stop offset="0.56" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id={checkId} x1="40" y1="48" x2="86" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2563EB" />
          <stop offset="0.52" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#38BDF8" />
        </linearGradient>
      </defs>
      <path
        d="M53.7 47.5A22.5 22.5 0 1 1 58.5 20"
        fill="none"
        stroke={`url(#${ringId})`}
        strokeWidth="10.5"
        strokeLinecap="round"
      />
      <path
        d="M39.5 33.2 54.2 48 84.5 11.5"
        fill="none"
        stroke={`url(#${checkId})`}
        strokeWidth="10.5"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

export default function Overview360Logo({
  variant = 'auto',
  iconOnly = false,
  mode,
  size = 'md',
  className = '',
  height
}: Overview360LogoProps) {
  const currentHeight = height || sizeToHeight[size];
  const resolvedMode = mode || (iconOnly ? 'icon' : 'compact');
  const textColor = resolveTextColor(variant);
  const fontSize = Math.min(24, Math.max(16, Math.round(currentHeight * 0.56)));
  const showText = resolvedMode !== 'icon';

  return (
    <span
      className={`inline-flex items-center gap-2.5 select-none align-middle ${className}`}
      style={{ minHeight: currentHeight }}
      aria-label={productBrand.productName}
    >
      <Overview360Mark height={currentHeight} />
      {showText && (
        <span
          className="whitespace-nowrap leading-none tracking-tight"
          style={{
            color: textColor,
            fontSize,
            fontWeight: resolvedMode === 'full' ? 800 : 750
          }}
        >
          {productBrand.productName}
        </span>
      )}
    </span>
  );
}
