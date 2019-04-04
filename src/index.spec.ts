import * as path from "path";
import { IBundleCheckerParams } from "../types/bundle-checker-types";
import { compareTwoBranches, generateBundleStats } from "./index";

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_MEGABYTE = 1 * 1024 * 1024;
const HUNDRED_KILOBYTES = ONE_MEGABYTE / 10;

export const dummyParams: IBundleCheckerParams = {
  buildScript: `cd ${path.resolve(__dirname, "../example")}; yarn build`,
  distPath: path.resolve(__dirname, "../example/dist"),
  installScript: `cd ${path.resolve(__dirname, "../example")}; yarn`,
  sizeLimit: ONE_MEGABYTE,
  targetFilesPattern: ["**/*.css", "**/*.js"]
};

describe("Bundle Stats tests", () => {
  jest.setTimeout(TEN_MINUTES);

  test("Bundle report text contains the word `SUCCESS` if sizeLimit is set to 1MB", async done => {
    try {
      const { reportText } = await generateBundleStats(dummyParams);
      expect(reportText).toContain("SUCCESS");
      done();
    } catch (e) {
      done.fail(e);
    }
  });
  test("Bundle report text contains the word `WARN` if sizeLimit is set to 100kB", async done => {
    try {
      const { reportText } = await generateBundleStats({
        ...dummyParams,
        sizeLimit: HUNDRED_KILOBYTES
      });
      expect(reportText).toContain("WARN");
      done();
    } catch (e) {
      done.fail(e);
    }
  });

  test(`bundle size of two branches`, async done => {
    const { reportText } = await compareTwoBranches(
      "master",
      "feat/git-workflow",
      dummyParams
    );

    console.log(reportText);
    expect(true).toBe(true);
    done();
  });
});
