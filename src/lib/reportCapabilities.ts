export type BuilderSource = 'Requirements' | 'Evidence' | 'Competencies' | 'Actions' | 'Audit Trail';

export interface ReportSourceCapability {
  source: BuilderSource;
  label: string;
  supportedDimensions: { value: string; label: string }[];
  supportedMeasures: { value: string; label: string }[];
  supportedFilters: string[];
  supportedDateFields: { value: string; label: string }[];
  supportedDateBuckets: string[];
  supportedVisualTypes: { value: string; label: string }[];
  supportedPivotAggregations: { value: string; label: string }[];
  permissionRequirement: 'All Members' | 'Owner/Admin only';
  exportFormats: string[];
  defaultDimension: string;
  defaultMeasure: string;
  defaultVisual: string;
}

export const REPORT_CAPABILITIES: Record<BuilderSource, ReportSourceCapability> = {
  Requirements: {
    source: 'Requirements',
    label: 'Requirements & Readiness',
    supportedDimensions: [
      { value: 'category', label: 'Category' },
      { value: 'status', label: 'RAG Status' },
      { value: 'risk_level', label: 'Risk Level' },
      { value: 'owner', label: 'Owner' },
      { value: 'date_day', label: 'Date (Day)' },
      { value: 'date_week', label: 'Date (Week)' },
      { value: 'date_month', label: 'Date (Month)' },
      { value: 'date_year', label: 'Date (Year)' }
    ],
    supportedMeasures: [
      { value: 'count', label: 'Count of Records' },
      { value: 'completion_rate', label: 'Completion/Readiness Rate (%)' },
      { value: 'overdue', label: 'Overdue Count' },
      { value: 'avg_days_overdue', label: 'Average Days Overdue' }
    ],
    supportedFilters: ['category', 'status', 'owner', 'risk_level'],
    supportedDateFields: [
      { value: 'created_at', label: 'Created Date' },
      { value: 'review_date', label: 'Review Date' },
      { value: 'next_due_date', label: 'Next Due Date' }
    ],
    supportedDateBuckets: ['day', 'week', 'month', 'year'],
    supportedVisualTypes: [
      { value: 'bar', label: 'Bar Chart' },
      { value: 'donut', label: 'Donut Chart' },
      { value: 'table', label: 'Data Grid Table' },
      { value: 'pivot', label: 'Pivot Matrix Grid' }
    ],
    supportedPivotAggregations: [
      { value: 'count', label: 'Count' },
      { value: 'readiness_rate', label: 'Readiness Rate (%)' },
      { value: 'avg_days_overdue', label: 'Average Days Overdue' },
      { value: 'max_days_overdue', label: 'Maximum Days Overdue' },
      { value: 'min_days_overdue', label: 'Minimum Days Overdue' },
      { value: 'row_pct', label: 'Row Percentage' },
      { value: 'col_pct', label: 'Column Percentage' },
      { value: 'total_pct', label: 'Total Percentage' }
    ],
    permissionRequirement: 'All Members',
    exportFormats: ['CSV'],
    defaultDimension: 'category',
    defaultMeasure: 'count',
    defaultVisual: 'bar'
  },
  Evidence: {
    source: 'Evidence',
    label: 'Evidence Documents',
    supportedDimensions: [
      { value: 'category', label: 'Category' },
      { value: 'status', label: 'Status' },
      { value: 'uploaded_by', label: 'Uploaded By' },
      { value: 'date_day', label: 'Date (Day)' },
      { value: 'date_week', label: 'Date (Week)' },
      { value: 'date_month', label: 'Date (Month)' },
      { value: 'date_year', label: 'Date (Year)' }
    ],
    supportedMeasures: [
      { value: 'count', label: 'Count of Records' },
      { value: 'expiring', label: 'Expiring Soon Count' },
      { value: 'expired', label: 'Expired Count' }
    ],
    supportedFilters: ['category', 'status', 'uploaded_by'],
    supportedDateFields: [
      { value: 'created_at', label: 'Upload Date' },
      { value: 'issue_date', label: 'Issue Date' },
      { value: 'expiry_date', label: 'Expiry Date' },
      { value: 'review_date', label: 'Review Date' }
    ],
    supportedDateBuckets: ['day', 'week', 'month', 'year'],
    supportedVisualTypes: [
      { value: 'bar', label: 'Bar Chart' },
      { value: 'donut', label: 'Donut Chart' },
      { value: 'table', label: 'Data Grid Table' }
    ],
    supportedPivotAggregations: [
      { value: 'count', label: 'Count' }
    ],
    permissionRequirement: 'All Members',
    exportFormats: ['CSV'],
    defaultDimension: 'category',
    defaultMeasure: 'count',
    defaultVisual: 'bar'
  },
  Competencies: {
    source: 'Competencies',
    label: 'Competencies & People',
    supportedDimensions: [
      { value: 'status', label: 'Status' },
      { value: 'trainer', label: 'Trainer' },
      { value: 'provider', label: 'Provider' },
      { value: 'date_day', label: 'Date (Day)' },
      { value: 'date_week', label: 'Date (Week)' },
      { value: 'date_month', label: 'Date (Month)' },
      { value: 'date_year', label: 'Date (Year)' }
    ],
    supportedMeasures: [
      { value: 'count', label: 'Count of Records' },
      { value: 'completion_rate', label: 'Completion/Readiness Rate (%)' },
      { value: 'expired', label: 'Expired Count' },
      { value: 'missing', label: 'Missing Count' }
    ],
    supportedFilters: ['status', 'trainer', 'provider'],
    supportedDateFields: [
      { value: 'created_at', label: 'Created Date' },
      { value: 'completed_date', label: 'Completed Date' },
      { value: 'expiry_date', label: 'Expiry Date' }
    ],
    supportedDateBuckets: ['day', 'week', 'month', 'year'],
    supportedVisualTypes: [
      { value: 'bar', label: 'Bar Chart' },
      { value: 'donut', label: 'Donut Chart' },
      { value: 'table', label: 'Data Grid Table' }
    ],
    supportedPivotAggregations: [
      { value: 'count', label: 'Count' }
    ],
    permissionRequirement: 'All Members',
    exportFormats: ['CSV'],
    defaultDimension: 'status',
    defaultMeasure: 'count',
    defaultVisual: 'bar'
  },
  Actions: {
    source: 'Actions',
    label: 'Corrective Actions Registry',
    supportedDimensions: [
      { value: 'status', label: 'Status' },
      { value: 'owner', label: 'Owner' },
      { value: 'date_day', label: 'Date (Day)' },
      { value: 'date_week', label: 'Date (Week)' },
      { value: 'date_month', label: 'Date (Month)' },
      { value: 'date_year', label: 'Date (Year)' }
    ],
    supportedMeasures: [
      { value: 'count', label: 'Count of Records' },
      { value: 'completion_rate', label: 'Completion/Readiness Rate (%)' },
      { value: 'overdue', label: 'Overdue Count' },
      { value: 'avg_days_overdue', label: 'Average Days Overdue' }
    ],
    supportedFilters: ['status', 'owner'],
    supportedDateFields: [
      { value: 'created_at', label: 'Created Date' },
      { value: 'target_due_date', label: 'Target Due Date' },
      { value: 'opened_at', label: 'Opened Date' },
      { value: 'closed_at', label: 'Closed Date' }
    ],
    supportedDateBuckets: ['day', 'week', 'month', 'year'],
    supportedVisualTypes: [
      { value: 'bar', label: 'Bar Chart' },
      { value: 'donut', label: 'Donut Chart' },
      { value: 'table', label: 'Data Grid Table' }
    ],
    supportedPivotAggregations: [
      { value: 'count', label: 'Count' }
    ],
    permissionRequirement: 'All Members',
    exportFormats: ['CSV'],
    defaultDimension: 'status',
    defaultMeasure: 'count',
    defaultVisual: 'bar'
  },
  'Audit Trail': {
    source: 'Audit Trail',
    label: 'Audit Logs Trail',
    supportedDimensions: [
      { value: 'action_category', label: 'Event Category' },
      { value: 'actor_name', label: 'Actor Name' },
      { value: 'severity', label: 'Severity' },
      { value: 'date_day', label: 'Date (Day)' },
      { value: 'date_week', label: 'Date (Week)' },
      { value: 'date_month', label: 'Date (Month)' },
      { value: 'date_year', label: 'Date (Year)' }
    ],
    supportedMeasures: [
      { value: 'count', label: 'Count of Records' },
      { value: 'critical', label: 'Critical Event Count' },
      { value: 'warning', label: 'Warning Event Count' }
    ],
    supportedFilters: ['action_category', 'actor_name', 'severity'],
    supportedDateFields: [
      { value: 'created_at', label: 'Logged Date' },
      { value: 'undo_expires_at', label: 'Undo Expiry Date' }
    ],
    supportedDateBuckets: ['day', 'week', 'month', 'year'],
    supportedVisualTypes: [
      { value: 'bar', label: 'Bar Chart' },
      { value: 'donut', label: 'Donut Chart' },
      { value: 'table', label: 'Data Grid Table' }
    ],
    supportedPivotAggregations: [
      { value: 'count', label: 'Count' }
    ],
    permissionRequirement: 'Owner/Admin only',
    exportFormats: ['CSV'],
    defaultDimension: 'action_category',
    defaultMeasure: 'count',
    defaultVisual: 'bar'
  }
};
