import { AnalysisResult } from "./analyzer";
import MagicString from "magic-string";
import generateJs from "@babel/generator";
// No unused imports

export function generate(code: string, analysis: AnalysisResult): string {
  const s = new MagicString(code);

  analysis.staticSubtrees.forEach((subtree, node) => {
    const dataProperties = subtree.dynamicBindings.map((binding) => {
      const expressionCode = (generateJs as any).default
        ? (generateJs as any).default(binding.expression).code
        : (generateJs as any)(binding.expression).code;
      return `${JSON.stringify(binding.selector)}: ${expressionCode}`;
    });

    const eventProperties = subtree.eventBindings.map((binding) => {
      const handlerCode = (generateJs as any).default
        ? (generateJs as any).default(binding.handler).code
        : (generateJs as any)(binding.handler).code;
      return `"${binding.id}": ${handlerCode}`;
    });

    const bindingsJson = JSON.stringify(
      subtree.dynamicBindings.map((b) => ({
        selector: b.selector,
        props: [b.prop],
      })),
    );

    const eventsJson = JSON.stringify(
      subtree.eventBindings.map((e) => ({
        selector: e.selector,
        type: e.type,
        id: e.id,
      })),
    );

    const replacement = `ReactlessNode({
            template: {
                html: ${JSON.stringify(subtree.html)},
                dynamic: {
                    bindings: ${bindingsJson},
                    events: ${eventsJson}
                }
            },
            data: {
                ${dataProperties.join(",\n")}
            },
            events: {
                ${eventProperties.join(",\n")}
            }
        })`;

    // @ts-ignore
    const nodeStart = node.start;
    // @ts-ignore
    const nodeEnd = node.end;

    if (typeof nodeStart === "number" && typeof nodeEnd === "number") {
      s.overwrite(nodeStart, nodeEnd, replacement);
    }
  });

  if (analysis.staticSubtrees.size > 0) {
    if (!code.includes("import { ReactlessNode }")) {
      s.prepend(`import { ReactlessNode } from '@reactless/core/runtime';\n`);
    }
  }

  return s.toString();
}
