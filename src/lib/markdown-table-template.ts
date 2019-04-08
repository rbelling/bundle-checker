import { IBundleCheckerReport, IBundleCheckerReportRow } from '../../types/bundle-checker-types';

const buildHeader = (headers: string[]): string =>
  `| ${headers.join(' | ')} |\n` + `| ${headers.map(_ => '---').join(' | ')} |`;

const buildRow = (row: string[]): string => `| ${row.join(' | ')} |`;

const buildRows = (rows: string[][]): string => rows.map(buildRow).join('\n');

export default function template([
  headerRow,
  ...contentRows
]: IBundleCheckerReportRow[]): IBundleCheckerReport {
  return `${buildHeader(headerRow)}\n` + `${buildRows(contentRows)}`;
}
