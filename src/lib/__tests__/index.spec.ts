import BundleChecker from '..';
import { IBundleCheckerParams } from '../../../types/bundle-checker-types';

const TEN_MINUTES = 10 * 60 * 1000;

const dummyParams: IBundleCheckerParams = {
  buildScript: 'yarn build',
  currentBranch: 'master',
  distPath: 'build',
  gitRepository: 'https://github.com/rbelling/bundle-checker.git',
  installScript: 'yarn',
  targetBranch: 'master',
  targetFilesPattern: ['**/*.js']
};

describe('Bundle Checker', () => {
  jest.setTimeout(TEN_MINUTES);
  test(`Can get bundle size of two branches`, async () => {
    const checker = new BundleChecker(dummyParams);
    const result = await checker.compare();
    expect(result).toContain('master | ');
  });
});
