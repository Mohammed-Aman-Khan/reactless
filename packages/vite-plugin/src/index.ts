import type { Plugin } from "vite";
import { transformSync } from "@babel/core";
import reactlessBabelPlugin from "@reactless/babel-plugin";

export interface ReactlessViteOptions {
  include?: string | RegExp | Array<string | RegExp>;
  exclude?: string | RegExp | Array<string | RegExp>;
}

export function reactless(options: ReactlessViteOptions = {}): Plugin {
  return {
    name: "vite-plugin-reactless",
    enforce: "pre",

    transform(code, id) {
      if (!/\.(t|j)sx?$/.test(id)) return null;
      if (id.includes("node_modules")) return null;

      const result = transformSync(code, {
        filename: id,
        plugins: [[reactlessBabelPlugin]],
        parserOpts: {
          plugins: ["jsx", "typescript"],
        },
        sourceMaps: true,
      });

      if (!result) return null;

      return {
        code: result.code || code,
        map: result.map,
      };
    },
  };
}

// Support both named and default export for maximum compatibility
export default reactless;
