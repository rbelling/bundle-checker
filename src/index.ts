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
const spinner = ora();

const installDependencies = async (
  bundleCheckerParams: IBundleCheckerParams
): Promise<undefined> => {
  const { installScript } = bundleCheckerParams;
  spinner.start(`Installing dependencies with: \`${installScript}\``);
  await exec(installScript);
  spinner.succeed();

  return;
};

/**
 * Run the build script, then return the files matched by the targetFilesPattern glob
 * @param bundleCheckerParams
 */
const getBuiltFiles = async (
  bundleCheckerParams: IBundleCheckerParams
): Promise<string[]> => {
  const { buildScript, distPath, targetFilesPattern } = bundleCheckerParams;

  spinner.start(`Running build script: \`${buildScript}\``);
  await exec(buildScript);
  spinner.succeed();

  return globby(targetFilesPattern.map(item =>
    path.resolve(distPath, item)
  ) as ReadonlyArray<string>);
};

export const generateBundleStats = async (
  bundleCheckerParams: IBundleCheckerParams
): Promise<IBundleCheckerReport> => {
  await installDependencies(bundleCheckerParams);
  const builtFiles = await getBuiltFiles(bundleCheckerParams);
  const size = await getSize(builtFiles);
  const prettyBundleSize = prettyPrint(size.parsed);
  const prettyBundleLimit = prettyPrint(bundleCheckerParams.sizeLimit);
  const sizeSurplus = size.parsed - bundleCheckerParams.sizeLimit;
  const reportText =
    sizeSurplus > 0
      ? `WARN: Project is currently ${prettyBundleSize}, which is ${prettyPrint(
          sizeSurplus
        )} larger than the maximum allowed size (${prettyBundleLimit}).`
      : `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`;
  return { reportText };
};
