export const DUPLICATE_CHECKS_STORAGE_KEY = 'lumen_duplicate_checks_enabled';

export const getDuplicateChecksEnabled = () => {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(DUPLICATE_CHECKS_STORAGE_KEY) !== 'false';
};

export const setDuplicateChecksEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(DUPLICATE_CHECKS_STORAGE_KEY, enabled ? 'true' : 'false');
  window.dispatchEvent(new CustomEvent('lumen-duplicate-checks-updated', { detail: { enabled } }));
};
