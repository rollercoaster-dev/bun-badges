declare module "png-itxt" {
  export function get(buffer: Buffer): Record<string, string>;
  export function set(
    buffer: Buffer,
    chunkData: Record<string, string>,
  ): Buffer;
}
