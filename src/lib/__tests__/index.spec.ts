import BundleChecker from '..';
import { IBundleCheckerParams, IBundleCheckerReport } from '../../../types/bundle-checker-types';

const TEN_MINUTES = 10 * 60 * 1000;

const dummyParams: IBundleCheckerParams = {
  buildFilesPatterns: ['build/**/*.js'],
  buildScript: 'yarn build',
  currentBranch: 'BLOATED_DO_NOT_DELETE',
  gitRepository: 'https://github.com/rbelling/bundle-checker.git',
  installScript: 'yarn',
  targetBranch: 'SLIM_DO_NOT_DELETE'
};

describe('Bundle Checker', () => {
  jest.setTimeout(TEN_MINUTES);

  let result: IBundleCheckerReport;
  beforeAll(async () => {
    const checker = new BundleChecker(dummyParams);
    result = await checker.compare();
  });

  test(`Can get bundle size of two branches`, async () => {
    expect(result).toEqual({
      currentBranchReport: {
        '/build/commands/compare.js': 4062,
        '/build/index.js': 149,
        '/build/lib/index.js': 7316,
        '/build/lib/utils.js': 8993
      },
      targetBranchReport: {
        '/build/commands/compare.js': 3873,
        '/build/index.js': 149,
        '/build/lib/index.js': 7316,
        '/build/lib/utils.js': 8993
      }
    });
  });
});
