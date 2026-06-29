export const productBrand = {
  productName: 'Overview360',
  shortName: 'Overview360',
  wordmarkText: 'OVERVIEW 360',
  exportPrefix: 'Overview360',
  legalName: 'Overview360',
  description: 'Overview360 helps teams organise evidence, actions, requirements and audit readiness records.',
  disclaimer:
    'Overview360 is an evidence repository. It does not generate legal advice, build safety templates, or certify regulatory compliance.',
  assets: {
    logoDark: '/brand/overview360/overview360-logo-dark.png',
    logoMidtone: '/brand/overview360/overview360-logo-midtone.png',
    logoLight: '/brand/overview360/overview360-logo-light.png',
    icon: '/brand/overview360/overview360-icon.png',
    iconDark: '/brand/overview360/overview360-icon-dark.png',
    iconLight: '/brand/overview360/overview360-icon-light.png',
    favicon: '/brand/overview360/overview360-favicon.png',
  },
} as const;

export type BrandAppearance = 'dark' | 'light' | 'midtone' | 'auto';

export function getBrandLogoPath(variant: BrandAppearance = 'auto', iconOnly = false) {
  if (iconOnly) {
    if (variant === 'light') return productBrand.assets.iconLight;
    if (variant === 'dark' || variant === 'midtone') return productBrand.assets.iconDark;
    return productBrand.assets.icon;
  }

  if (variant === 'light') return productBrand.assets.logoLight;
  if (variant === 'midtone') return productBrand.assets.logoMidtone;
  return productBrand.assets.logoDark;
}
