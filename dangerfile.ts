import { exec as childProcessExec } from 'child_process';
// tslint:disable-next-line no-implicit-dependencies
import { message } from 'danger';
import * as util from 'util';
import BundleChecker from './src/lib/index';
import { IBundleCheckerParams } from './types/bundle-checker-types';

const exec = util.promisify(childProcessExec);

(async () => {
  const bundleCheckerParams: IBundleCheckerParams = {
    buildScript: 'yarn build:es',
    currentBranch: 'CrossEye-patch-1',
    distPath: 'es',
    gitRepository: 'https://github.com/ramda/ramda.git',
    installScript: 'yarn',
    targetBranch: 'master',
    targetFilesPattern: ['**/*.js']
  };

  const checker = new BundleChecker(bundleCheckerParams);
  const reportText = await checker.compare();

  message(reportText);
})();
