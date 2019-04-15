import { add, pipe, reduce, values } from 'ramda';
import BundleChecker from '..';
import { IBundleCheckerParams, IBundleCheckerReport } from '../../../types/bundle-checker-types';

const TEN_MINUTES = 10 * 60 * 1000;

const TEST_BRANCH = 'TEST_BRANCH_DO_NOT_DELETE';
const dummyParams: IBundleCheckerParams = {
  buildFilesPatterns: ['build/**/*.js'],
  buildScript: 'yarn build',
  currentBranch: TEST_BRANCH,
  gitRepository: 'https://github.com/rbelling/bundle-checker.git',
  installScript: 'yarn',
  targetBranch: TEST_BRANCH
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
        '/build/commands/compare.js': 2550,
        '/build/index.js': 149,
        '/build/lib/index.js': 5796,
        '/build/lib/utils.js': 3037
      },
      targetBranchReport: {
        '/build/commands/compare.js': 2550,
        '/build/index.js': 149,
        '/build/lib/index.js': 5796,
        '/build/lib/utils.js': 3037
      }
    });
  });

  test(`CurrentBranchReport has 4 entries`, async () => {
    expect(Object.entries(result.currentBranchReport).length).toEqual(4);
  });

  test(`TargetBranchReport has 4 entries`, async () => {
    expect(Object.entries(result.targetBranchReport).length).toEqual(4);
  });

  test(`CurrentBranchReport and TargetBranchReport has same total sizes`, async () => {
    const { currentBranchReport, targetBranchReport } = result;
    const getTotal = pipe(
      values,
      reduce(add, 0 as any)
    );
    expect(getTotal(targetBranchReport)).toEqual(getTotal(currentBranchReport));
  });
});
