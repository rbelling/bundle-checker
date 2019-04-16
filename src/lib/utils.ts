import Github from '@octokit/rest';
import printBytes from 'bytes';
import path from 'path';
import { groupBy, replace, zipObj } from 'ramda';
import {
  IAbstractTableRow,
  IBundleCheckerReport,
  IConsoleTable,
  IFileSizeReport,
  IGetExistingCommentId,
  IPrintableReport,
  ITableRow
} from '../../types/bundle-checker-types';

const SHARED_TABLE_VALUES = {
  FILES_BREAKDOWN_TITLE: 'All targeted files',
  FILE_EXTENSION: 'file extension',
  FILE_NAME: 'name',
  TOTALS_TITLE: 'Overview'
};

const COMMENT_WATERMARK =
  '<p align="right"><i>Generated by </i><a href="https://www.npmjs.com/package/bundle-checker" target="_blank">bundle-checker</a>🔎📦</p>';

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

export const groupFilesByExtension = groupBy(path.extname);

export const getFormattedRows = (report: IBundleCheckerReport): ITableRow[] =>
  Object.keys({ ...report.targetBranchReport, ...report.currentBranchReport })
    .map(
      fileName =>
        [
          fileName,
          report.currentBranchReport[fileName] || 0,
          report.targetBranchReport[fileName] || 0
        ] as IAbstractTableRow
    )
    .sort(sortByDelta)
    .map(([fileName, currentBranchSize, targetBranchSize]: IAbstractTableRow) => [
      fileName,
      withDeltaSize(targetBranchSize, currentBranchSize),
      printBytes(targetBranchSize)
    ]);

/*
 * Given an IFileSizeReport, returns a new IFileSizeReport where entries are grouped by file extension
 */
export const squashReportByFileExtension = (report: IFileSizeReport): IFileSizeReport => {
  const keysGroupedByExtension = Object.keys(
    groupFilesByExtension(Object.keys(report) as ReadonlyArray<string>)
  ) as ReadonlyArray<string>;

  return zipObj(keysGroupedByExtension, keysGroupedByExtension.map(fileExtension =>
    Object.keys(report)
      .filter(file => path.extname(file) === fileExtension)
      .reduce((sequence: number, currentFileName) => sequence + report[currentFileName], 0)
  ) as ReadonlyArray<number>);
};

export const stripHashFromFileNames = (report: IFileSizeReport): IFileSizeReport => {
  const HASH_REPLACEMENT = '[HASH]';
  return zipObj(
    Object.keys(report).map((fileName: string) => {
      const slugs = path.parse(fileName).name.split('.');
      if (slugs.length > 1) {
        const hash = slugs[slugs.length - 1];
        // Todo: add additional checks here to determine if this is really a hash
        return replace(hash, HASH_REPLACEMENT, fileName);
      }
      return fileName;
    }) as ReadonlyArray<string>,
    Object.values(report) as ReadonlyArray<number>
  );
};

/**
 * Posts a comment on a Pull Request, or updates an existing one if found
 */
export async function commentOnPr({
  currentBranchName,
  report,
  targetBranchName
}: IPrintableReport) {
  const wrapInCollapsible = (
    content: string,
    collapsibleHeader: string = 'Details of bundled changes'
  ) => `<details><summary>${collapsibleHeader}</summary>\n\n${content}\n\n</details>`;
  const overviewTable = `### ${SHARED_TABLE_VALUES.TOTALS_TITLE}\n${createMarkdownTable([
    [SHARED_TABLE_VALUES.FILE_EXTENSION, currentBranchName, targetBranchName],
    ...getFormattedRows({
      currentBranchReport: squashReportByFileExtension(report.currentBranchReport),
      targetBranchReport: squashReportByFileExtension(report.targetBranchReport)
    })
  ])}`;
  const filesBreakDownTable = wrapInCollapsible(
    `### ${SHARED_TABLE_VALUES.FILES_BREAKDOWN_TITLE}\n${createMarkdownTable([
      [SHARED_TABLE_VALUES.FILE_NAME, currentBranchName, targetBranchName],
      ...getFormattedRows(report)
    ])}`
  );

  try {
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    const PULL_REQUEST_NUMBER = Number(
      process.env.TRAVIS_PULL_REQUEST || process.env.PULL_REQUEST_NUMBER
    );
    const PULL_REQUEST_SLUG =
      process.env.TRAVIS_PULL_REQUEST_SLUG || process.env.PULL_REQUEST_SLUG || '';

    const [owner, repo] = PULL_REQUEST_SLUG.split('/');
    const octokit = new Github({ auth: GITHUB_TOKEN });
    const body = `${overviewTable}\n\n${filesBreakDownTable}\n\n${COMMENT_WATERMARK}`;
    const githubParams = {
      number: PULL_REQUEST_NUMBER,
      owner,
      repo
    };
    const commentId = await getExistingCommentId({ ...githubParams, auth: GITHUB_TOKEN });
    if (commentId)
      return await octokit.issues.updateComment({ ...githubParams, comment_id: commentId, body });
    return octokit.issues.createComment({ ...githubParams, body });
  } catch (error) {
    console.error(error);
  }
}

export async function getExistingCommentId(params: IGetExistingCommentId): Promise<number> {
  const octokit = new Github({ auth: params.auth });
  const allComments = await octokit.issues.listComments({
    number: params.number,
    owner: params.owner,
    repo: params.repo
  });
  return (
    allComments.data
      .filter(comment => comment.body.includes(COMMENT_WATERMARK))
      .map(comment => comment.id)
      .pop() || 0
  );
}

export async function printStdout(args: IPrintableReport) {
  const totalTable = getConsoleTotalTable(args);
  const filesBreakdownTable = getFilesBreakDownTable(args);
  console.log(SHARED_TABLE_VALUES.TOTALS_TITLE);
  console.table(totalTable);
  console.log(SHARED_TABLE_VALUES.FILES_BREAKDOWN_TITLE);
  console.table(filesBreakdownTable);
}

const getConsoleTotalTable = ({
  report,
  currentBranchName,
  targetBranchName
}: IPrintableReport): IConsoleTable => {
  const table = getFormattedRows({
    currentBranchReport: squashReportByFileExtension(report.currentBranchReport),
    targetBranchReport: squashReportByFileExtension(report.targetBranchReport)
  });
  return table.map(([ext, currentSize, targetSize]) => ({
    [SHARED_TABLE_VALUES.FILE_EXTENSION]: ext,
    [currentBranchName]: currentSize,
    [targetBranchName]: targetSize
  }));
};

const getFilesBreakDownTable = ({
  currentBranchName,
  targetBranchName,
  report
}: IPrintableReport): any =>
  getFormattedRows(report).map(([fileName, currentSize, targetSize]) => ({
    [SHARED_TABLE_VALUES.FILE_NAME]: fileName,
    [currentBranchName]: currentSize,
    [targetBranchName]: targetSize
  }));

const sortByDelta = (a: IAbstractTableRow, b: IAbstractTableRow) => {
  const bDelta = b[1] - b[2];
  const aDelta = a[1] - a[2];
  if (bDelta - aDelta > 0) return 1;
  if (bDelta - aDelta < 0) return -1;
  return 0;
};
