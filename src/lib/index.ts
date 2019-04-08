// import printBytes from 'bytes';
import { exec as childProcessExec } from 'child_process';
import globby from 'globby';
import ora from 'ora';
import * as path from 'path';
import getSize from 'size-limit';
import * as util from 'util';
import {
  IBundleCheckerParams,
  IBundleCheckerReport,
  IBundleCheckerReportRow,
  ITotalSize
} from '../../types/bundle-checker-types';
import generateReportTable from './markdown-table-template';
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
        ['git branch', 'file size'],
        [currentBranch, `${JSON.stringify(currentSize)}`],
        [targetBranch, `${JSON.stringify(targetSize)}`]
      ];
    } catch (e) {
      this.spinner.fail(e);
      reportRows = [['Error', e]];
    }
    await this.destroy();
    return generateReportTable(reportRows);
  }

  private async init() {
    if (this.inputParams.gitRepository) {
      this.workDir = this.generateWorkDirName();
      await exec(`mkdir -p ${this.workDir}`);
      process.chdir(this.workDir);
      const { stdout } = await exec(`pwd`);
      console.log(`PWD: ${stdout}`);
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
    process.chdir(this.workDir);
    await exec(`git clone ${gitRepository} .`);
    this.spinner.succeed();
  }

  private async buildBranch(branch: string) {
    this.spinner.start(`Checkout`);
    await exec(`git checkout ${branch}`);
    this.spinner.succeed().start(`Install`);
    await exec(this.inputParams.installScript);
    this.spinner.succeed().start(`Building`);
    await exec(this.inputParams.buildScript);
    this.spinner.succeed();
  }

  private async getTotalSize(): Promise<ITotalSize> {
    this.spinner.start(`Calculate Size`);
    process.chdir(path.resolve(this.workDir, this.inputParams.distPath));
    const jsFiles = await this.getTargetedFiles(['**/*.js']);
    // const cssFiles = await this.getTargetedFiles(['**/*.css']);
    const jsSize = (await getSize(jsFiles)).parsed;
    // const cssSize = (await getSize(cssFiles)).parsed;
    this.spinner.succeed();
    process.chdir(path.resolve(this.workDir));
    return { css: 0, js: jsSize };
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
