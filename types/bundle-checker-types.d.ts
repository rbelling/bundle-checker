export interface IBundleCheckerReport {
  currentBranchReport: IFileSizeReport;
  targetBranchReport: IFileSizeReport;
}

export interface IBundleCheckerParams {
  // The build script that will be run as part of the bundle checker.
  buildScript: string;
  // The install script that downloads and install dependencies before the build can start.
  installScript: string;
  // Byte-size limit of parsed code (non-gzipped)
  sizeLimit?: number;
  // An array of patterns that is used to target build files.
  buildFilesPatterns: string[];
  // Github repo to clone and analyze
  gitRepository: string;
  currentBranch: string;
  targetBranch: string;
}

export interface IFileSizeReport {
  [key: string]: number;
}

export type ITableCell = string;

export type ITableRow = [ITableCell, ITableCell, ITableCell];

export interface IConsoleItem {
  [key: string]: string;
}
export type IConsoleTable = IConsoleItem[];

export interface IPrintableReport {
  report: IBundleCheckerReport;
  targetBranchName: string;
  currentBranchName: string;
}

export type IAbstractTableRow = [string, number, number];

export interface IGetExistingCommentId {
  auth: string;
  number: number;
  owner: string;
  repo: string;
}
