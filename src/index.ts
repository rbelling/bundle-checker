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

const installDependencies = async (
  bundleCheckerParams: IBundleCheckerParams
): Promise<undefined> => {
  const { installScript } = bundleCheckerParams;
  const spinner = ora(`Installing dependencies with: \`${installScript}\``);
  spinner.start();
  await exec(installScript);
  spinner.succeed();

  return;
};

const getBundleSize = async (
  bundleCheckerParams: IBundleCheckerParams
): Promise<number> => {
  await installDependencies(bundleCheckerParams);
  const getTargetedFiles = async (): Promise<string[]> => {
    const { buildScript, distPath, targetFilesPattern } = bundleCheckerParams;
    const spinner = ora(`Running build script: \`${buildScript}\``);

    spinner.start();
    await exec(buildScript);
    spinner.succeed();

    return globby(targetFilesPattern.map(item =>
      path.resolve(distPath, item)
    ) as ReadonlyArray<string>);
  };
  return (await getSize(await getTargetedFiles())).parsed;
};

export const generateBundleStats = async (
  bundleCheckerParams: IBundleCheckerParams
): Promise<IBundleCheckerReport> => {
  const bundleSize = await getBundleSize(bundleCheckerParams);
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
