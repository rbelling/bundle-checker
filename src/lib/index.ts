import { exec as childProcessExec } from 'child_process';
import globby from 'globby';
import ora from 'ora';
import * as path from 'path';
import { zipObj } from 'ramda';
import getSize from 'size-limit';
import * as util from 'util';
import {
  IBundleCheckerParams,
  IBundleCheckerReport,
  IFileSizeReport,
  ITableRow
} from '../../types/bundle-checker-types';
import { createMarkdownTable, getFormattedRows, groupByFileExtension } from './utils';
const exec = util.promisify(childProcessExec);
const { error } = console;

export default class BundleChecker {
  private workDir = '';
  private originalCwd = '';
  private spinner = ora(`Bundle checker`);
  private inputParams: IBundleCheckerParams;

  constructor(params: IBundleCheckerParams) {
    this.inputParams = params; // TODO: perform default override of some params
    this.originalCwd = process.cwd();
  }

  /*
   * Refactor this, it is doing too much
   * @deprecated This will be deleted soon. Please use `compare` instead
   */
  public async compareDeprecated(): Promise<string> {
    let reportRows: ITableRow[];
    const { currentBranch, targetBranch } = this.inputParams;
    try {
      await this.init();
      // --- CURRENT BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Revision: ${currentBranch}`);
      await this.buildBranch(currentBranch);
      const currentSize = await this.getTotalSize();

      // --- CLEAN
      this.spinner.indent = 0;
      await this.cleanDist();

      // --- TARGET BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Revision: ${targetBranch}`);
      await this.buildBranch(targetBranch);
      const targetSize = await this.getTotalSize();
      reportRows = [
        ['file type', targetBranch, currentBranch],
        ...getFormattedRows(targetSize, currentSize)
      ];
    } catch (e) {
      this.spinner.fail(e);
      reportRows = [['Error', e, '']];
    }
    await this.destroy();
    return createMarkdownTable(reportRows);
  }

  public async compare(): Promise<ITableRow[]> {
    const { currentBranch, targetBranch } = await this.compareEachFile();
    return getFormattedRows(currentBranch, targetBranch);
  }

  private async compareEachFile(): Promise<IBundleCheckerReport> {
    let report: IBundleCheckerReport = {
      currentBranch: {},
      targetBranch: {}
    };
    const { currentBranch, targetBranch } = this.inputParams;
    try {
      await this.init();
      // --- CURRENT BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Branch: ${currentBranch}`);
      await this.buildBranch(currentBranch);
      const currentBranchFilesSizes = await this.getFilesSizes();

      // --- CLEAN
      this.spinner.indent = 0;
      await this.cleanDist();

      // --- TARGET BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Branch: ${targetBranch}`);
      await this.buildBranch(targetBranch);
      const targetBranchFilesSizes = await this.getFilesSizes();
      report = {
        currentBranch: currentBranchFilesSizes,
        targetBranch: targetBranchFilesSizes
      };
    } catch (e) {
      this.spinner.fail(e);
      error(e);
    }
    await this.destroy();
    return report;
  }

  private async init() {
    if (this.inputParams.gitRepository) {
      this.workDir = this.generateWorkDirName();
      await exec(`mkdir -p ${this.workDir}`);
      process.chdir(this.workDir);
      const { stdout } = await exec(`pwd`);
      this.spinner.info(`PWD: ${stdout.trim()}`);
      await this.cloneRepo(this.inputParams.gitRepository);
    }
  }

  private async destroy() {
    if (this.inputParams.gitRepository) {
      process.chdir(this.originalCwd);
      await this.safeDeleteFolder(path.resolve(this.workDir));
    }
  }

  private generateWorkDirName = () => `/tmp/bundler-checker/${new Date().getTime()}`;

  private safeDeleteFolder = async (dir: string) => exec(`rm -Rf ${dir === '/' ? '' : dir}`);

  private async cloneRepo(gitRepository: string) {
    this.spinner.start(`Cloning ${gitRepository}`);
    await exec(`git clone ${gitRepository} .`);
    this.spinner.succeed();
  }

  private async buildBranch(branch: string) {
    this.spinner.start(`Checkout`);
    await exec(`git reset --hard`);
    await exec(`git clean -f`);
    await exec(`git checkout ${branch}`);
    this.spinner.succeed().start(`Install`);
    await exec(this.inputParams.installScript);
    this.spinner.succeed().start(`Building`);
    await exec(this.inputParams.buildScript);
    this.spinner.succeed();
  }

  private async getTotalSize(): Promise<IFileSizeReport> {
    this.spinner.start(`Calculate Size`);

    const groupedFiles = groupByFileExtension(
      await this.getTargetedFiles(
        this.inputParams.targetFilesPattern.map(_ => path.resolve(this.inputParams.distPath, _))
      )
    );
    const fileExtensions: string[] = Object.keys(groupedFiles);

    const fileSizes: number[] = await Promise.all(
      Object.values(groupedFiles).map(this.safeGetSize)
    );

    this.spinner.succeed();
    return zipObj(fileExtensions, fileSizes);
  }

  /**
   * Returns a list of each files (in a single branch) that are matched by IBundleCheckerParams.targetFilesPattern
   */
  private async getFilesSizes(): Promise<IFileSizeReport> {
    this.spinner.start(
      `Calculating sizes of files matching: \`${this.inputParams.targetFilesPattern}\``
    );

    const targetedFiles = await this.getTargetedFiles(
      this.inputParams.targetFilesPattern.map(_ => path.resolve(this.inputParams.distPath, _))
    );

    const fileSizes: number[] = await Promise.all(
      targetedFiles.map(file => this.safeGetSize([file]))
    );

    this.spinner.succeed();
    return zipObj(targetedFiles, fileSizes);
  }

  private async getTargetedFiles(regex: string[]): Promise<string[]> {
    try {
      return await globby(regex.map(item => path.resolve(item)));
    } catch {
      return [];
    }
  }

  private async cleanDist() {
    this.spinner.start(`Cleaning dist`);
    await this.safeDeleteFolder(path.resolve(this.workDir, this.inputParams.distPath));
    this.spinner.succeed();
  }

  private async safeGetSize(files: string[] | string): Promise<number> {
    try {
      // Todo: add `gzip: false` in the options, since we're only intereseted in parsed size
      return (await getSize(files, { webpack: false })).parsed;
    } catch {
      return 0;
    }
  }
}
