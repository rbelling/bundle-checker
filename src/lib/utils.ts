import github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy, zipObj } from 'ramda';
import {
  IBundleCheckerReport,
  IConsoleTable,
  IFileSizeReport,
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
): ITableRow[] => {
  const { currentBranchName, targetBranchName } = getBranches(report);
  return Object.keys({ ...report[currentBranchName], ...report[targetBranchName] })
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
};

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

export const getBranches = (
  result: IBundleCheckerReport
): { currentBranchName: string; targetBranchName: string } => ({
  currentBranchName: Object.keys(result).shift() as string,
  targetBranchName: Object.keys(result).pop() as string
});

export function getConsoleTotalTable(result: IBundleCheckerReport): IConsoleTable {
  const { currentBranchName, targetBranchName } = getBranches(result);
  const table = getFormattedRows({
    currentBranchReport: squashReportByFileExtension(result[currentBranchName]),
    targetBranchReport: squashReportByFileExtension(result[targetBranchName])
  });
  return table.map(([ext, currentSize, targetSize]) => ({
    Ext: `(${ext})`,
    [currentBranchName]: currentSize,
    [targetBranchName]: targetSize
  }));
}

export function getFilesBreakDownTable(result: IBundleCheckerReport): ITableRow[] {
  const { currentBranchName, targetBranchName } = getBranches(result);
  // TODO:
  return [['File', currentBranchName, targetBranchName]];
}
