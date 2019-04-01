import * as getPrettierFileSize from "bytes";
import * as glob from "glob";
import * as path from "path";
import * as getSize from "size-limit";
import * as util from "util";
import {
  IBundleCheckerParams,
  IBundleCheckerReport
} from "./types/bundle-checker-types";

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
          const prettyBundleSize = getPrettierFileSize(size.parsed);
          const prettySizeLimit = getPrettierFileSize(sizeLimit);
          const sizeSurplus = size.parsed - sizeLimit;
          if (sizeSurplus > 0) {
            return reject(
              `ERROR: Project is currently ${prettyBundleSize}, which is ${getPrettierFileSize(
                sizeSurplus
              )} larger than the maximum allowed size.`
            );
          }
          resolve({
            reportText: `SUCCESS: Project size: ${prettyBundleSize}`
          });
        })
        .catch(err => reject(err));
    });
  });

// Todo: this will come from CLI params, instead of using defaultParams
generateStats(defaultParams)
  .then(({ reportText }) => {
    console.log(reportText);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
