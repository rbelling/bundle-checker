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
} from "./types/bundle-checker-types";

const dummyParams: IBundleCheckerParams = {
  buildScript: "cd ./example; npm run build",
  distPath: path.resolve(__dirname, "./example/dist"),
  sizeLimit: 1.5 * 1024 * 1024,
  targetFilesPattern: ["**/*.css", "**/*.js"]
};
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

const generateStats = async ({
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
    throw new Error(
      `ERROR: Project is currently ${prettyBundleSize}, which is ${getPrettierFileSize(
        sizeSurplus
      )} larger than the maximum allowed size (${prettyBundleLimit}).`
    );
  }
  return {
    reportText: `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`
  };
};

(async () => {
  spinner.start(`Checking bundle size`);
  // Todo: this will come from CLI params, instead of using dummyParams
  try {
    const { reportText } = await generateStats(dummyParams);
    spinner.succeed(reportText);
    process.exit(0);
  } catch (e) {
    spinner.fail(e);
    process.exit(1);
  }
})();
