import * as path from 'path';
import bundleChecker, { getCurrentBranch } from '..';
import { IBundleCheckerParams } from '../../types/bundle-checker-types';

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_MEGABYTE = 1 * 1024 * 1024;

export const dummyParams: IBundleCheckerParams = {
  buildScript: `cd ${path.resolve(__dirname, '../../example')}; yarn build`,
  distPath: path.resolve(__dirname, '../../example/dist'),
  installScript: `cd ${path.resolve(__dirname, '../../example')}; yarn`,
  sizeLimit: ONE_MEGABYTE,
  targetFilesPattern: ['**/*.js']
};

describe('Bundle Stats tests', () => {
  jest.setTimeout(TEN_MINUTES);

  test(`Can get bundle size of two branches`, async done => {
    const { reportText } = await bundleChecker(dummyParams).compareBranches(
      await getCurrentBranch(),
      'master'
    );

    expect(reportText).toContain('Bundle size (');
    done();
  });
});
