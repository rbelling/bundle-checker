import * as getPrettierFileSize from "bytes";
import { exec as childProcessExec } from "child_process";
import * as globby from "globby";
import ora from "ora";
import * as path from "path";
import * as getSize from "size-limit";
import * as util from "util";
import {
  IBundleCheckerParams,
  IBundleCheckerReport
} from "../types/bundle-checker-types";

const exec = util.promisify(childProcessExec);
const spinner = ora();

/**
 * Run the build script, then return the files matched by the targetFilesPattern glob
 * @param buildScript
 * @param targetFilesPattern
 */
const getBuiltFiles = async (
  buildScript: string,
  targetFilesPattern: string[]
): Promise<string[]> => {
  spinner.start(`Running build script: \`${buildScript}\``);
  await exec(buildScript);
  spinner.succeed();

  return globby(targetFilesPattern);
};

export const generateBundleStats = async ({
  buildScript,
  distPath = "",
  sizeLimit,
  targetFilesPattern
}: IBundleCheckerParams): Promise<IBundleCheckerReport> => {
  const builtFiles = await getBuiltFiles(
    buildScript,
    targetFilesPattern.map(item => path.resolve(distPath, item))
  );
  const size = await getSize(builtFiles);
  const sizeSurplus = size.parsed - sizeLimit;
  const prettyBundleSize = getPrettierFileSize(size.parsed);
  const prettyBundleLimit = getPrettierFileSize(sizeLimit);
  if (sizeSurplus > 0) {
    const error = `ERROR: Project is currently ${prettyBundleSize}, which is ${getPrettierFileSize(
      sizeSurplus
    )} larger than the maximum allowed size (${prettyBundleLimit}).`;
    throw new Error(error);
  }
  return {
    reportText: `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`
  };
};

export default generateBundleStats;
