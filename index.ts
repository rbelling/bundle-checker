import * as getPrettierFileSize from "bytes";
import * as glob from "glob";
import ora from "ora";
import * as path from "path";
import * as getSize from "size-limit";
import {
  IBundleCheckerParams,
  IBundleCheckerReport
} from "./types/bundle-checker-types";

const spinner = ora();
const defaultParams: IBundleCheckerParams = {
  distPath: path.resolve(__dirname, "./example/dist"),
  sizeLimit: 1.5 * 1024 * 1024
};

const generateStats = async ({
  distPath,
  sizeLimit
}: IBundleCheckerParams): Promise<IBundleCheckerReport> =>
  new Promise((resolve, reject) => {
    const filesGlob = path.resolve(distPath, "**/*.{js,css}");
    glob(filesGlob, {}, (e, files) => {
      if (e) {
        return reject(e);
      }
      getSize(files)
        .then(size => {
          const sizeSurplus = size.parsed - sizeLimit;
          const prettyBundleSize = getPrettierFileSize(size.parsed);
          const prettyBundleLimit = getPrettierFileSize(sizeLimit);
          if (sizeSurplus > 0) {
            return reject(
              `ERROR: Project is currently ${prettyBundleSize}, which is ${getPrettierFileSize(
                sizeSurplus
              )} larger than the maximum allowed size (${prettyBundleLimit}).`
            );
          }
          resolve({
            reportText: `SUCCESS: Total bundle size of ${prettyBundleSize} is less than the maximum allowed size (${prettyBundleLimit})`
          });
        })
        .catch(err => reject(err));
    });
  });

spinner.start(`Checking bundle size`);
// Todo: this will come from CLI params, instead of using defaultParams
generateStats(defaultParams)
  .then(({ reportText }) => {
    spinner.succeed(reportText);
    process.exit(0);
  })
  .catch(err => {
    spinner.fail(err);
    process.exit(1);
  });
