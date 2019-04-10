import BundleChecker from '..';
import { IBundleCheckerParams } from '../../../types/bundle-checker-types';

const TEN_MINUTES = 10 * 60 * 1000;

const dummyParams: IBundleCheckerParams = {
  buildScript: 'yarn build',
  currentBranch: 'TEST_BRANCH_DO_NOT_DELETE',
  distPath: 'build',
  gitRepository: 'https://github.com/rbelling/bundle-checker.git',
  installScript: 'yarn',
  targetBranch: 'TEST_BRANCH_DO_NOT_DELETE',
  targetFilesPattern: ['**/*.js']
};

describe('Bundle Checker', () => {
  jest.setTimeout(TEN_MINUTES);
  test(`Can get bundle size of two branches`, async () => {
    const checker = new BundleChecker(dummyParams);
    const result = await checker.compareByFileExtension();
    expect(result).toEqual([['js', '11.26KB', '11.26KB']]);
  });
});
