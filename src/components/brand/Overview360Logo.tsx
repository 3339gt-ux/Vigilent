'use client';

import Image from 'next/image';
import { productBrand, type BrandAppearance } from '@/lib/brand';

type LogoMode = 'official' | 'compact' | 'icon';
type LegacyVariant = LogoMode | BrandAppearance;
type LogoSize = 'sm' | 'md' | 'lg';

type Overview360LogoProps = {
  variant?: LegacyVariant;
  tone?: BrandAppearance;
  size?: LogoSize;
  height?: number;
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
};

const ICON_ASPECT_RATIO = 589 / 392;
const LOCKUP_ASPECT_RATIO = 875 / 678;

const sizeHeights: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 44,
};

function isTone(value: LegacyVariant | undefined): value is BrandAppearance {
  return value === 'dark' || value === 'light' || value === 'midtone' || value === 'auto';
}

function isMode(value: LegacyVariant | undefined): value is LogoMode {
  return value === 'official' || value === 'compact' || value === 'icon';
}

function getToneTextClass(tone: BrandAppearance) {
  if (tone === 'light') return 'text-slate-950';
  if (tone === 'dark') return 'text-white';
  if (tone === 'midtone') return 'text-slate-50';
  return 'text-foreground';
}

function getOfficialWrapperClass(tone: BrandAppearance) {
  if (tone === 'dark') {
    return 'rounded-2xl border border-white/12 bg-white/96 px-4 py-3 shadow-lg shadow-black/25';
  }
  if (tone === 'midtone') {
    return 'rounded-2xl border border-white/20 bg-white/94 px-4 py-3 shadow-md shadow-black/15';
  }
  return '';
}

export default function Overview360Logo({
  variant = 'compact',
  tone,
  size = 'md',
  height,
  iconOnly = false,
  className = '',
  priority = false,
}: Overview360LogoProps) {
  const resolvedTone: BrandAppearance = tone ?? (isTone(variant) ? variant : 'auto');
  const resolvedMode: LogoMode = iconOnly ? 'icon' : isMode(variant) ? variant : 'compact';
  const resolvedHeight = height ?? sizeHeights[size];

  if (resolvedMode === 'official') {
    const wrapperClass = getOfficialWrapperClass(resolvedTone);
    const imageHeight = Math.max(resolvedHeight, 42);
    const imageWidth = Math.round(imageHeight * LOCKUP_ASPECT_RATIO);

    return (
      <div className={`inline-flex items-center ${className}`.trim()}>
        <div className={wrapperClass}>
          <Image
            src={productBrand.assets.logo}
            alt={productBrand.productName}
            width={imageWidth}
            height={imageHeight}
            priority={priority}
            className="h-auto w-auto max-w-full object-contain"
          />
        </div>
      </div>
    );
  }

  const iconHeight = resolvedMode === 'icon' ? resolvedHeight : Math.max(22, Math.round(resolvedHeight * 0.95));
  const iconWidth = Math.round(iconHeight * ICON_ASPECT_RATIO);
  const iconSrc =
    resolvedTone === 'light'
      ? productBrand.assets.iconLight
      : resolvedTone === 'dark' || resolvedTone === 'midtone'
        ? productBrand.assets.iconDark
        : productBrand.assets.icon;

  if (resolvedMode === 'icon') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`.trim()}>
        <Image
          src={iconSrc}
          alt={productBrand.productName}
          width={iconWidth}
          height={iconHeight}
          priority={priority}
          className="h-auto w-auto object-contain"
        />
      </span>
    );
  }

  const textClass = getToneTextClass(resolvedTone);
  const textSizeClass =
    resolvedHeight >= 34 ? 'text-[1.3rem]' : resolvedHeight >= 28 ? 'text-[1.1rem]' : 'text-base';

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`.trim()}>
      <Image
        src={iconSrc}
        alt=""
        aria-hidden="true"
        width={iconWidth}
        height={iconHeight}
        priority={priority}
        className="h-auto w-auto shrink-0 object-contain"
      />
      <span className={`leading-none ${textSizeClass} ${textClass} font-extrabold tracking-tight`}>
        {productBrand.productName}
      </span>
    </span>
  );
}
