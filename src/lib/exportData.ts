type ExportValue = string | number | boolean | null | undefined;
export type ExportRow = Record<string, ExportValue>;

export const exportDateStamp = () => new Date().toISOString().slice(0, 10);

const sanitizeCell = (value: ExportValue): string => {
  if (value === null || value === undefined) return '';
  const text = String(value).replace(/\r?\n/g, ' ').trim();
  if (/[",]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

export const rowsToCsv = (rows: ExportRow[]): string => {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  return [
    headers.map(sanitizeCell).join(','),
    ...rows.map(row => headers.map(header => sanitizeCell(row[header])).join(','))
  ].join('\n');
};

export const downloadTextFile = (filename: string, content: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportCsv = (filename: string, rows: ExportRow[]) => {
  downloadTextFile(filename, rowsToCsv(rows), 'text/csv;charset=utf-8');
};

export const exportJson = (filename: string, rows: ExportRow[]) => {
  downloadTextFile(filename, JSON.stringify(rows, null, 2), 'application/json;charset=utf-8');
};
