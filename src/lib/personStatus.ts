import type { Person } from '@/lib/types';

export type PersonOperationalStatus =
  | 'Active'
  | 'On Leave'
  | 'Temporarily Inactive'
  | 'Suspended'
  | 'Inactive'
  | 'Archived / Left Business';

export const PERSON_STATUS_OPTIONS: PersonOperationalStatus[] = [
  'Active',
  'On Leave',
  'Temporarily Inactive',
  'Suspended',
  'Inactive',
  'Archived / Left Business'
];

export const PERSON_STATUS_FILTER_OPTIONS = ['Current', 'All', ...PERSON_STATUS_OPTIONS] as const;
export type PersonStatusFilter = typeof PERSON_STATUS_FILTER_OPTIONS[number];

export const getPersonOperationalStatus = (person: Pick<Person, 'active'> & { person_status?: string | null }): PersonOperationalStatus => {
  if (person.person_status && PERSON_STATUS_OPTIONS.includes(person.person_status as PersonOperationalStatus)) {
    return person.person_status as PersonOperationalStatus;
  }
  return person.active === false ? 'Inactive' : 'Active';
};

export const isPersonOperationallyActive = (status: PersonOperationalStatus) =>
  status === 'Active' || status === 'On Leave' || status === 'Temporarily Inactive' || status === 'Suspended';

export const personStatusToActiveFlag = (status: PersonOperationalStatus) =>
  status !== 'Inactive' && status !== 'Archived / Left Business';

export const personStatusClass = (status: PersonOperationalStatus) => {
  if (status === 'Active') return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25';
  if (status === 'On Leave') return 'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/25';
  if (status === 'Temporarily Inactive') return 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30';
  if (status === 'Suspended') return 'bg-orange-500/10 text-orange-800 dark:text-orange-300 border-orange-500/30';
  if (status === 'Archived / Left Business') return 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/25';
  return 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/25';
};
