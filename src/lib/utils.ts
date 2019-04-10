import github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy } from 'ramda';
import { ITableReport, ITableRow } from '../../types/bundle-checker-types';
const octokit = new github();

export function withDeltaSize(a: number = 0, b: number = 0): string {
  const icon = b - a > 0 ? `🔺` : `▼`;
  const sign = b - a > 0 ? `+` : `-`;
  return `${printBytes(b)} (${icon} ${sign}${printBytes(Math.abs(b - a))})`;
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
  Object.keys({ ...a, ...b })
    .sort()
    .map(fileExtension => [
      `.${fileExtension}`,
      printBytes(a[fileExtension] || 0),
      withDeltaSize(a[fileExtension], b[fileExtension])
    ]);

export async function commentOnPr(body: any) {
  try {
    const { GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG } = process.env as any;
    const [owner, repo] = TRAVIS_PULL_REQUEST_SLUG.split('/');
    // TODO: Maybe ask for a specific GITHUB_TOKEN and owner as Env Variable for travis
    await octokit.authenticate({ type: 'token', token: GITHUB_TOKEN });
    await octokit.issues.createComment({ owner, repo, number: TRAVIS_PULL_REQUEST, body });
  } catch (error) {
    console.error(error);
  }
}
