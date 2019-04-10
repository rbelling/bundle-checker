import { Command, flags as OclifFlags } from '@oclif/command';
import { exec as childProcessExec } from 'child_process';
import * as util from 'util';
import BundleChecker from '../lib';

const exec = util.promisify(childProcessExec);

export default class Compare extends Command {
  public static description = 'Compare JS/CSS bundles of two git branches.';
  public static examples = [`$ npx bundle-checker compare`];

  public static flags = {
    buildScript: OclifFlags.string({ description: 'buildScript', default: 'npm run build' }),
    currentBranch: OclifFlags.string({ description: '[default: branch detected] currentBranch' }),
    distPath: OclifFlags.string({ description: 'distPath', default: 'dist' }),
    gitRepository: OclifFlags.string({ description: '[default: current git repo] gitRepository' }),
    help: OclifFlags.help({ char: 'h' }),
    installScript: OclifFlags.string({ description: 'installScript', default: 'npm install' }),
    prComment: OclifFlags.boolean({ description: 'Comment on PR', default: false }),
    targetBranch: OclifFlags.string({ description: 'targetBranch', default: 'master' }),
    targetFilesPattern: OclifFlags.string({
      default: '**/*.js,**/*.css',
      description: 'targetFilesPattern',
      required: true
    })
  };
  public async run() {
    const { flags } = this.parse(Compare);
    const localFlags = await this.mergeFlagsWithDefaults(flags);
    const checker = new BundleChecker(localFlags);
    const result = await checker.compareByFileExtension();
    if (flags.prComment) await checker.commentOnPr(result);
    console.log(result);
  }
  private async mergeFlagsWithDefaults(flags: any) {
    const defaults = {} as any;
    if (!flags.currentBranch) {
      const { stdout } = await exec('git rev-parse --abbrev-ref HEAD');
      defaults.currentBranch = stdout.trim();
    }
    return { ...defaults, ...flags, targetFilesPattern: flags.targetFilesPattern.split(',') };
  }
}
