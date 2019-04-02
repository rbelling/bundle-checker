export interface IBundleCheckerReport {
  reportText: string;
}

export interface IBundleCheckerParams {
  // Optional distPath represents the dist folder. If present, all of the targetFiles globs will be prepended with this
  distPath?: string;
  // The build script that will be run as part of the bundle checker.
  buildScript: string;
  // Target number of Bytes of parsed code (non-gzipped)
  sizeLimit: number;
  // An array of files that we want to compare with another branch. This can contain globs too.
  targetFiles: string[];
}
