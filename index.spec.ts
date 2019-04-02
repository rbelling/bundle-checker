import * as path from "path";
import { generateBundleStats } from "./index";
import { IBundleCheckerParams } from "./types/bundle-checker-types";

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_MEGABYTE = 1 * 1024 * 1024;
const HUNDRED_KILOBYTES = ONE_MEGABYTE / 10;

export const dummyParams: IBundleCheckerParams = {
  buildScript: "cd ./example; npm run build",
  distPath: path.resolve(__dirname, "./example/dist"),
  sizeLimit: ONE_MEGABYTE,
  targetFilesPattern: ["**/*.css", "**/*.js"]
};

describe("Bundle Stats tests", () => {
  jest.setTimeout(TEN_MINUTES);

  test("Bundle passes filesize check if sizeLimit is set to 1MB", async done => {
    try {
      await generateBundleStats(dummyParams);
      done();
    } catch (e) {
      done.fail(e);
    }
  });
  test("Bundle fails filesize check if sizeLimit is set to 100kB", async done => {
    try {
      await generateBundleStats({
        ...dummyParams,
        sizeLimit: HUNDRED_KILOBYTES
      });
      done.fail();
    } catch (e) {
      done();
    }
  });
});
