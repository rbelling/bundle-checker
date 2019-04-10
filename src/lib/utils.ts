import github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy } from 'ramda';
import { IFileSizeReport, ITableRow } from '../../types/bundle-checker-types';

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

export const groupByFileExtension = (targetedFiles: string[]): { [key: string]: string[] } =>
  groupBy((current: string) => {
    return current.split('.').pop() || 'No extension';
  })(targetedFiles);

export const getFormattedRows = (
  targetBranchReport: IFileSizeReport,
  currentBranchReport: IFileSizeReport,
  omitFromFilename: string = ''
): ITableRow[] =>
  Object.keys({ ...targetBranchReport, ...currentBranchReport })
    .sort()
    .map(fileName => [
      fileName,
      printBytes(targetBranchReport[fileName] || 0),
      withDeltaSize(targetBranchReport[fileName], currentBranchReport[fileName])
    ])
    .map(([fileName, targetBranchSize, currentBranchSize]) => [
      fileName.replace(omitFromFilename, ''),
      targetBranchSize,
      currentBranchSize
    ]);

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
