import printBytes from 'bytes';
import { groupBy } from 'ramda';
import { ITableReport, ITableRow } from '../../types/bundle-checker-types';

export function withDeltaSize(a: number = 0, b: number = 0): string {
  const icon = a - b > 0 ? `▼` : `🔺`;
  return `${printBytes(b)} (${icon} ${printBytes(Math.abs(a - b))})`;
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

export const getRowsForTotalSizeReport = (a: ITableReport, b: ITableReport): ITableRow[] =>
  Object.keys({ ...a, ...b }).map(fileExtension => [
    fileExtension,
    printBytes(a[fileExtension] || 0),
    withDeltaSize(a[fileExtension], b[fileExtension])
  ]);
