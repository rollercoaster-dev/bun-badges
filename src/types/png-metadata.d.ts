declare module "png-metadata" {
  interface PngMetadata {
    tEXt?: Record<string, string>;
    iTXt?: Record<string, string>;
    pHYs?: {
      x: number;
      y: number;
      units: number;
    };
    // PNG can have various chunk types, we need to allow for different properties
    // but with more specific types than 'any'
    [key: string]: unknown;
  }

  /**
   * Read metadata from a PNG buffer
   * @param buffer PNG image buffer
   * @returns The metadata object or null if no metadata was found
   */
  export function readMetadata(buffer: Buffer): PngMetadata | null;

  /**
   * Write metadata to a PNG buffer
   * @param buffer PNG image buffer
   * @param metadata Metadata to write
   * @returns New buffer with metadata
   */
  export function writeMetadata(buffer: Buffer, metadata: PngMetadata): Buffer;
}
