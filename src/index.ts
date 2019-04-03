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

/**
 * Run the build script, then return the files matched by the targetFilesPattern glob
 * @param buildScript the build script (e.g. `cd ../; npm run build`
 * @param distPath string, the build folder path, that will be prepended to the targetFilesPattern
 * @param targetFilesPattern an absolute p
 */
const getBuiltFiles = async (
  buildScript: string,
  distPath: string,
  targetFilesPattern: string[]
): Promise<string[]> => {
  spinner.start(`Running build script: \`${buildScript}\``);
  await exec(buildScript);
  spinner.succeed();

  return globby(targetFilesPattern.map(item =>
    path.resolve(distPath, item)
  ) as ReadonlyArray<string>);
};

export const generateBundleStats = async ({
  buildScript,
  distPath = "",
  sizeLimit,
  targetFilesPattern
}: IBundleCheckerParams): Promise<IBundleCheckerReport> => {
  const builtFiles = await getBuiltFiles(
    buildScript,
    distPath,
    targetFilesPattern
  );
  const size = await getSize(builtFiles);
  const prettyBundleSize = prettyPrint(size.parsed);
  const prettyBundleLimit = prettyPrint(sizeLimit);
  const sizeSurplus = size.parsed - sizeLimit;
  const reportText =
    sizeSurplus > 0
      ? `WARN: Project is currently ${prettyBundleSize}, which is ${prettyPrint(
          sizeSurplus
        )} larger than the maximum allowed size (${prettyBundleLimit}).`
      : `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`;
  return { reportText };
};

export default generateBundleStats;
