import * as getPrettierFileSize from "bytes";
import * as globby from "globby";
import ora from "ora";
import * as path from "path";
import * as getSize from "size-limit";
import {
  IBundleCheckerParams,
  IBundleCheckerReport
} from "./types/bundle-checker-types";

const defaultParams: IBundleCheckerParams = {
  distPath: path.resolve(__dirname, "./example/dist"),
  sizeLimit: 1.5 * 1024 * 1024,
  targetBranch: "master"
};

const generateStats = async ({
  distPath,
  sizeLimit
}: IBundleCheckerParams): Promise<IBundleCheckerReport> =>
  new Promise(async (resolve, reject) => {
    try {
      const files = await globby(path.resolve(distPath, "**/*.{js,css}"));
      const size = await getSize(files);
      const sizeSurplus = size.parsed - sizeLimit;
      const prettyBundleSize = getPrettierFileSize(size.parsed);
      const prettyBundleLimit = getPrettierFileSize(sizeLimit);
      if (sizeSurplus > 0) {
        reject(
          `ERROR: Project is currently ${prettyBundleSize}, which is ${getPrettierFileSize(
            sizeSurplus
          )} larger than the maximum allowed size (${prettyBundleLimit}).`
        );
      }
      resolve({
        reportText: `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`
      });
    } catch (err) {
      reject(err);
    }
  });

(async () => {
  const spinner = ora();
  spinner.start(`Checking bundle size`);
  // Todo: this will come from CLI params, instead of using defaultParams
  try {
    const { reportText } = await generateStats(defaultParams);
    spinner.succeed(reportText);
    process.exit(0);
  } catch (e) {
    spinner.fail(e);
    process.exit(1);
  }
})();
