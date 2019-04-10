import printBytes from 'bytes';
import { groupBy } from 'ramda';
import { IFileSizeReport, ITableRow } from '../../types/bundle-checker-types';

export function withDeltaSize(a: number = 0, b: number = 0): string {
  const icon = b - a > 0 ? `🔺` : `▼`;
  const sign = b - a > 0 ? `+` : `-`;
  if (b - a === 0) {
    return printBytes(b);
  } else {
    return `${printBytes(b)} (${icon} ${sign}${printBytes(Math.abs(b - a))})`;
  }
}

export function createMarkdownTable([headerRow, ...contentRows]: ITableRow[]): string {
  const buildHeader = (headers: ITableRow): string =>
    `| ${headers.join(' | ')} |\n` + `| ${headers.map(_ => '---').join(' | ')} |`;

  const buildRow = (row: ITableRow): string => `| ${row.join(' | ')} |`;

  const buildRows = (rows: ITableRow[]): string => rows.map(buildRow).join('\n');

  return `${buildHeader(headerRow)}\n` + `${buildRows(contentRows)}`;
}

export const groupByFileExtension = (targetedFiles: string[]): { [key: string]: string[] } =>
  groupBy((current: string) => {
    return current.split('.').pop() || 'No extension';
  })(targetedFiles);

export const getFormattedRows = (
  targetBranchReport: IFileSizeReport,
  currentBranchReport: IFileSizeReport
): ITableRow[] =>
  Object.keys({ ...targetBranchReport, ...currentBranchReport })
    .sort()
    .map(fileName => [
      fileName,
      printBytes(targetBranchReport[fileName] || 0),
      withDeltaSize(targetBranchReport[fileName], currentBranchReport[fileName])
    ]);
