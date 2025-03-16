declare module '@larswander/png-text' {
  /**
   * Writes text entries to a PNG blob
   * @param blob PNG blob to modify
   * @param entries Key-value pairs to write
   * @returns Promise resolving to a new Blob with the embedded text
   */
  export function writeTextToBlob(blob: Blob, entries: Record<string, string>): Promise<Blob>;

  /**
   * Reads text entries from a PNG blob
   * @param blob PNG blob to read from
   * @returns Promise resolving to key-value pairs read from the PNG
   */
  export function readTextFromBlob(blob: Blob): Promise<Record<string, string>>;
} 