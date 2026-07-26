declare module "bun:test" {
  export const describe: (name: string, fn: () => void) => void;
  export const test: (name: string, fn: () => void) => void;
  export const expect: (actual: unknown) => {
    toBe: (expected: unknown) => void;
    toHaveLength: (expected: number) => void;
    toThrow: (expected?: string) => void;
  };
}
