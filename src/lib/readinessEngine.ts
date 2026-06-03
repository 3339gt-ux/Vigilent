import type {
  Action,
  CompetencyRecord,
  CompetencyType,
  EvidenceDocument,
  Person,
  Requirement,
  RequirementAction,
  RequirementCompetencyType,
  RequirementDocument,
  RequirementRiskLevel,
  RequirementStatus,
  Review
} from './types';
import { getLinkedDocumentsForRequirement } from './requirementsEngine';
import { calculateCompetencyStatus } from './competencyEngine';

export const READINESS_STATUS_POINTS: Record<RequirementStatus, number | null> = {
  GREEN: 100,
  AMBER: 50,
  RED: 0,
  GREY: null
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_DAYS = 30;

export interface ReadinessReason {
  level: RequirementStatus;
  message: string;
}

export interface RequirementReadiness {
  requirement: Requirement;
  status: RequirementStatus;
  score: number | null;
  linkedDocuments: EvidenceDocument[];
  linkedCompetencyTypes: CompetencyType[];
  competencySignals: Array<{
    competencyType: CompetencyType;
    status: RequirementStatus;
    matchingRecords: CompetencyRecord[];
    people: Person[];
    message: string;
  }>;
  latestReview: Review | null;
  openActions: Action[];
  reasons: ReadinessReason[];
}

export interface ReadinessScoreGroup {
  name: string;
  score: number | null;
  total: number;
  scored: number;
  green: number;
  amber: number;
  red: number;
  grey: number;
}

export interface ReadinessTrendPoint {
  label: string;
  score: number | null;
}

export interface ReadinessReport {
  overallScore: number | null;
  requirements: RequirementReadiness[];
  categoryScores: ReadinessScoreGroup[];
  riskScores: ReadinessScoreGroup[];
  missingEvidence: RequirementReadiness[];
  upcomingDue: RequirementReadiness[];
  overdue: RequirementReadiness[];
  openActionItems: Array<{ action: Action; requirements: Requirement[] }>;
  topRisks: RequirementReadiness[];
  readinessTrend: ReadinessTrendPoint[];
  explanation: string;
}

const daysUntil = (dateValue: string | null | undefined, today: Date): number | null => {
  if (!dateValue) return null;
  return Math.ceil((new Date(dateValue).getTime() - today.getTime()) / DAY_MS);
};

const scoreFromStatus = (status: RequirementStatus): number | null => READINESS_STATUS_POINTS[status];

const worstStatus = (statuses: RequirementStatus[]): RequirementStatus => {
  if (statuses.includes('RED')) return 'RED';
  if (statuses.includes('AMBER')) return 'AMBER';
  if (statuses.includes('GREEN')) return 'GREEN';
  return 'GREY';
};

const calculateAverageScore = (items: RequirementReadiness[]): number | null => {
  const scoredItems = items.filter(item => item.score !== null);
  if (scoredItems.length === 0) return null;
  const total = scoredItems.reduce((sum, item) => sum + (item.score || 0), 0);
  return Math.round(total / scoredItems.length);
};

const buildScoreGroup = (name: string, items: RequirementReadiness[]): ReadinessScoreGroup => ({
  name,
  score: calculateAverageScore(items),
  total: items.length,
  scored: items.filter(item => item.score !== null).length,
  green: items.filter(item => item.status === 'GREEN').length,
  amber: items.filter(item => item.status === 'AMBER').length,
  red: items.filter(item => item.status === 'RED').length,
  grey: items.filter(item => item.status === 'GREY').length
});

const groupBy = <T>(items: T[], getKey: (item: T) => string): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  items.forEach(item => {
    const key = getKey(item);
    groups.set(key, [...(groups.get(key) || []), item]);
  });
  return groups;
};

const getLatestReview = (requirementId: string, reviews: Review[]): Review | null => {
  const matchingReviews = reviews
    .filter(review => review.requirement_id === requirementId)
    .sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime());
  return matchingReviews[0] || null;
};

const getOpenActions = (
  requirementId: string,
  actions: Action[],
  requirementActions: RequirementAction[]
): Action[] => {
  const actionIds = new Set(
    requirementActions
      .filter(link => link.requirement_id === requirementId)
      .map(link => link.action_id)
  );
  return actions.filter(action => actionIds.has(action.id) && (action.status === 'Open' || action.status === 'In Progress'));
};

