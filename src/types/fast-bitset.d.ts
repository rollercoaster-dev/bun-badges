declare module "fast-bitset" {
  class FastBitSet {
    /**
     * Create a new BitSet
     * @param size Initial size of the BitSet (optional) or a string representation
     */
    constructor(nBitsOrKey?: number | string);

    /**
     * Set a bit to true
     * @param index Index of bit to set
     * @returns The BitSet instance
     */
    set(index: number): FastBitSet;

    /**
     * Set a bit to false
     * @param index Index of bit to clear
     * @returns The BitSet instance
     */
    unset(index: number): FastBitSet;

    /**
     * Toggle the value of a bit
     * @param index Index of bit to toggle
     * @returns The BitSet instance
     */
    toggle(index: number): FastBitSet;

    /**
     * Check if a bit is set
     * @param index Index of bit to check
     * @returns True if bit is set, false otherwise
     */
    get(index: number): boolean;

    /**
     * Get the underlying array representation
     * @returns Array representation of the BitSet
     */
    array(): Uint32Array;

    /**
     * Get the number of bits set to true (cardinality)
     * @returns Number of bits set
     */
    getCardinality(): number;

    /**
     * Clear all bits
     * @returns The BitSet instance
     */
    clear(): FastBitSet;

    /**
     * Clone the BitSet
     * @returns A new BitSet with the same bits set
     */
    clone(): FastBitSet;

    /**
     * Get a string representation of the BitSet
     * @returns Binary string representation
     */
    toString(): string;

    /**
     * Perform bitwise AND operation with another BitSet
     * @param other Another BitSet
     * @returns A new BitSet with the result
     */
    and(other: FastBitSet): FastBitSet;

    /**
     * Perform bitwise OR operation with another BitSet
     * @param other Another BitSet
     * @returns A new BitSet with the result
     */
    or(other: FastBitSet): FastBitSet;

    /**
     * Perform bitwise XOR operation with another BitSet
     * @param other Another BitSet
     * @returns A new BitSet with the result
     */
    xor(other: FastBitSet): FastBitSet;

    /**
     * Check if this BitSet is equal to another
     * @param other Another BitSet
     * @returns True if equal, false otherwise
     */
    isEqual(other: FastBitSet): boolean;

    /**
     * Check if this BitSet is a subset of another
     * @param other Another BitSet
     * @returns True if subset, false otherwise
     */
    isSubsetOf(other: FastBitSet): boolean;

    /**
     * Check if the BitSet is empty (no bits set)
     * @returns True if empty, false otherwise
     */
    isEmpty(): boolean;

    /**
     * Get an array of indices of bits that are set
     * @returns Array of indices
     */
    getIndices(): number[];
  }

  export default FastBitSet;
}
