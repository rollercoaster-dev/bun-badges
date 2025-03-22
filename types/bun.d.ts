// Type definitions for Bun
// Project: https://bun.sh
// Definitions by: Local development

declare module "bun:test" {
  export function describe(name: string, fn: () => void): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
  export function beforeEach(fn: () => void | Promise<void>): void;
  export function afterEach(fn: () => void | Promise<void>): void;
  export function expect(value: any): {
    toBe(expected: any): void;
    toEqual(expected: any): void;
    toBeDefined(): void;
    toBeUndefined(): void;
    toContain(item: any): void;
    not: {
      toBe(expected: any): void;
      toEqual(expected: any): void;
      toBeDefined(): void;
      toBeUndefined(): void;
      toContain(item: any): void;
    };
    // Add more expect matchers as needed
  };
  export type Mock<T> = T & { mock: { calls: any[][] } };
  export const mock: {
    module: (moduleName: string, factory: () => any) => void;
  };
}

// Define global Bun namespace
declare const Bun: {
  file: (path: string) => {
    existsSync: () => boolean;
    text: () => Promise<string>;
    size: number;
    lastModified: number;
  };
  plugin: (config: { name: string; setup: (build: any) => void }) => void;
};
