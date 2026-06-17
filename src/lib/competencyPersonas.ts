import type {
  CompetencyPersona,
  CompetencyPersonaItem,
  CompetencyPersonaRequirementLevel,
  CompetencyRecord,
  CompetencyStatus,
  CompetencyType,
  Person,
  PersonCompetencyOverride,
  PersonCompetencyPersona
} from './types';
import { calculateCompetencyStatus } from './competencyEngine';

export const PERSONA_REQUIREMENT_LEVELS: CompetencyPersonaRequirementLevel[] = ['required', 'optional', 'conditional'];

const requirementWeight: Record<CompetencyPersonaRequirementLevel, number> = {
  required: 3,
  conditional: 2,
  optional: 1
};

export type PersonaGapStatus =
  | 'valid'
  | 'due_soon'
  | 'expired'
  | 'missing_required'
  | 'optional_missing'
  | 'conditional_missing'
  | 'suppressed'
  | 'manual_only';

export interface PersonCompetencyExpectation {
  competencyType: CompetencyType;
  record: CompetencyRecord | null;
  personas: CompetencyPersona[];
  personaItems: CompetencyPersonaItem[];
  requirementLevel: CompetencyPersonaRequirementLevel | null;
  source: 'persona' | 'manual' | 'persona+manual';
  status: CompetencyStatus;
  gapStatus: PersonaGapStatus;
  isExpected: boolean;
  isSuppressed: boolean;
  overrideReason: string | null;
  explanation: string;
}

const selectRequirementLevel = (
  current: CompetencyPersonaRequirementLevel | null,
  next: CompetencyPersonaRequirementLevel
) => {
  if (!current) return next;
  return requirementWeight[next] > requirementWeight[current] ? next : current;
};

