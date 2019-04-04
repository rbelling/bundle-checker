import prettyPrint from 'bytes';
import { exec as childProcessExec } from 'child_process';
import globby from 'globby';
import ora from 'ora';
import * as path from 'path';
import getSize from 'size-limit';
import * as util from 'util';
import { IBundleCheckerParams, IBundleCheckerReport } from '../types/bundle-checker-types';

const exec = util.promisify(childProcessExec);
const { error } = console;

export const getCurrentBranch = async (): Promise<string> =>
{
  return (await exec(`git rev-parse --abbrev-ref HEAD`)).stdout.trim();
};

export default (bundleCheckerParams: IBundleCheckerParams) => {
  const installDependencies = async (): Promise<undefined> => {
    const { installScript } = bundleCheckerParams;
    const spinner = ora(`Installing dependencies`);
    spinner.start();
    await exec(installScript);
    spinner.succeed();

    return;
  };

  const getBundleSize = async (branch?: string): Promise<number> => {
    const initialBranch = await getCurrentBranch();
    const targetBranch = branch || initialBranch;
    const spinner = ora(`${targetBranch}: Getting bundle size`);
    const getTargetedFiles = async (): Promise<string[]> => {
      const { buildScript, distPath, targetFilesPattern } = bundleCheckerParams;
      spinner.start(`${targetBranch}: Running build script: ${buildScript}`);
      await exec(buildScript);
      spinner.succeed();

      return globby(targetFilesPattern.map(item => path.resolve(distPath, item)) as ReadonlyArray<
        string
      >);
    };

    const isInitialBranchDirty = Boolean(await exec(`git status --porcelain`));
    if (isInitialBranchDirty) {
      spinner.start(`${initialBranch} is dirty - stashing changes`);
      await exec(`git stash`);
    }
    await exec(`git checkout ${targetBranch}`);
    await installDependencies();
    const bundleSize = (await getSize(await getTargetedFiles())).parsed;

    // Restore repository back to the original branch
    await exec(`git reset --hard`);
    await exec(`git clean -f`);
    await exec(`git checkout ${initialBranch}`);
    if (isInitialBranchDirty) {
      await exec(`git stash apply`);
    }

    return bundleSize;
  };

  const generateBundleStats = async (): Promise<IBundleCheckerReport> => {
    const bundleSize = await getBundleSize();
    const prettyBundleSize = prettyPrint(bundleSize);
    const prettyBundleLimit = prettyPrint(bundleCheckerParams.sizeLimit);
    const sizeSurplus = bundleSize - bundleCheckerParams.sizeLimit;
    const reportText =
      sizeSurplus > 0
        ? `WARN: Project is currently ${prettyBundleSize}, which is ${prettyPrint(
            sizeSurplus
          )} larger than the maximum allowed size (${prettyBundleLimit}).`
        : `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`;
    return { reportText };
  };

  const compareBranches = async (...args: string[]): Promise<IBundleCheckerReport> => {
    const spinner = ora(`Comparing bundles in the following branches: ${args.join(', ')}`);
    let reportText = ``;

    try {
      spinner.start();
      for (const branch of args) {
        const bundleSize = await getBundleSize(branch);
        reportText += `
          Bundle size ${branch}: ${prettyPrint(bundleSize)}
        `;
      }
      spinner.succeed();
    } catch (e) {
      spinner.fail();
      error(e);
      reportText = e;
    }

    return {
      reportText
    };
  };

  return {
    compareBranches,
    generateBundleStats
  };
};