export const assessRequirementReadiness = (
  requirement: Requirement,
  documents: EvidenceDocument[],
  requirementDocuments: RequirementDocument[],
  reviews: Review[],
  actions: Action[],
  requirementActions: RequirementAction[],
  competencyTypes: CompetencyType[] = [],
  competencyRecords: CompetencyRecord[] = [],
  requirementCompetencyTypes: RequirementCompetencyType[] = [],
  people: Person[] = [],
  today: Date = new Date()
): RequirementReadiness => {
  const linkedDocuments = getLinkedDocumentsForRequirement(requirement.id, documents, requirementDocuments);
  const linkedCompetencyTypeIds = new Set(
    requirementCompetencyTypes
      .filter(link => link.requirement_id === requirement.id)
      .map(link => link.competency_type_id)
  );
  const linkedCompetencyTypes = competencyTypes.filter(type => linkedCompetencyTypeIds.has(type.id));
  const latestReview = getLatestReview(requirement.id, reviews);
  const openActions = getOpenActions(requirement.id, actions, requirementActions);
  const reasons: ReadinessReason[] = [];
  const statusSignals: RequirementStatus[] = [];
  const competencySignals: RequirementReadiness['competencySignals'] = [];

  if (
    requirement.status === 'GREY' &&
    !requirement.review_date &&
    !requirement.next_due_date &&
    linkedDocuments.length === 0 &&
    linkedCompetencyTypes.length === 0 &&
    openActions.length === 0
  ) {
    reasons.push({ level: 'GREY', message: 'Requirement has not been assessed yet and is excluded from scoring.' });
    return {
      requirement,
      status: 'GREY',
      score: null,
      linkedDocuments,
      linkedCompetencyTypes,
      competencySignals,
      latestReview,
      openActions,
      reasons
    };
  }

  if (linkedDocuments.length === 0) {
    statusSignals.push('RED');
    reasons.push({ level: 'RED', message: 'No evidence documents are linked to this requirement.' });
  } else {
    reasons.push({ level: 'GREEN', message: `${linkedDocuments.length} evidence document${linkedDocuments.length === 1 ? ' is' : 's are'} linked.` });
  }

  linkedDocuments.forEach(document => {
    const expiryDays = daysUntil(document.expiry_date, today);
    if (document.status === 'Expired' || (expiryDays !== null && expiryDays < 0)) {
      statusSignals.push('RED');
      reasons.push({ level: 'RED', message: `${document.title} is expired.` });
    } else if (document.status === 'Expiring Soon' || (expiryDays !== null && expiryDays <= WARNING_DAYS)) {
      statusSignals.push('AMBER');
      reasons.push({ level: 'AMBER', message: `${document.title} expires within ${WARNING_DAYS} days.` });
    }
  });

  linkedCompetencyTypes.forEach(competencyType => {
    const matchingRecords = competencyRecords.filter(record => record.competency_type_id === competencyType.id);
    const matchingPeople = people.filter(person => matchingRecords.some(record => record.person_id === person.id));

    if (matchingRecords.length === 0) {
      statusSignals.push('RED');
      const message = `Required competency "${competencyType.title}" has no records.`;
      reasons.push({ level: 'RED', message });
      competencySignals.push({ competencyType, status: 'RED', matchingRecords, people: [], message });
      return;
    }

    const expiringRecords = matchingRecords.filter(record => calculateCompetencyStatus(record, today) === 'Expiring Soon');
    const expiredOrMissingRecords = matchingRecords.filter(record => {
      const status = calculateCompetencyStatus(record, today);
      return status === 'Expired' || status === 'Missing';
    });

    if (expiredOrMissingRecords.length > 0) {
      statusSignals.push('RED');
      const personNames = matchingPeople
        .filter(person => expiredOrMissingRecords.some(record => record.person_id === person.id))
        .map(person => person.display_name)
        .slice(0, 3)
        .join(', ');
      const message = `Required competency "${competencyType.title}" is expired or missing${personNames ? ` for ${personNames}` : ''}.`;
      reasons.push({ level: 'RED', message });
      competencySignals.push({ competencyType, status: 'RED', matchingRecords, people: matchingPeople, message });
      return;
    }

    if (expiringRecords.length > 0) {
      statusSignals.push('AMBER');
      const message = `Required competency "${competencyType.title}" has records expiring soon.`;
      reasons.push({ level: 'AMBER', message });
      competencySignals.push({ competencyType, status: 'AMBER', matchingRecords, people: matchingPeople, message });
      return;
    }

    const message = `Required competency "${competencyType.title}" is currently valid.`;
    reasons.push({ level: 'GREEN', message });
    competencySignals.push({ competencyType, status: 'GREEN', matchingRecords, people: matchingPeople, message });
  });

  const dueDays = daysUntil(requirement.next_due_date, today);
  if (dueDays !== null && dueDays < 0) {
    statusSignals.push('RED');
    reasons.push({ level: 'RED', message: 'Requirement review is overdue.' });
  } else if (dueDays !== null && dueDays <= WARNING_DAYS) {
    statusSignals.push('AMBER');
    reasons.push({ level: 'AMBER', message: `Requirement review is due within ${WARNING_DAYS} days.` });
  } else if (dueDays !== null) {
    reasons.push({ level: 'GREEN', message: 'Requirement review date is not due soon.' });
  }

  openActions.forEach(action => {
    const actionDueDays = daysUntil(action.due_date, today);
    if (actionDueDays !== null && actionDueDays < 0) {
      statusSignals.push('RED');
      reasons.push({ level: 'RED', message: `Open action "${action.title}" is overdue.` });
    } else {
      statusSignals.push('AMBER');
      reasons.push({ level: 'AMBER', message: `Open action "${action.title}" remains unresolved.` });
    }
  });

  if (statusSignals.length === 0) {
    statusSignals.push('GREEN');
    reasons.push({ level: 'GREEN', message: 'Evidence, review timing and linked actions currently have no warnings.' });
  }

  const status = worstStatus(statusSignals);

  return {
    requirement,
    status,
    score: scoreFromStatus(status),
    linkedDocuments,
    linkedCompetencyTypes,
    competencySignals,
    latestReview,
    openActions,
    reasons
  };
};

