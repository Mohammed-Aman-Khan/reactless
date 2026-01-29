import type { Plugin } from "vite";
import { transform } from "@reactless/core/compiler";

export interface ReactlessViteOptions {
  include?: string | RegExp | Array<string | RegExp>;
  exclude?: string | RegExp | Array<string | RegExp>;
}

export function reactless(options: ReactlessViteOptions = {}): Plugin {
  return {
    name: "vite-plugin-reactless",
    enforce: "pre",

    transform(code, id) {
      // Only process JSX/TSX files
      if (!/\.(t|j)sx?$/.test(id)) return null;

      // Skip node_modules
      if (id.includes("node_modules")) return null;

      try {
        // Use Oxc-powered transform from core package
        const transformedCode = transform(code);

        // Only return if transformation actually happened
        if (transformedCode === code) return null;

        return {
          code: transformedCode,
          map: null, // TODO: Add source map support
        };
      } catch (error) {
        // If transformation fails, return original code
        console.error(`[reactless] Failed to transform ${id}:`, error);
        return null;
      }
    },
  };
}

// Support both named and default export for maximum compatibility
export default reactless;
