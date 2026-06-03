import type {
  Action,
  CompetencyRecord,
  EvidenceDocument,
  Requirement,
  RequirementDocument,
  RequirementEvidenceCoverage,
  RequirementEvidenceCriterion,
  RequirementEvidenceCriterionMatch
} from './types';
import { calculateCompetencyStatus } from './competencyEngine';
import { getLinkedDocumentsForRequirement } from './requirementsEngine';

const DAY_MS = 24 * 60 * 60 * 1000;
export const EVIDENCE_CRITERIA_WARNING_DAYS = 30;

const daysUntil = (value: string | null | undefined, today: Date) => {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - today.getTime()) / DAY_MS);
};

const bestDocumentCoverageDate = (document: EvidenceDocument): string | null => {
  return document.expiry_date || document.review_date || document.training_date || document.calibration_date || null;
};

const latestDate = (dates: Array<string | null | undefined>): string | null => {
  const validDates = dates.filter((date): date is string => Boolean(date));
  if (validDates.length === 0) return null;
  return validDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
};

export const buildRequirementEvidenceCoverage = (input: {
  requirement: Requirement;
  documents: EvidenceDocument[];
  requirementDocuments: RequirementDocument[];
  criteria: RequirementEvidenceCriterion[];
  criterionMatches: RequirementEvidenceCriterionMatch[];
  competencyRecords?: CompetencyRecord[];
  actions?: Action[];
  today?: Date;
}): RequirementEvidenceCoverage => {
  const today = input.today || new Date();
  const requirementCriteria = input.criteria.filter(criterion => criterion.requirement_id === input.requirement.id);
  const legacyLinkedDocuments = getLinkedDocumentsForRequirement(input.requirement.id, input.documents, input.requirementDocuments);

  if (requirementCriteria.length === 0) {
    return {
      requirement_id: input.requirement.id,
      status: 'Not Assessed',
      coveragePercent: null,
      coveredRequired: 0,
      totalRequired: 0,
      weightedCovered: 0,
      weightedTotal: 0,
      bestCoverageDate: latestDate(legacyLinkedDocuments.map(bestDocumentCoverageDate)),
      summary: legacyLinkedDocuments.length > 0
        ? `Legacy evidence link - criteria not configured (${legacyLinkedDocuments.length} linked).`
        : 'No evidence criteria configured.',
      reasons: legacyLinkedDocuments.length > 0
        ? ['Legacy requirement-document links exist but do not prove coverage until criteria are configured.']
        : ['No evidence criteria have been configured for this requirement.'],
      criteria: [],
      legacyLinkedDocuments
    };
  }

  const criterionResults = requirementCriteria.map(criterion => {
    const matches = input.criterionMatches.filter(match => match.criterion_id === criterion.id && match.match_status !== 'Rejected');
    const matchedDocuments = matches
      .map(match => input.documents.find(document => document.id === match.document_id))
      .filter((document): document is EvidenceDocument => Boolean(document));
    const matchedCompetencyRecords = matches
      .map(match => (input.competencyRecords || []).find(record => record.id === match.competency_record_id))
      .filter((record): record is CompetencyRecord => Boolean(record));
    const matchedActions = matches
      .map(match => (input.actions || []).find(action => action.id === match.action_id))
      .filter((action): action is Action => Boolean(action));
    const bestCoverageDate = latestDate([
      ...matchedDocuments.map(bestDocumentCoverageDate),
      ...matchedCompetencyRecords.map(record => record.expiry_date)
    ]);
    const reasons: string[] = [];

    const matchedCount = matchedDocuments.length + matchedCompetencyRecords.length + matchedActions.length;
    if (matchedCount < Math.max(criterion.minimum_count || 1, 1)) {
      reasons.push(`Needs ${criterion.minimum_count || 1} evidence match${(criterion.minimum_count || 1) === 1 ? '' : 'es'}; ${matchedCount} linked.`);
    }

    const expiredDocument = matchedDocuments.find(document => {
      const date = bestDocumentCoverageDate(document);
      return document.status === 'Expired' || (date ? daysUntil(date, today)! < 0 : false);
    });
    const expiringDocument = matchedDocuments.find(document => {
      const date = bestDocumentCoverageDate(document);
      const remaining = daysUntil(date, today);
      return document.status === 'Expiring Soon' || (remaining !== null && remaining >= 0 && remaining <= EVIDENCE_CRITERIA_WARNING_DAYS);
    });
    const expiredCompetency = matchedCompetencyRecords.find(record => {
      const status = calculateCompetencyStatus(record, today);
      return status === 'Expired' || status === 'Missing';
    });
    const expiringCompetency = matchedCompetencyRecords.find(record => calculateCompetencyStatus(record, today) === 'Expiring Soon');

    if (criterion.validity_required && matchedCount > 0 && !bestCoverageDate) {
      reasons.push('Dated evidence is required but no expiry, review, training, or calibration date was found.');
    }
    if (expiredDocument) reasons.push(`${expiredDocument.title} is expired.`);
    if (expiredCompetency) reasons.push('Linked competency record is expired or missing.');

    const hasMinimum = matchedCount >= Math.max(criterion.minimum_count || 1, 1);
    const hasValidity = !criterion.validity_required || Boolean(bestCoverageDate);
    const hasExpired = Boolean(expiredDocument || expiredCompetency);

    let status: RequirementEvidenceCoverage['status'] = 'Fully Covered';
    if (!hasMinimum || !hasValidity || hasExpired) {
      status = 'Not Covered';
    } else if (expiringDocument || expiringCompetency) {
      status = 'Partially Covered';
      reasons.push('Evidence is current but expires soon.');
    }

    if (reasons.length === 0) reasons.push('Criterion coverage is current.');

    return {
      criterion,
      status,
      matchedDocuments,
      matchedCompetencyRecords,
      matchedActions,
      bestCoverageDate,
      reasons
    };
  });

  const requiredResults = criterionResults.filter(result => result.criterion.is_required);
  const totalRequired = requiredResults.length;
  const coveredRequired = requiredResults.filter(result => result.status === 'Fully Covered' || result.status === 'Partially Covered').length;
  const weightedTotal = requiredResults.reduce((sum, result) => sum + Math.max(result.criterion.weight || 1, 0), 0);
  const weightedCovered = requiredResults.reduce((sum, result) => (
    result.status === 'Fully Covered' || result.status === 'Partially Covered'
      ? sum + Math.max(result.criterion.weight || 1, 0)
      : sum
  ), 0);
  const coveragePercent = weightedTotal > 0 ? Math.round((weightedCovered / weightedTotal) * 100) : null;
  const missingRequired = requiredResults.filter(result => result.status === 'Not Covered');
  const expiringRequired = requiredResults.filter(result => result.status === 'Partially Covered');

  let status: RequirementEvidenceCoverage['status'] = 'Not Assessed';
  if (totalRequired === 0) status = 'Not Assessed';
  else if (missingRequired.length === totalRequired) status = 'Not Covered';
  else if (missingRequired.length > 0 || expiringRequired.length > 0) status = 'Partially Covered';
  else status = 'Fully Covered';

  return {
    requirement_id: input.requirement.id,
    status,
    coveragePercent,
    coveredRequired,
    totalRequired,
    weightedCovered,
    weightedTotal,
    bestCoverageDate: latestDate(criterionResults.map(result => result.bestCoverageDate)),
    summary: totalRequired === 0
      ? 'No required evidence criteria configured.'
      : `${coveredRequired}/${totalRequired} required criteria covered${expiringRequired.length > 0 ? '; evidence expires soon' : ''}.`,
    reasons: criterionResults.flatMap(result => result.reasons.map(reason => `${result.criterion.title}: ${reason}`)),
    criteria: criterionResults,
    legacyLinkedDocuments
  };
};

export const buildEvidenceCoverageByRequirement = (input: {
  requirements: Requirement[];
  documents: EvidenceDocument[];
  requirementDocuments: RequirementDocument[];
  criteria: RequirementEvidenceCriterion[];
  criterionMatches: RequirementEvidenceCriterionMatch[];
  competencyRecords?: CompetencyRecord[];
  actions?: Action[];
  today?: Date;
}) => new Map(
  input.requirements.map(requirement => [
    requirement.id,
    buildRequirementEvidenceCoverage({ ...input, requirement })
  ])
);
