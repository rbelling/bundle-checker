import printBytes from 'bytes';
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
  IBundleCheckerReportRow,
  ITotalSize
} from '../../types/bundle-checker-types';
import { createMarkdownTable, getTotalSizeRows, groupByFileExtension } from './utils';
const exec = util.promisify(childProcessExec);

export default class BundleChecker {
  private workDir = '';
  private originalCwd = '';
  private spinner = ora(`Bundle checker`);
  private inputParams: IBundleCheckerParams;

  constructor(params: IBundleCheckerParams) {
    this.inputParams = params; // TODO: perform default override of some params
    this.originalCwd = process.cwd();
  }

  // Refactor this, it is doing too much
  public async compare(): Promise<IBundleCheckerReport> {
    let reportRows: IBundleCheckerReportRow[];
    const { currentBranch, targetBranch } = this.inputParams;
    try {
      await this.init();
      // --- CURRENT BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Revision: ${currentBranch}`);
      await this.buildBranch(currentBranch);
      const currentSize: ITotalSize = await this.getTotalSize();

      // --- CLEAN
      this.spinner.indent = 0;
      await this.cleanDist();

      // --- TARGET BRANCH
      this.spinner.indent = 4;
      this.spinner.info(`Revision: ${targetBranch}`);
      await this.buildBranch(targetBranch);
      const targetSize: ITotalSize = await this.getTotalSize();
      reportRows = [
        ['file type', targetBranch, currentBranch],
        ...getTotalSizeRows(targetSize, currentSize)
      ];
    } catch (e) {
      this.spinner.fail(e);
      reportRows = [['Error', e, '']];
    }
    await this.destroy();
    return createMarkdownTable(reportRows);
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

  private async getTotalSize(): Promise<ITotalSize> {
    this.spinner.start(`Calculate Size`);

    const groupedFiles = groupByFileExtension(
      await this.getTargetedFiles(
        this.inputParams.targetFilesPattern.map(_ => path.resolve(this.inputParams.distPath, _))
      )
    );
    const fileExtensions: string[] = Object.keys(groupedFiles);

    const fileSizes: number[] = await Promise.all(
      Object.values(groupedFiles).map(_ => getSize(_, { webpack: false }))
      // Todo use parsed here
    );
    const recomposedObject: ITotalSize = zipObj(fileExtensions, fileSizes);
    process.chdir(path.resolve(this.workDir));

    this.spinner.succeed();
    return recomposedObject;
  }

  private getTargetedFiles = async (regex: string[]): Promise<string[]> =>
    globby(regex.map(item => path.resolve(item)) as ReadonlyArray<string>);

  private cleanDist = async () => {
    this.spinner.start(`Cleaning dist`);
    await this.safeDeleteFolder(path.resolve(this.workDir, this.inputParams.distPath));
    this.spinner.succeed();
  };

  // private safeGetSize() {
  //   // TODO: implemente getsize with size-limit with try{}catch{ return 0;}
  // }
}
