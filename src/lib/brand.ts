export const productBrand = {
  productName: 'AssureCore',
  shortName: 'AssureCore',
  wordmarkText: 'AssureCore',
  exportPrefix: 'AssureCore',
  legalName: 'Assure Core',
  tagline: 'Own Compliance.',
  description:
    'AssureCore helps teams organise requirements, evidence, reviews, actions, competencies, assets, audit trail events, reports and evidence packs.',
  disclaimer:
    'AssureCore is an evidence repository. It does not generate legal advice, build safety templates, or certify regulatory compliance.',
  assets: {
    officialSvg: '/brand/assurecore/assurecore-lockup-light.svg',
    officialPng: '/brand/assurecore/assurecore-lockup-light.png',
    logo: '/brand/assurecore/assurecore-lockup-light.svg',
    logoDark: '/brand/assurecore/assurecore-lockup-dark.svg',
    logoMidtone: '/brand/assurecore/assurecore-lockup-dark.svg',
    logoLight: '/brand/assurecore/assurecore-lockup-light.svg',
    iconSvg: '/brand/assurecore/assurecore-icon.png',
    icon: '/brand/assurecore/assurecore-icon.png',
    iconDark: '/brand/assurecore/assurecore-icon.png',
    iconLight: '/brand/assurecore/assurecore-icon.png',
    favicon: '/brand/assurecore/assurecore-favicon.png',
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
