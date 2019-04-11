import Github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy, zipObj } from 'ramda';
import {
  IBundleCheckerReport,
  IConsoleTable,
  IFileSizeReport,
  IPrintStdout,
  ITableRow
} from '../../types/bundle-checker-types';

export function withDeltaSize(a: number = 0, b: number = 0): string {
  const icon = b - a > 0 ? `🔺 +` : `▼ -`;
  if (b - a === 0) {
    return printBytes(b);
  } else {
    return `${printBytes(b)} (${icon}${printBytes(Math.abs(b - a))})`;
  }
}

export function createMarkdownTable([headerRow, ...contentRows]: ITableRow[]): string {
  const buildHeader = (headers: ITableRow): string =>
    `| ${headers.join(' | ')} |\n` + `| ${headers.map(_ => '---').join(' | ')} |`;

  const buildRow = (row: ITableRow): string => `| ${row.join(' | ')} |`;

  const buildRows = (rows: ITableRow[]): string => rows.map(buildRow).join('\n');

  return `${buildHeader(headerRow)}\n` + `${buildRows(contentRows)}`;
}

export const getFileExtension = (fileName: string) => fileName.split('.').pop() || 'No extension';

export const groupFilesByExtension = (targetedFiles: string[]): { [key: string]: string[] } =>
  groupBy((current: string) => {
    return getFileExtension(current);
  })(targetedFiles);

export const getFormattedRows = (report: IBundleCheckerReport): ITableRow[] =>
  Object.keys({ ...report.targetBranchReport, ...report.currentBranchReport })
    .map(fileName => [
      fileName,
      (report.currentBranchReport[fileName] || 0) as number,
      (report.targetBranchReport[fileName] || 0) as number
    ])
    .sort(sortByDelta)
    .filter(filterDelta)
    .map(([fileName, currentBranchSize, targetBranchSize]: any) => [
      fileName,
      withDeltaSize(targetBranchSize, currentBranchSize),
      printBytes(targetBranchSize)
    ]);

/*
 * Given an IFileSizeReport, returns a new IFileSizeReport where entries are grouped by file extension
 */
export const squashReportByFileExtension = (report: IFileSizeReport): IFileSizeReport => {
  const keysGroupedByExtension = Object.keys(
    groupFilesByExtension(Object.keys(report))
  ) as ReadonlyArray<string>;

  return zipObj(keysGroupedByExtension, keysGroupedByExtension.map(fileExtension =>
    Object.keys(report)
      .filter(file => getFileExtension(file) === fileExtension)
      .reduce((sequence: number, currentFileName) => sequence + report[currentFileName], 0)
  ) as ReadonlyArray<number>);
};

export async function commentOnPr(table: ITableRow[]) {
  try {
    const { GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG } = process.env as any;
    const [owner, repo] = TRAVIS_PULL_REQUEST_SLUG.split('/');
    const octokit = new Github({ auth: GITHUB_TOKEN });
    await octokit.issues.createComment({
      body: createMarkdownTable(table),
      number: TRAVIS_PULL_REQUEST,
      owner,
      repo
    });
  } catch (error) {
    console.error(error);
  }
}
export async function printStdout(args: IPrintStdout) {
  const totalTable = getConsoleTotalTable(args);
  const filesBreakdownTable = getFilesBreakDownTable(args);
  console.log('TOTALS');
  console.table(totalTable);
  console.log('FILE BREAKDOWN');
  console.table(filesBreakdownTable);
}

const getConsoleTotalTable = ({
  report,
  currentBranchName,
  targetBranchName
}: IPrintStdout): IConsoleTable => {
  const table = getFormattedRows({
    currentBranchReport: squashReportByFileExtension(report.currentBranchReport),
    targetBranchReport: squashReportByFileExtension(report.targetBranchReport)
  });
  return table.map(([ext, currentSize, targetSize]) => ({
    Ext: ext,
    [currentBranchName]: currentSize,
    [targetBranchName]: targetSize
  }));
};

const getFilesBreakDownTable = ({
  currentBranchName,
  targetBranchName,
  report
}: IPrintStdout): any =>
  getFormattedRows(report).map(([fileName, currentSize, targetSize]) => ({
    File: fileName,
    [currentBranchName]: currentSize,
    [targetBranchName]: targetSize
  }));

// TODO: fix types, and make them more robust
const sortByDelta = (a: Array<string | number>, b: Array<string | number>) => {
  const bDelta = (b[1] as number) - (b[2] as number);
  const aDelta = (a[1] as number) - (a[2] as number);
  if (bDelta - aDelta > 0) return 1;
  if (bDelta - aDelta < 0) return -1;
  return 0;
};

const filterDelta = (itemRow: Array<string | number>) => {
  const delta = (itemRow[1] as number) - (itemRow[2] as number);
  if (delta === 0) return false;
  return true;
};
