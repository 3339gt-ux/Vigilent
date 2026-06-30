'use client';

import Image from 'next/image';
import { productBrand, type BrandAppearance } from '@/lib/brand';

type LogoMode = 'official' | 'compact' | 'icon';
type LegacyVariant = LogoMode | BrandAppearance;
type LogoSize = 'sm' | 'md' | 'lg';

type AssureCoreLogoProps = {
  variant?: LegacyVariant;
  tone?: BrandAppearance;
  size?: LogoSize;
  height?: number;
  iconOnly?: boolean;
  className?: string;
  priority?: boolean;
};

const ICON_ASPECT_RATIO = 1;
const LOCKUP_ASPECT_RATIO = 2172 / 724;

const sizeHeights: Record<LogoSize, number> = {
  sm: 24,
  md: 32,
  lg: 48,
};

function isTone(value: LegacyVariant | undefined): value is BrandAppearance {
  return value === 'dark' || value === 'light' || value === 'midtone' || value === 'auto';
}

function isMode(value: LegacyVariant | undefined): value is LogoMode {
  return value === 'official' || value === 'compact' || value === 'icon';
}

function getToneTextClass(tone: BrandAppearance) {
  if (tone === 'light') return 'text-slate-950';
  if (tone === 'dark' || tone === 'midtone') return 'text-white';
  return 'text-foreground';
}

function getLockupSource(tone: BrandAppearance) {
  if (tone === 'light') return productBrand.assets.logoLight;
  if (tone === 'dark' || tone === 'midtone') return productBrand.assets.logoDark;
  return productBrand.assets.logo;
}

export default function AssureCoreLogo({
  variant = 'compact',
  tone,
  size = 'md',
  height,
  iconOnly = false,
  className = '',
  priority = false,
}: AssureCoreLogoProps) {
  const resolvedTone: BrandAppearance = tone ?? (isTone(variant) ? variant : 'auto');
  const resolvedMode: LogoMode = iconOnly ? 'icon' : isMode(variant) ? variant : 'compact';
  const resolvedHeight = height ?? sizeHeights[size];

  if (resolvedMode === 'official') {
    const imageHeight = Math.max(resolvedHeight, 48);
    const imageWidth = Math.round(imageHeight * LOCKUP_ASPECT_RATIO);

    return (
      <span className={`inline-flex items-center ${className}`.trim()}>
        <Image
          src={getLockupSource(resolvedTone)}
          alt={`${productBrand.productName} - ${productBrand.tagline}`}
          width={imageWidth}
          height={imageHeight}
          priority={priority}
          className="h-auto w-auto max-w-full object-contain"
        />
      </span>
    );
  }

  const iconHeight = resolvedMode === 'icon' ? resolvedHeight : Math.max(22, Math.round(resolvedHeight * 0.95));
  const iconWidth = Math.round(iconHeight * ICON_ASPECT_RATIO);

  if (resolvedMode === 'icon') {
    return (
      <span className={`inline-flex items-center justify-center ${className}`.trim()}>
        <Image
          src={productBrand.assets.icon}
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
        src={productBrand.assets.icon}
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
