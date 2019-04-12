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
  IFileSizeReport
} from '../../types/bundle-checker-types';
const exec = util.promisify(childProcessExec);
const { error } = console;

export default class BundleChecker {
  private workDir = '';
  private originalCwd = '';
  private spinner = ora(`Bundle checker`);
  private inputParams: IBundleCheckerParams;

  constructor(params: IBundleCheckerParams) {
    this.inputParams = params;
    this.originalCwd = process.cwd();
  }

  public async compare(): Promise<IBundleCheckerReport> {
    let report: IBundleCheckerReport = {
      currentBranchReport: {},
      targetBranchReport: {}
    };
    const { currentBranch, targetBranch } = this.inputParams;
    try {
      await this.init();
      // --- TARGET BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Branch: ${targetBranch}`);
      await this.buildBranch(targetBranch);
      const targetBranchFilesSizes = await this.getFilesSizes();

      // --- CLEAN
      this.spinner.indent = 0;
      await this.cleanDist();

      // --- CURRENT BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Branch: ${currentBranch}`);
      await this.buildBranch(currentBranch);
      const currentBranchFilesSizes = await this.getFilesSizes();
      report = {
        currentBranchReport: currentBranchFilesSizes,
        targetBranchReport: targetBranchFilesSizes
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
      this.spinner.info(`Working Directory: ${stdout.trim()}`);
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
    return zipObj(
      targetedFiles.map(file => file.split(this.workDir).pop()) as ReadonlyArray<string>,
      fileSizes
    );
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
