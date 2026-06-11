import type {
  Asset,
  AssetCheckType,
  AssetCheckAssignment,
  AssetCheckRecord,
  AssetMatrixCell,
  AssetStatusSummary
} from './types';

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntil = (value: string | null | undefined, today: Date): number | null => {
  if (!value) return null;
  const targetDate = new Date(value);
  if (isNaN(targetDate.getTime())) return null;
  
  // Set times to midnight to calculate pure date differences
  const d1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const d2 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((d1.getTime() - d2.getTime()) / DAY_MS);
};

export const calculateNextDueDate = (
  completedDateStr: string,
  frequencyValue: number | null,
  frequencyUnit: 'days' | 'weeks' | 'months' | 'years' | null
): string => {
  if (!frequencyValue || !frequencyUnit) {
    return completedDateStr;
  }
  const date = new Date(completedDateStr);
  if (isNaN(date.getTime())) return completedDateStr;

  switch (frequencyUnit) {
    case 'days':
      date.setDate(date.getDate() + frequencyValue);
      break;
    case 'weeks':
      date.setDate(date.getDate() + frequencyValue * 7);
      break;
    case 'months':
      date.setMonth(date.getMonth() + frequencyValue);
      break;
    case 'years':
      date.setFullYear(date.getFullYear() + frequencyValue);
      break;
  }
  return date.toISOString().split('T')[0];
};

export const calculateAssetCheckStatus = (
  assignment: AssetCheckAssignment | null | undefined,
  latestRecord: AssetCheckRecord | null | undefined,
  asset: Asset,
  checkType: AssetCheckType,
  hasEvidence: boolean,
  today: Date = new Date()
): string => {
  if (asset.status === 'archived') return 'archived';
  if (asset.status === 'inactive') return 'inactive';

  if (!assignment || !assignment.active) return 'inactive';
  if (!assignment.required) return 'not_required';

  // Extract custom warning days or check type default warning days, default to 30 days
  const warningDays = assignment.warning_days !== null && assignment.warning_days !== undefined
    ? assignment.warning_days
    : (checkType.default_warning_days !== null && checkType.default_warning_days !== undefined ? checkType.default_warning_days : 30);

  // If evidence is required but missing, status is missing
  const evidenceRequired = checkType.evidence_required;
  if (evidenceRequired && !hasEvidence) {
    return 'missing';
  }

  // If no record exists yet
  if (!latestRecord) {
    // Check due date if available
    const nextDue = assignment.next_due_date || assignment.first_due_date;
    if (nextDue) {
      const remainingDays = daysUntil(nextDue, today);
      if (remainingDays !== null) {
        if (remainingDays < 0) return 'overdue';
        if (remainingDays <= warningDays) return 'due_soon';
      }
    }
    return 'missing';
  }

  // Evaluate expiry date (valid_until)
  if (latestRecord.valid_until) {
    const remainingExpiry = daysUntil(latestRecord.valid_until, today);
    if (remainingExpiry !== null) {
      if (remainingExpiry < 0) return 'expired';
      if (remainingExpiry <= warningDays) return 'due_soon';
    }
  }

  // Evaluate next due date from assignment
  if (assignment.next_due_date) {
    const remainingDue = daysUntil(assignment.next_due_date, today);
    if (remainingDue !== null) {
      if (remainingDue < 0) return 'overdue';
      if (remainingDue <= warningDays) return 'due_soon';
    }
  }

  return 'valid';
};

export const buildAssetMatrix = (
  assets: Asset[],
  checkTypes: AssetCheckType[],
  assignments: AssetCheckAssignment[],
  records: AssetCheckRecord[],
  evidenceLinks: { asset_check_record_id: string | null; document_id: string }[],
  today: Date = new Date()
): AssetMatrixCell[] => {
  const activeAssets = assets.filter(a => a.status === 'active');
  const activeTypes = checkTypes.filter(ct => ct.active);

  return activeAssets.flatMap(asset =>
    activeTypes.map(checkType => {
      // Find assignment
      const assignment = assignments.find(
        asg => asg.asset_id === asset.id && asg.asset_check_type_id === checkType.id
      );

      // Find latest record
      const typeRecords = records
        .filter(rec => rec.asset_id === asset.id && rec.asset_check_type_id === checkType.id)
        .sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime());
      
      const latestRecord = typeRecords[0] || null;

      // Check if evidence exists
      let hasEvidence = false;
      if (latestRecord) {
        hasEvidence = evidenceLinks.some(link => link.asset_check_record_id === latestRecord.id);
      }

      const status = calculateAssetCheckStatus(
        assignment,
        latestRecord,
        asset,
        checkType,
        hasEvidence,
        today
      );

      return {
        id: assignment?.id || `cell-${asset.id}-${checkType.id}`,
        organisation_id: asset.organisation_id,
        asset_id: asset.id,
        asset_check_type_id: checkType.id,
        status,
        last_checked_at: new Date().toISOString(),
        assignment: assignment || undefined,
        latest_record: latestRecord || undefined
      };
    })
  );
};

export const buildAssetSummary = (
  assets: Asset[],
  checkTypes: AssetCheckType[],
  assignments: AssetCheckAssignment[],
  records: AssetCheckRecord[],
  evidenceLinks: { asset_check_record_id: string | null; document_id: string }[],
  today: Date = new Date()
): AssetStatusSummary => {
  const cells = buildAssetMatrix(assets, checkTypes, assignments, records, evidenceLinks, today);
  const assessed = cells.filter(cell => cell.status !== 'not_required' && cell.status !== 'inactive' && cell.status !== 'archived');
  const compliant = cells.filter(cell => cell.status === 'valid').length;
  const dueSoon = cells.filter(cell => cell.status === 'due_soon').length;
  const overdue = cells.filter(cell => cell.status === 'overdue').length;
  const expired = cells.filter(cell => cell.status === 'expired').length;
  const missing = cells.filter(cell => cell.status === 'missing').length;

  const totalAssessed = assessed.length;
  const compliancePercent = totalAssessed === 0 ? 100 : Math.round(((compliant + dueSoon * 0.5) / totalAssessed) * 100);

  return {
    total: assets.filter(a => a.status === 'active').length,
    compliant,
    dueSoon,
    overdue,
    expired,
    missing,
    compliancePercent
  };
};
