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

export async function commentOnPr(message: string, isCollapsibleComment: boolean = true) {
  try {
    const { GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG } = process.env as any;
    const [owner, repo] = TRAVIS_PULL_REQUEST_SLUG.split('/');
    const octokit = new Github({ auth: GITHUB_TOKEN });
    const body = isCollapsibleComment
      ? `<details>
          <summary>Click to expand</summary>
          <p>
            ${message}
          </p>
        </details>`
      : message;
    await octokit.issues.createComment({ owner, repo, number: TRAVIS_PULL_REQUEST, body });
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
    Ext: `(${ext})`,
    [currentBranchName]: currentSize,
    [targetBranchName]: targetSize
  }));
};

const getFilesBreakDownTable = ({
  currentBranchName,
  targetBranchName
}: IPrintStdout): IConsoleTable => [
  {
    File: 'TODO:',
    [currentBranchName]: 'currentBranchName',
    [targetBranchName]: 'currentBranchName'
  }
];
