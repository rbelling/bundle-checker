import { exec as childProcessExec } from 'child_process';
import { danger, markdown, message, warn } from 'danger';
import * as util from 'util';
import BundleChecker from './src/index';
import { IBundleCheckerParams } from './types/bundle-checker-types';

const exec = util.promisify(childProcessExec);

(async () => {
  const bundleCheckerParams: IBundleCheckerParams = await {
    buildScript: 'yarn build',
    currentBranch: (await exec(`git rev-parse --abbrev-ref HEAD`)).stdout.trim(),
    distPath: 'build',
    githubRepo: 'https://github.com/rbelling/bundle-checker.git',
    installScript: 'yarn',
    targetBranch: 'master',
    targetFilesPattern: ['**/*.js']
  };

  const checker = new BundleChecker(bundleCheckerParams);
  const { reportText } = await checker.compare();

  message(`:tada: ${reportText}`);
})();
