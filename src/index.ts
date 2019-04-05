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
  ITotalSize
} from '../types/bundle-checker-types';
const exec = util.promisify(childProcessExec);

export default class BundleChecker {
  private workDir = '';
  private spinner = ora(`Bundle checker`);
  private inputParams: IBundleCheckerParams;

  constructor(params: IBundleCheckerParams) {
    this.inputParams = params; // TODO: perform default override of some params
    this.workDir = this.generateWorkDirName();
  }

  public async compare(): Promise<IBundleCheckerReport> {
    await this.init();
    const { githubRepo, currentBranch, targetBranch } = this.inputParams;
    try {
      process.chdir(this.workDir);
      const { stdout } = await exec(`pwd`);
      console.log(`PWD: ${stdout}`);
      await this.cloneRepo(githubRepo);
      // --- CURRENT
      this.spinner.indent = 4;
      this.spinner.info(`Revision: ${currentBranch}`);
      await this.buildBranch(currentBranch);
      const currentSize = await this.getTotalSize();
      // --- CLEAN
      this.spinner.indent = 0;
      await this.cleanDist();
      // --- TARGET
      this.spinner.indent = 4;
      this.spinner.info(`Revision: ${targetBranch}`);
      await this.buildBranch(targetBranch);
      const targetSize = await this.getTotalSize();
      return this.generateReport(`
      Current: ${JSON.stringify(currentSize)},
      Target:${JSON.stringify(targetSize)}
      `);
    } catch (e) {
      console.log(e);
      console.log(JSON.stringify(e));
      this.spinner.fail(e);
      return this.generateReport(e);
    }
  }

  private async init() {
    // TODO: check if we have all the permissions
    await this.makeFolder(this.workDir);
  }

  // private printResult(current: string, target: string) {
  //   this.spinner.info(`Current: ${printBytes(current)}`);
  //   this.spinner.info(`Target: ${printBytes(target)}`);
  //   this.spinner.info(`Diff: ${printBytes(parseInt(current, 10) - parseInt(target, 10))}`);
  // }

  private generateWorkDirName = () => `/tmp/bundler-checker/${new Date().getTime()}`;
  private makeFolder = async (dir: string) => exec(`mkdir -p ${dir}`);

  private cloneRepo = async (githubRepo: string) => {
    this.spinner.start(`Cloning ${githubRepo}`);
    process.chdir(this.workDir);
    await exec(`git clone ${githubRepo} .`);
    this.spinner.succeed();
  };
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
    if (this.workDir === '/' || !this.workDir) {
      return Promise.reject('WorkDir invalid.');
    }
    await exec(`rm -rf ${path.resolve(this.workDir, this.inputParams.distPath)}`);
    this.spinner.succeed();
  };

  private generateReport = (input: any): IBundleCheckerReport => ({ reportText: input });

  // private safeGetSize() {
  //   // TODO: implemente getsize with size-limit with try{}catch{ return 0;}
  // }
}
