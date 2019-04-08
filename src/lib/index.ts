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
} from '../../types/bundle-checker-types';
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
    let result: IBundleCheckerReport;
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
      result = this.generateReport(`
        Current: ${JSON.stringify(currentSize)},
        Target:${JSON.stringify(targetSize)}`);
    } catch (e) {
      this.spinner.fail(e);
      result = { reportText: '0' };
    }
    await this.destroy();
    return result;
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
    const jsFiles = await this.getTargetedFiles([`${this.inputParams.distPath}/**/*.js`]);
    // const cssFiles = await this.getTargetedFiles(['**/*.css']);
    const jsSize = (await getSize(jsFiles)).parsed;
    // const cssSize = (await getSize(cssFiles)).parsed;
    this.spinner.succeed();
    return { css: 0, js: jsSize };
  }

  private getTargetedFiles = async (regex: string[]): Promise<string[]> =>
    globby(regex.map(item => path.resolve(item)) as ReadonlyArray<string>);

  private cleanDist = async () => {
    this.spinner.start(`Cleaning dist`);
    await this.safeDeleteFolder(path.resolve(this.workDir, this.inputParams.distPath));
    this.spinner.succeed();
  };

  private generateReport = (input: any): IBundleCheckerReport => ({ reportText: input });
  // private safeGetSize() {
  //   // TODO: implemente getsize with size-limit with try{}catch{ return 0;}
  // }
}
