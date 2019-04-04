import prettyPrint from "bytes";
import { exec as childProcessExec } from "child_process";
import globby from "globby";
import ora from "ora";
import * as path from "path";
import getSize from "size-limit";
import * as util from "util";
import {
  IBundleCheckerParams,
  IBundleCheckerReport
} from "../types/bundle-checker-types";

const exec = util.promisify(childProcessExec);
const { error } = console;

const getCurrentBranch = async (): Promise<string> => {
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
    const getTargetedFiles = async (): Promise<string[]> => {
      const { buildScript, distPath, targetFilesPattern } = bundleCheckerParams;
      const spinner = ora(`${branch || initialBranch}: Running build script`);

      spinner.start();
      await exec(buildScript);
      spinner.succeed();

      return globby(targetFilesPattern.map(item =>
        path.resolve(distPath, item)
      ) as ReadonlyArray<string>);
    };

    await exec(`git stash`);
    await exec(`git checkout ${branch || initialBranch}`);
    await installDependencies();
    const bundleSize = (await getSize(await getTargetedFiles())).parsed;

    // Restore repository back to the original branch
    await exec(`git reset --hard`);
    await exec(`git clean -f`);
    await exec(`git checkout ${initialBranch}`);
    await exec(`git stash apply`);

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

  const compareBranches = async (
    firstBranch: string,
    secondBranch: string
  ): Promise<IBundleCheckerReport> => {
    const spinner = ora(
      `Comparing bundles in the following branches: ${firstBranch}, ${secondBranch}`
    );
    let reportText;

    try {
      spinner.start();
      const firstBranchBundleSize = await getBundleSize(firstBranch);
      const secondBranchBundleSize = await getBundleSize(secondBranch);

      reportText = `
      Bundle size ${firstBranch}: ${firstBranchBundleSize}
      Bundle size ${secondBranch}: ${secondBranchBundleSize}
    `;
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
