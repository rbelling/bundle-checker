import { groupBy } from 'ramda';
import {
  IBundleCheckerReport,
  IBundleCheckerReportRow,
  ITotalSize
} from '../../types/bundle-checker-types';

export function createMarkdownTable([
  headerRow,
  ...contentRows
]: IBundleCheckerReportRow[]): IBundleCheckerReport {
  const buildHeader = (headers: string[]): string =>
    `| ${headers.join(' | ')} |\n` + `| ${headers.map(_ => '---').join(' | ')} |`;

  const buildRow = (row: string[]): string => `| ${row.join(' | ')} |`;

  const buildRows = (rows: string[][]): string => rows.map(buildRow).join('\n');

  return `${buildHeader(headerRow)}\n` + `${buildRows(contentRows)}`;
}

export const groupByFileExtension = (targetedFiles: string[]): { [key: string]: string[] } =>
  groupBy((current: string) => {
    return current.split('.').pop() || 'No extension';
  })(targetedFiles);

export const getTotalSizeRows = (a: ITotalSize, b: ITotalSize): IBundleCheckerReportRow[] => [[]];
