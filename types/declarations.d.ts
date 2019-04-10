declare module 'size-limit' {
  interface ISizeLimitResponse {
    gzipped: number;
    parsed: number;
  }
  export default function(files: string[] | string, options?: any): Promise<ISizeLimitResponse>;
}
