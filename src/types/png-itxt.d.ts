declare module "png-itxt" {
  import { Transform } from "stream";

  interface PngItxtOptions {
    keyword: string;
    value: string;
    language?: string;
    translated?: string;
    compressed?: boolean;
    compression_type?: number;
  }

  interface PngItxtData {
    keyword: string;
    value: string;
    language: string;
    translated: string;
  }

  function set(options: PngItxtOptions): Transform;

  // Two ways to call get:
  // 1. With just keyword (for stream)
  // 2. With keyword and callback
  function get(keyword: string): Transform;
  function get(
    keyword: string,
    callback: (err: Error | null, data: PngItxtData[] | null) => void,
  ): Transform;

  export { set, get, PngItxtOptions, PngItxtData };
}