export const buildPersonCompetencyExpectations = (
  person: Person,
  competencyTypes: CompetencyType[],
  competencyRecords: CompetencyRecord[],
  personas: CompetencyPersona[],
  personaItems: CompetencyPersonaItem[],
  personPersonas: PersonCompetencyPersona[],
  overrides: PersonCompetencyOverride[],
  today: Date = new Date()
): PersonCompetencyExpectation[] => {
  const assignedPersonas = personPersonas
    .filter(assignment => assignment.person_id === person.id && assignment.status === 'active')
    .map(assignment => personas.find(persona => persona.id === assignment.persona_id && persona.status === 'active'))
    .filter((persona): persona is CompetencyPersona => Boolean(persona));

  const assignedPersonaIds = new Set(assignedPersonas.map(persona => persona.id));
  const personaItemsByType = new Map<string, CompetencyPersonaItem[]>();
  personaItems
    .filter(item => assignedPersonaIds.has(item.persona_id))
    .forEach(item => {
      const existing = personaItemsByType.get(item.competency_type_id);
      if (existing) existing.push(item);
      else personaItemsByType.set(item.competency_type_id, [item]);
    });

  const latestRecordsByType = new Map<string, CompetencyRecord>();
  competencyRecords
    .filter(record => record.person_id === person.id)
    .forEach(record => {
      const current = latestRecordsByType.get(record.competency_type_id);
      if (!current || new Date(record.updated_at || record.created_at).getTime() > new Date(current.updated_at || current.created_at).getTime()) {
        latestRecordsByType.set(record.competency_type_id, record);
      }
    });

  const activeOverrides = overrides.filter(
    override => override.person_id === person.id && override.active
  );
  const overridesByType = new Map<string, PersonCompetencyOverride[]>();
  activeOverrides.forEach(override => {
    const existing = overridesByType.get(override.competency_type_id);
    if (existing) existing.push(override);
    else overridesByType.set(override.competency_type_id, [override]);
  });

  const relevantTypeIds = new Set<string>([
    ...Array.from(personaItemsByType.keys()),
    ...Array.from(latestRecordsByType.keys())
  ]);

  const results = competencyTypes
    .filter(type => relevantTypeIds.has(type.id) || type.active)
    .map(type => {
      const record = latestRecordsByType.get(type.id) || null;
      const itemsForType = (personaItemsByType.get(type.id) || []).sort((a, b) => a.sort_order - b.sort_order);
      const typePersonas = itemsForType
        .map(item => assignedPersonas.find(persona => persona.id === item.persona_id))
        .filter((persona): persona is CompetencyPersona => Boolean(persona));
      const requirementLevel = itemsForType.reduce<CompetencyPersonaRequirementLevel | null>(
        (level, item) => selectRequirementLevel(level, item.requirement_level),
        null
      );
      const typeOverrides = overridesByType.get(type.id) || [];
      const suppressingOverride = typeOverrides.find(
        override => override.override_type === 'suppressed' || override.override_type === 'not_applicable'
      );
      const isExpected = itemsForType.length > 0;
      const isSuppressed = Boolean(suppressingOverride);
      const recordStatus = calculateCompetencyStatus(record, today, type.warning_days);

      let source: PersonCompetencyExpectation['source'] = 'manual';
      if (isExpected && record) source = 'persona+manual';
      else if (isExpected) source = 'persona';

      let gapStatus: PersonaGapStatus = 'manual_only';
      let status: CompetencyStatus = recordStatus;
      let explanation = `${type.title} is manually tracked for ${person.display_name}.`;

      if (isSuppressed) {
        gapStatus = 'suppressed';
        status = 'Not Required';
        explanation = suppressingOverride?.reason?.trim()
          ? `${type.title} is suppressed for ${person.display_name}: ${suppressingOverride.reason.trim()}`
          : `${type.title} is suppressed for ${person.display_name}.`;
      } else if (isExpected && !record) {
        if (requirementLevel === 'required') {
          gapStatus = 'missing_required';
          status = 'Missing';
          explanation = `${type.title} is required by persona and missing for ${person.display_name}.`;
        } else if (requirementLevel === 'conditional') {
          gapStatus = 'conditional_missing';
          status = 'Missing';
          explanation = `${type.title} is conditionally expected by persona and has not been provided for ${person.display_name}.`;
        } else {
          gapStatus = 'optional_missing';
          status = 'Not Required';
          explanation = `${type.title} is optional for ${person.display_name} and has not been provided yet.`;
        }
      } else if (isExpected && record) {
        if (recordStatus === 'Expired') {
          gapStatus = 'expired';
          explanation = `${type.title} is expected by persona and expired for ${person.display_name}.`;
        } else if (recordStatus === 'Expiring Soon') {
          gapStatus = 'due_soon';
          explanation = `${type.title} is expected by persona and due soon for ${person.display_name}.`;
        } else {
          gapStatus = 'valid';
          explanation = record?.expiry_date
            ? `${type.title} is expected by persona and valid until ${record.expiry_date} for ${person.display_name}.`
            : `${type.title} is expected by persona and currently valid for ${person.display_name}.`;
        }
      } else if (record) {
        if (recordStatus === 'Expired') {
          gapStatus = 'expired';
          explanation = `${type.title} is manually added and expired for ${person.display_name}.`;
        } else if (recordStatus === 'Expiring Soon') {
          gapStatus = 'due_soon';
          explanation = `${type.title} is manually added and due soon for ${person.display_name}.`;
        } else {
          gapStatus = 'manual_only';
          explanation = `${type.title} is manually added for ${person.display_name}.`;
        }
      }

      return {
        competencyType: type,
        record,
        personas: typePersonas,
        personaItems: itemsForType,
        requirementLevel,
        source,
        status,
        gapStatus,
        isExpected,
        isSuppressed,
        overrideReason: suppressingOverride?.reason || null,
        explanation
      };
    })
    .filter(item => item.isExpected || item.record);

  return results.sort((a, b) => {
    const weightA = a.requirementLevel ? requirementWeight[a.requirementLevel] : 0;
    const weightB = b.requirementLevel ? requirementWeight[b.requirementLevel] : 0;
    if (weightA !== weightB) return weightB - weightA;
    return a.competencyType.title.localeCompare(b.competencyType.title);
  });
};
