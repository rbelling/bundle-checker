import github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy, zipObj } from 'ramda';
import {
  IBundleCheckerReport,
  IFileSizeReport,
  ITable,
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

export const getFormattedRows = (
  report: IBundleCheckerReport,
  omitFromFilename: string = ''
): ITableRow[] =>
  Object.keys({ ...report.targetBranchReport, ...report.currentBranchReport })
    .sort()
    .map(fileName => [
      fileName,
      printBytes(report.targetBranchReport[fileName] || 0),
      withDeltaSize(report.targetBranchReport[fileName], report.currentBranchReport[fileName])
    ])
    .map(([fileName, targetBranchSize, currentBranchSize]) => [
      fileName.replace(omitFromFilename, ''),
      targetBranchSize,
      currentBranchSize
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

export async function commentOnPr(body: any) {
  try {
    const { GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG } = process.env as any;
    const [owner, repo] = TRAVIS_PULL_REQUEST_SLUG.split('/');
    const octokit = new github({ auth: GITHUB_TOKEN });
    await octokit.issues.createComment({ owner, repo, number: TRAVIS_PULL_REQUEST, body });
  } catch (error) {
    console.error(error);
  }
}

export function getBranches(
  result: IBundleCheckerReport
): { currentBranchName: string; targetBranchName: string } {
  return {
    currentBranchName: Object.values(result).shift(),
    targetBranchName: Object.values(result).pop()
  };
}

export function getTotalTable(result: IBundleCheckerReport): ITable {
  // const { currentBranchName, targetBranchName } = getBranches(result);
  return getFormattedRows({
    currentBranchReport: squashReportByFileExtension(result.currentBranchReport),
    targetBranchReport: squashReportByFileExtension(result.targetBranchReport)
  });
  // TODO:
  // return [['Extensions', currentBranchName, targetBranchName]];
}

export function getFilesBreakDownTable(result: IBundleCheckerReport): ITable {
  const { currentBranchName, targetBranchName } = getBranches(result);
  // TODO:
  return [['File', currentBranchName, targetBranchName]];
}
