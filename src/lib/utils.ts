import github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy } from 'ramda';
import { IBundleCheckerReport, ITableRow } from '../../types/bundle-checker-types';
const octokit = new github();

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

export async function commentOnPr(body: any) {
  try {
    const { GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG } = process.env as any;
    const [owner, repo] = TRAVIS_PULL_REQUEST_SLUG.split('/');
    // TODO: Maybe ask for a specific GITHUB_TOKEN and OWNER in env vars for travis job.
    console.log(GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG);
    await octokit.authenticate({ type: 'token', token: GITHUB_TOKEN });
    await octokit.issues.createComment({ owner, repo, number: TRAVIS_PULL_REQUEST, body });
  } catch (error) {
    console.error(error);
  }
}
