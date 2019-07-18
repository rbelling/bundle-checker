import { Command, flags as OclifFlags } from '@oclif/command';
import { exec as childProcessExec } from 'child_process';
import * as util from 'util';
import BundleChecker from '../lib';
import { commentOnPr, generateMarkdownReport, printStdout } from '../lib/utils';

const exec = util.promisify(childProcessExec);

export default class Compare extends Command {
  public static description = 'Compare the size of build files in two git branches.';
  public static examples = [`$ npx bundle-checker compare`];

  // TODO: Define interface for this.
  public static flags = {
    buildFilesPatterns: OclifFlags.string({
      default: 'build/**/*.js,build/**/*.css',
      description: 'buildFilesPatterns',
      required: true
    }),
    buildScript: OclifFlags.string({
      default: 'NODE_ENV=production npm run build',
      description: 'buildScript'
    }),
    currentBranch: OclifFlags.string({
      description: '[default: branch detected] currentBranch'
    }),
    gitRepository: OclifFlags.string({ description: '[default: current git repo] gitRepository' }),
    help: OclifFlags.help({ char: 'h' }),
    installScript: OclifFlags.string({
      default: 'npm ci || npm install',
      description: 'installScript'
    }),
    prComment: OclifFlags.boolean({ description: 'Comment on PR', default: false }),
    targetBranch: OclifFlags.string({ description: 'targetBranch', default: 'master' })
  };
  public async run() {
    const { flags } = this.parse(Compare);
    const localFlags = await this.mergeFlagsWithDefaults(flags);
    const { currentBranch: currentBranchName, targetBranch: targetBranchName } = localFlags;
    const checker = new BundleChecker(localFlags);
    if (flags.prComment) {
      await commentOnPr(
        `Please wait while \`bundle-checker\` compares \`${currentBranchName}\` and \`${targetBranchName}\` ⌛`
      );
    }
    const report = await checker.compare();
    if (flags.prComment) {
      await commentOnPr(generateMarkdownReport({ currentBranchName, report, targetBranchName }));
    }
    await printStdout({ currentBranchName, report, targetBranchName });
  }
  private async mergeFlagsWithDefaults(flags: any) {
    const defaults = {} as any;
    if (!flags.currentBranch) {
      const { stdout } = await exec('git rev-parse --abbrev-ref HEAD');
      defaults.currentBranch = stdout.trim();
    }
    return {
      ...defaults,
      ...flags,
      buildFilesPatterns: flags.buildFilesPatterns.replace(/\s/g, '').split(',')
    };
  }
}
