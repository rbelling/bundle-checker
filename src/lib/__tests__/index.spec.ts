import { add, pipe, reduce, values } from 'ramda';
import BundleChecker from '..';
import { IBundleCheckerParams, IBundleCheckerReport } from '../../../types/bundle-checker-types';

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

  let result: IBundleCheckerReport;
  beforeAll(async () => {
    const checker = new BundleChecker(dummyParams);
    result = await checker.compareEachFile();
  });

  test(`Can get bundle size of two branches`, async () => {
    expect(result).not.toBe(undefined);
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