export const buildReadinessReport = (input: {
  requirements: Requirement[];
  documents: EvidenceDocument[];
  requirementDocuments: RequirementDocument[];
  reviews: Review[];
  actions: Action[];
  requirementActions: RequirementAction[];
  competencyTypes?: CompetencyType[];
  competencyRecords?: CompetencyRecord[];
  requirementCompetencyTypes?: RequirementCompetencyType[];
  people?: Person[];
  today?: Date;
}): ReadinessReport => {
  const today = input.today || new Date();
  const requirementReadiness = input.requirements.map(requirement =>
    assessRequirementReadiness(
      requirement,
      input.documents,
      input.requirementDocuments,
      input.reviews,
      input.actions,
      input.requirementActions,
      input.competencyTypes || [],
      input.competencyRecords || [],
      input.requirementCompetencyTypes || [],
      input.people || [],
      today
    )
  );

  const categoryScores = Array.from(groupBy(requirementReadiness, item => item.requirement.category))
    .map(([category, items]) => buildScoreGroup(category, items))
    .sort((a, b) => a.name.localeCompare(b.name));

  const riskOrder: RequirementRiskLevel[] = ['Critical', 'High', 'Medium', 'Low'];
  const riskScores = riskOrder
    .filter(risk => requirementReadiness.some(item => item.requirement.risk_level === risk))
    .map(risk => buildScoreGroup(risk, requirementReadiness.filter(item => item.requirement.risk_level === risk)));

  const missingEvidence = requirementReadiness.filter(item => item.linkedDocuments.length === 0 && item.status !== 'GREY');
  const upcomingDue = requirementReadiness.filter(item => {
    const dueDays = daysUntil(item.requirement.next_due_date, today);
    return dueDays !== null && dueDays >= 0 && dueDays <= WARNING_DAYS;
  });
  const overdue = requirementReadiness.filter(item => {
    const dueDays = daysUntil(item.requirement.next_due_date, today);
    return dueDays !== null && dueDays < 0;
  });

  const requirementById = new Map(input.requirements.map(requirement => [requirement.id, requirement]));
  const openActionItems = input.actions
    .filter(action => action.status === 'Open' || action.status === 'In Progress')
    .map(action => {
      const linkedRequirements = input.requirementActions
        .filter(link => link.action_id === action.id)
        .map(link => requirementById.get(link.requirement_id))
        .filter((requirement): requirement is Requirement => Boolean(requirement));
      return { action, requirements: linkedRequirements };
    });

  const topRisks = [...requirementReadiness]
    .filter(item => item.status === 'RED' || item.status === 'AMBER')
    .sort((a, b) => {
      const riskWeight: Record<RequirementRiskLevel, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const statusWeight: Record<RequirementStatus, number> = { RED: 3, AMBER: 2, GREEN: 1, GREY: 0 };
      return (
        statusWeight[b.status] - statusWeight[a.status] ||
        riskWeight[b.requirement.risk_level] - riskWeight[a.requirement.risk_level] ||
        (b.reasons.length - a.reasons.length)
      );
    })
    .slice(0, 10);

  const scoredRequirements = requirementReadiness.filter(item => item.score !== null);
  const overallScore = calculateAverageScore(requirementReadiness);

  const readinessTrend: ReadinessTrendPoint[] = [
    { label: 'Previous', score: null },
    { label: 'Current', score: overallScore }
  ];

  const explanation = scoredRequirements.length === 0
    ? 'No assessed requirements are currently included in the readiness score.'
    : `Score uses ${scoredRequirements.length} assessed requirement${scoredRequirements.length === 1 ? '' : 's'}: Green=100, Amber=50, Red=0, Grey excluded.`;

  return {
    overallScore,
    requirements: requirementReadiness,
    categoryScores,
    riskScores,
    missingEvidence,
    upcomingDue,
    overdue,
    openActionItems,
    topRisks,
    readinessTrend,
    explanation
  };
};
