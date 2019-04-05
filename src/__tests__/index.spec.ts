import BundleChecker from '..';
import { IBundleCheckerParams } from '../../types/bundle-checker-types';

const TEN_MINUTES = 10 * 60 * 1000;

const dummyParams: IBundleCheckerParams = {
  buildScript: 'yarn build:es',
  currentBranch: 'CrossEye-patch-1',
  distPath: 'es',
  githubRepo: 'https://github.com/ramda/ramda.git',
  installScript: 'yarn',
  targetBranch: 'master',
  targetFilesPattern: ['**/*.js']
};

describe('Bundle Checker', () => {
  jest.setTimeout(TEN_MINUTES);
  test(`Can get bundle size of two branches`, async done => {
    const checker = await new BundleChecker(dummyParams);
    const result = await checker.compare();
    expect(result).toContain('Current: {"css":0,"js":95362}');
    done();
  });
});
