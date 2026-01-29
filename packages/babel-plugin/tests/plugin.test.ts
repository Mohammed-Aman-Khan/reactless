import { describe, it, expect } from "vitest";
import { transformSync } from "@babel/core";
import reactlessBabelPlugin from "../src/index";

describe("reactless-babel-plugin", () => {
  const transform = (code: string) => {
    const result = transformSync(code, {
      plugins: [[reactlessBabelPlugin]],
      parserOpts: {
        plugins: ["jsx", "typescript"],
      },
      filename: "test.tsx",
    });
    return result?.code;
  };

  it("should transform optimizable JSX elements with @reactless directive", () => {
    const code = `
            /* @reactless */
            function App() {
                return <div className="test">Hello World</div>;
            }
        `;
    const result = transform(code);

    expect(result).toContain(
      'import { ReactlessNode } from "@reactless/core/runtime"',
    );
    expect(result).toContain("ReactlessNode({");
    expect(result).toContain('html: "<div class=\\"test\\">Hello World</div>"');
  });

  it("should transform dynamic bindings with @reactless directive", () => {
    const code = `
            /* @reactless */
            function App({ name }) {
                return <div>Hello {name}</div>;
            }
        `;
    const result = transform(code);

    expect(result).toContain("ReactlessNode({");
    expect(result).toContain('html: "<div>Hello <span data-rl=\\"rl-txt-');
    expect(result).toContain('"[data-rl=\\"rl-txt-');
    expect(result).toContain('": name');
  });

  it("should skip transformation without @reactless directive", () => {
    const code = `
            function App() {
                return <div className="test">Hello World</div>;
            }
        `;
    const result = transform(code);

    expect(result).not.toContain("ReactlessNode");
    expect(result).toContain('<div className="test">');
  });

  it("should not transform components (capitalized tags) even with @reactless", () => {
    const code = `
            /* @reactless */
            function App() {
                return <MyComponent />;
            }
        `;
    const result = transform(code);
    expect(result).not.toContain("ReactlessNode");
    expect(result).toContain("<MyComponent />");
  });
});
