export interface IBundleCheckerReport {
  reportText: string;
}

export interface IBundleCheckerParams {
  // Optional distPath represents the dist folder. If present, all of the targetFilesPattern globs will be prepended with this
  distPath: string;
  // The build script that will be run as part of the bundle checker.
  buildScript: string;
  // Byte-size limit of parsed code (non-gzipped)
  sizeLimit: number;
  // An array of patterns that is used to target distribution files.
  targetFilesPattern: string[];
}
