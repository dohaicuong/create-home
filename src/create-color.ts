import util from "node:util";

type ColorName = Exclude<Parameters<typeof util.styleText>[0], any[]>;
export type ColorFunc = (str: string) => string;

export function createColors() {
  // @ts-ignore
  return new Proxy({} as Record<ColorName, ColorFunc>, {
    // @ts-ignore
    get(_, prop: ColorName) {
      // eslint-disable-next-line n/no-unsupported-features/node-builtins -- our supported nodejs range supports `styleText` but in experimental state, which is fine
      return (str: string) => util.styleText(prop, str);
    },
  });
}
