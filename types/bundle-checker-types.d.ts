export interface IBundleCheckerReport {
  reportText: string;
}

export interface IBundleCheckerParams {
  // Bytes of parsed code (non-gzipped)
  sizeLimit: number;
  distPath: string;
}
