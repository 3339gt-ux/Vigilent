import type {
  CompetencyRecord,
  CompetencyStatus,
  CompetencyType,
  Person
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
export const COMPETENCY_WARNING_DAYS = 30;

export interface CompetencyMatrixCell {
  person: Person;
  competencyType: CompetencyType;
  record: CompetencyRecord | null;
  status: CompetencyStatus;
  explanation: string;
}

export interface CompetencySummary {
  totalRequired: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  missing: number;
  notRequired: number;
  compliancePercent: number;
  upcomingRenewals: CompetencyMatrixCell[];
  gaps: CompetencyMatrixCell[];
}

const daysUntil = (value: string | null | undefined, today: Date) => {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - today.getTime()) / DAY_MS);
};

export const calculateCompetencyStatus = (
  record: Pick<CompetencyRecord, 'completed_date' | 'expiry_date' | 'status'> | null,
  today: Date = new Date()
): CompetencyStatus => {
  if (!record) return 'Missing';
  if (record.status === 'Not Required') return 'Not Required';
  if (!record.completed_date && !record.expiry_date) return 'Missing';

  const remaining = daysUntil(record.expiry_date, today);
  if (remaining !== null && remaining < 0) return 'Expired';
  if (remaining !== null && remaining <= COMPETENCY_WARNING_DAYS) return 'Expiring Soon';
  return 'Valid';
};

export const getCompetencyExplanation = (
  person: Person,
  competencyType: CompetencyType,
  record: CompetencyRecord | null,
  status: CompetencyStatus
) => {
  if (status === 'Not Required') return `${competencyType.title} is not required for ${person.display_name}.`;
  if (!record) return `${competencyType.title} competency is missing for ${person.display_name}.`;
  if (status === 'Expired') return `${competencyType.title} competency expired for ${person.display_name}.`;
  if (status === 'Expiring Soon') return `${competencyType.title} competency expires soon for ${person.display_name}.`;
  if (record.expiry_date) return `${competencyType.title} competency valid until ${record.expiry_date} for ${person.display_name}.`;
  return `${competencyType.title} competency is valid for ${person.display_name}.`;
};

export const buildCompetencyMatrix = (
  people: Person[],
  competencyTypes: CompetencyType[],
  records: CompetencyRecord[],
  today: Date = new Date()
): CompetencyMatrixCell[] => {
  const activePeople = people.filter(person => person.active);
  const activeTypes = competencyTypes.filter(type => type.active);

  // Group records by person_id and competency_type_id to optimize lookup from O(R) to O(1)
  const recordMap = new Map<string, CompetencyRecord[]>();
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const key = `${record.person_id}_${record.competency_type_id}`;
    if (!recordMap.has(key)) {
      recordMap.set(key, []);
    }
    recordMap.get(key)!.push(record);
  }

  // Pre-sort each grouped list
  for (const list of recordMap.values()) {
    list.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  }

  return activePeople.flatMap(person =>
    activeTypes.map(competencyType => {
      const key = `${person.id}_${competencyType.id}`;
      const personRecords = recordMap.get(key) || [];
      const record = personRecords[0] || null;
      const status = calculateCompetencyStatus(record, today);
      return {
        person,
        competencyType,
        record,
        status,
        explanation: getCompetencyExplanation(person, competencyType, record, status)
      };
    })
  );
};

export const buildCompetencySummary = (
  people: Person[],
  competencyTypes: CompetencyType[],
  records: CompetencyRecord[],
  today: Date = new Date()
): CompetencySummary => {
  const cells = buildCompetencyMatrix(people, competencyTypes, records, today);
  const assessed = cells.filter(cell => cell.status !== 'Not Required');
  const valid = cells.filter(cell => cell.status === 'Valid').length;
  const expiringSoon = cells.filter(cell => cell.status === 'Expiring Soon').length;
  const expired = cells.filter(cell => cell.status === 'Expired').length;
  const missing = cells.filter(cell => cell.status === 'Missing').length;
  const notRequired = cells.filter(cell => cell.status === 'Not Required').length;
  const compliancePercent = assessed.length === 0 ? 0 : Math.round(((valid + expiringSoon * 0.5) / assessed.length) * 100);

  return {
    totalRequired: assessed.length,
    valid,
    expiringSoon,
    expired,
    missing,
    notRequired,
    compliancePercent,
    upcomingRenewals: cells
      .filter(cell => cell.status === 'Expiring Soon')
      .slice(0, 10),
    gaps: cells
      .filter(cell => cell.status === 'Expired' || cell.status === 'Missing')
      .slice(0, 10)
  };
};
