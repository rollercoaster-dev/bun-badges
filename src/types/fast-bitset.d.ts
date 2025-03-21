declare module "fast-bitset" {
  class BitSet {
    constructor(size?: number);
    set(position: number): void;
    clear(position: number): void;
    toggle(position: number): void;
    get(position: number): boolean;
    resize(newSize: number): void;
    ones(): number[];
    and(otherBitSet: BitSet): BitSet;
    or(otherBitSet: BitSet): BitSet;
    xor(otherBitSet: BitSet): BitSet;
    flip(): BitSet;
    isEmpty(): boolean;
    getCardinality(): number;
    toString(): string;
    clone(): BitSet;
  }

  export = BitSet;
}
