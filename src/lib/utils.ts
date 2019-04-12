import Github from '@octokit/rest';
import printBytes from 'bytes';
import { groupBy, zipObj } from 'ramda';
import {
  IAbstractTableRow,
  IBundleCheckerReport,
  IConsoleTable,
  IFileSizeReport,
  IPrintableReport,
  ITableRow
} from '../../types/bundle-checker-types';

const SHARED_TABLE_VALUES = {
  FILES_BREAKDOWN_TITLE: 'FILE BREAKDOWN',
  FILE_EXTENSION: 'extension',
  FILE_NAME: 'name',
  TOTALS_TITLE: 'TOTALS'
};

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
    .map(
      fileName =>
        [
          fileName,
          report.currentBranchReport[fileName] || 0,
          report.targetBranchReport[fileName] || 0
        ] as IAbstractTableRow
    )
    .sort(sortByDelta)
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

/**
 * Posts a comment on a Pull Request, or updates an existing one if found
 * @param table
 */
export async function commentOnPr({
  currentBranchName,
  report,
  targetBranchName
}: IPrintableReport) {
  const COMMENT_WATERMARK = 'a watermark that lets us identify comments posted by bundle-checker';
  const overviewTable = `### ${SHARED_TABLE_VALUES.TOTALS_TITLE}\n${createMarkdownTable([
    ['name', currentBranchName, targetBranchName],
    ...getFormattedRows({
      currentBranchReport: squashReportByFileExtension(report.currentBranchReport),
      targetBranchReport: squashReportByFileExtension(report.targetBranchReport)
    })
  ])}`;
  const filesBreakDownTable = `### ${
    SHARED_TABLE_VALUES.FILES_BREAKDOWN_TITLE
  }\n${createMarkdownTable([
    [SHARED_TABLE_VALUES.FILE_EXTENSION, currentBranchName, targetBranchName],
    ...getFormattedRows(report)
  ])}`;

  try {
    const { GITHUB_TOKEN, TRAVIS_PULL_REQUEST, TRAVIS_PULL_REQUEST_SLUG } = process.env as any;
    const [owner, repo] = TRAVIS_PULL_REQUEST_SLUG.split('/');
    const octokit = new Github({ auth: GITHUB_TOKEN });
    const prComment = {
      body: `${overviewTable}\n\n${filesBreakDownTable}\n\n${COMMENT_WATERMARK}`,
      number: TRAVIS_PULL_REQUEST,
      owner,
      repo
    };
    const existingCommentIDs = await (async (): Promise<number[]> => {
      /*
       * 1. Retrieve all comments of the current PR
       * 2. If there is an existing comment by the bundle-checker bot, update that
       */
      const userID = 'bundle-checker-bot';
      const allComments = [
        {
          body: `A comment on github, posted by the bundle-checker bot.${COMMENT_WATERMARK}`,
          id: 123456,
          user: {
            id: 'bundle-checker-bot'
          }
        }
      ];
      return allComments
        .filter(comment => comment.user.id === userID)
        .filter(comment => comment.body.includes(COMMENT_WATERMARK))
        .map(comment => comment.id); // only return IDs
    })();
    if (existingCommentIDs.length && false) {
      await octokit.issues.updateComment({
        ...prComment,
        comment_id: existingCommentIDs[0]
      });
    } else {
      await octokit.issues.createComment(prComment);
    }
  } catch (error) {
    console.error(error);
  }
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
