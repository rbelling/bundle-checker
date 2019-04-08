import { Command, flags as OclifFlags } from '@oclif/command';
import BundleChecker from '../lib';

export default class Compare extends Command {
  public static description = 'Bundle size diff two revisions from a git repo.';
  public static examples = [
    `$ npx bundle-checker compare \
  --gitRepository='https://github.com/ramda/ramda.git' \
  --installScript='yarn' \
  --buildScript='yarn build:es' \
  --currentBranch='CrossEye-patch-1' \
  --distPath='dist' \
  --targetBranch='master'`
  ];
  public static flags = {
    buildScript: OclifFlags.string({ description: 'buildScript' }),
    currentBranch: OclifFlags.string({ description: 'currentBranch' }),
    distPath: OclifFlags.string({ description: 'distPath' }),
    gitRepository: OclifFlags.string({ description: 'gitRepository' }),
    help: OclifFlags.help({ char: 'h' }),
    installScript: OclifFlags.string({ description: 'installScript' }),
    targetBranch: OclifFlags.string({ description: 'targetBranch' })
  };
  public async run() {
    const { flags } = this.parse(Compare);
    this.validateInput(flags);
    const checker = new BundleChecker(flags as any);
    const result = await checker.compare();
    console.log(result);
  }

  private validateInput(flags: any) {
    const required = ['targetBranch', 'currentBranch', 'distPath', 'installScript', 'buildScript'];
    for (const key of required) {
      if (!flags[key]) throw new Error(`Invalid Input: missing ${key}.`);
    }
  }
}
