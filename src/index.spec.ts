import * as path from "path";
import { IBundleCheckerParams } from "../types/bundle-checker-types";
import bundleChecker from "./index";

const TEN_MINUTES = 10 * 60 * 1000;
const ONE_MEGABYTE = 1 * 1024 * 1024;

export const dummyParams: IBundleCheckerParams = {
  buildScript: `cd ${path.resolve(__dirname, "../example")}; yarn build`,
  distPath: path.resolve(__dirname, "../example/dist"),
  installScript: `cd ${path.resolve(__dirname, "../example")}; yarn`,
  sizeLimit: ONE_MEGABYTE,
  targetFilesPattern: ["**/*.js"]
};

describe("Bundle Stats tests", () => {
  jest.setTimeout(TEN_MINUTES);

  test(`bundle size of two branches`, async done => {
    const { reportText } = await bundleChecker(dummyParams).compareBranches(
      "feat/add-useless-dependencies-to-example",
      "master"
    );

    console.log(reportText);
    expect(true).toBe(true);
    done();
  });
});
