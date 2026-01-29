import { PluginObj } from "@babel/core";
import * as t from "@babel/types";
import { processNode, generateAST } from "@reactless/core/compiler";

export default function reactlessBabelPlugin(): PluginObj {
  return {
    name: "reactless-babel-plugin",
    visitor: {
      Program: {
        enter(path, state: any) {
          state.transformed = false;
          state.isReactless = false;

          // Safely check for @reactless directive in comments
          // In Babel, file-level comments are usually in state.file.ast.comments
          const fileComments: any[] =
            (path.hub as any)?.file?.ast?.comments || [];
          for (const comment of fileComments) {
            if (comment.value.includes("@reactless")) {
              state.isReactless = true;
              break;
            }
          }
        },
        exit(path, state: any) {
          if (state.transformed) {
            // Check if import already exists
            let hasImport = false;
            path.traverse({
              ImportDeclaration(p) {
                if (p.node.source.value === "@reactless/core/runtime") {
                  hasImport = true;
                  p.stop();
                }
              },
            });

            if (!hasImport) {
              path.unshiftContainer(
                "body",
                t.importDeclaration(
                  [
                    t.importSpecifier(
                      t.identifier("ReactlessNode"),
                      t.identifier("ReactlessNode"),
                    ),
                  ],
                  t.stringLiteral("@reactless/core/runtime"),
                ),
              );
            }
          }
        },
      },
      JSXElement(path, state: any) {
        if (!state.isReactless) return;
        if (path.node.extra?.reactlessProcessed) return;

        const visited = new Set<t.Node>();
        const result = processNode(path.node, visited);

        if (result && result.isOptimizable) {
          const replacement = generateAST({
            root: path.node,
            html: result.html,
            dynamicBindings: result.bindings,
            eventBindings: result.events,
          });

          state.transformed = true;
          path.replaceWith(replacement);
          path.skip();
        }
      },
      JSXFragment(path, state: any) {
        if (!state.isReactless) return;
        if (path.node.extra?.reactlessProcessed) return;

        const visited = new Set<t.Node>();
        const result = processNode(path.node, visited);

        if (result && result.isOptimizable) {
          const replacement = generateAST({
            root: path.node as any,
            html: result.html,
            dynamicBindings: result.bindings,
            eventBindings: result.events,
          });

          state.transformed = true;
          path.replaceWith(replacement);
          path.skip();
        }
      },
    },
  };
}
