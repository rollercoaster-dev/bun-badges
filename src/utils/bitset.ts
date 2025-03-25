/**
 * Custom BitSet implementation compatible with Bun
 * Provides the same functionality as fast-bitset but with better runtime compatibility
 */
export class BitSet {
  private bits: Uint32Array;

  constructor(sizeOrBitString: number | string) {
    if (typeof sizeOrBitString === "number") {
      const size = sizeOrBitString;
      // 32 bits per integer
      this.bits = new Uint32Array(Math.ceil(size / 32));
    } else {
      // Initialize from bit string
      const bitString = sizeOrBitString;
      this.bits = new Uint32Array(Math.ceil(bitString.length / 32));

      for (let i = 0; i < bitString.length; i++) {
        if (bitString[bitString.length - i - 1] === "1") {
          this.set(i);
        }
      }
    }
  }

  set(idx: number): boolean {
    const arrayIndex = Math.floor(idx / 32);
    const bitPosition = idx % 32;

    if (arrayIndex >= this.bits.length) return false;

    this.bits[arrayIndex] |= 1 << bitPosition;
    return true;
  }

  clear(idx: number): boolean {
    const arrayIndex = Math.floor(idx / 32);
    const bitPosition = idx % 32;

    if (arrayIndex >= this.bits.length) return false;

    this.bits[arrayIndex] &= ~(1 << bitPosition);
    return true;
  }

  get(idx: number): boolean {
    const arrayIndex = Math.floor(idx / 32);
    const bitPosition = idx % 32;

    if (arrayIndex >= this.bits.length) return false;

    return (this.bits[arrayIndex] & (1 << bitPosition)) !== 0;
  }

  toString(): string {
    let result = "";

    for (let i = this.bits.length - 1; i >= 0; i--) {
      for (let bit = 31; bit >= 0; bit--) {
        result += (this.bits[i] & (1 << bit)) !== 0 ? "1" : "0";
      }
    }

    return result;
  }
}

// Export as default for drop-in compatibility
export default BitSet;
