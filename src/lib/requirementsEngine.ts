import type { EvidenceDocument, Requirement, RequirementDocument, RequirementStatus } from './types';

const REVIEW_WARNING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export const calculateRequirementStatus = (
  requirement: Pick<Requirement, 'next_due_date'>,
  linkedDocuments: EvidenceDocument[],
  today: Date = new Date()
): RequirementStatus => {
  if (linkedDocuments.length === 0) return 'RED';

  const hasExpiredEvidence = linkedDocuments.some(doc => doc.status === 'Expired');
  if (hasExpiredEvidence) return 'RED';

  if (!requirement.next_due_date) return 'GREEN';

  const dueAt = new Date(requirement.next_due_date).getTime();
  const now = today.getTime();
  if (dueAt <= now) return 'RED';

  const daysUntilDue = Math.ceil((dueAt - now) / DAY_MS);
  if (daysUntilDue <= REVIEW_WARNING_DAYS) return 'AMBER';

  return 'GREEN';
};

export const getLinkedDocumentsForRequirement = (
  requirementId: string,
  documents: EvidenceDocument[],
  links: RequirementDocument[]
): EvidenceDocument[] => {
  const linkedDocumentIds = new Set(
    links.filter(link => link.requirement_id === requirementId).map(link => link.document_id)
  );
  return documents.filter(document => linkedDocumentIds.has(document.id));
};

export const getRequirementStatusLabel = (status: RequirementStatus): string => {
  if (status === 'GREEN') return 'Green';
  if (status === 'AMBER') return 'Amber';
  if (status === 'RED') return 'Red';
  return 'Grey';
};
