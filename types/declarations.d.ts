declare module 'size-limit' {
  interface ISizeLimitResponse {
    gzipped: number;
    parsed: number;
  }
  export default function(files: string[] | string, options?: any): Promise<ISizeLimitResponse>;
}

// A polyfill for node v8 who doesn't support console.table
declare module 'console.table' {
  export default function(): undefined;
}
