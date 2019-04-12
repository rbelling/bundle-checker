import { Command, flags as OclifFlags } from '@oclif/command';
import { exec as childProcessExec } from 'child_process';
import * as util from 'util';
import BundleChecker from '../lib';
import { commentOnPr, printStdout } from '../lib/utils';

const exec = util.promisify(childProcessExec);

export default class Compare extends Command {
  public static description = 'Compare the size of build files in two git branches.';
  public static examples = [`$ npx bundle-checker compare`];

  // TODO: Define interface for this.
  public static flags = {
    buildScript: OclifFlags.string({ description: 'buildScript', default: 'npm run build' }),
    currentBranchName: OclifFlags.string({
      description: '[default: branch detected] currentBranchName'
    }),
    distPath: OclifFlags.string({ description: 'distPath', default: 'dist' }),
    gitRepository: OclifFlags.string({ description: '[default: current git repo] gitRepository' }),
    help: OclifFlags.help({ char: 'h' }),
    installScript: OclifFlags.string({ description: 'installScript', default: 'npm install' }),
    prComment: OclifFlags.boolean({ description: 'Comment on PR', default: false }),
    targetBranchName: OclifFlags.string({ description: 'targetBranchName', default: 'master' }),
    targetFilesPattern: OclifFlags.string({
      default: '**/*.js,**/*.css',
      description: 'targetFilesPattern',
      required: true
    })
  };
  public async run() {
    const { flags } = this.parse(Compare);
    const localFlags = await this.mergeFlagsWithDefaults(flags);
    const { currentBranchName, targetBranchName } = localFlags;
    const checker = new BundleChecker(localFlags);
    const report = await checker.compare();
    if (flags.prComment) {
      await commentOnPr({ currentBranchName, report, targetBranchName });
    }
    await printStdout({ currentBranchName, report, targetBranchName });
  }
  private async mergeFlagsWithDefaults(flags: any) {
    const defaults = {} as any;
    if (!flags.currentBranchName) {
      const { stdout } = await exec('git rev-parse --abbrev-ref HEAD');
      defaults.currentBranchName = stdout.trim();
    }
    return { ...defaults, ...flags, targetFilesPattern: flags.targetFilesPattern.split(',') };
  }
}
